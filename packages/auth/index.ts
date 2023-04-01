import { User } from "./user";

export { User };

import type { User as FirebaseUser } from "firebase/auth";
import { GET_FIREBASE_WEB_API_KEY, GET_PROJECT_ID } from "secrets";
import { db } from "db";

import { Prisma, type User as PrismaUser } from "@prisma/client";

import { genToken } from "./serviceAccount";

import { nanoid } from "nanoid";

import * as jose from "jose";

export { PrismaUser };

export type AuthState = {
  isAnonymous: boolean;
  isLoading: boolean;
  user: User | null;
  firebaseUser: FirebaseUser | null;
};

const parseCookie = (str: string) =>
  str
    .split(";")
    .map((v) => v.split("="))
    .reduce((acc, v) => {
      if (v.length === 2) {
        acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
      }
      return acc;
    }, {} as { [key: string]: string });

function getFirebaseAuthUrl(endpoint: string) {
  return `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${GET_FIREBASE_WEB_API_KEY()}`;
}

export async function createSessionCookie(
  request: Request
): Promise<string | null> {
  let auth = request.headers.get("Authorization");
  if (auth) {
    let bearer = await genToken(
      "https://www.googleapis.com/auth/identitytoolkit"
    );

    let res = (await fetch(
      getFirebaseAuthUrl(`projects/${GET_PROJECT_ID()}:createSessionCookie`),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify({
          idToken: auth.split(" ")[1],
          validDuration: 60 * 60 * 24 * 14, // 14 days
        }),
      }
    ).then((res) => res.json())) as {
      error?: { message: string };
      sessionCookie?: string;
    };

    if (res.error) {
      console.error(res.error);
      return null;
    } else {
      return res.sessionCookie ?? null;
    }
  } else {
    return null;
  }
}

export async function checkRequestAuth(
  requestOrSession: Request | string
): Promise<FirebaseUser | null> {
  let auth: string | null = null;
  if (typeof requestOrSession == "string") {
    auth = requestOrSession;
    console.log("Got from string");
  } else {
    auth = requestOrSession.headers.get("Authorization");
    if (auth) {
      console.log("Got from auth header");
      auth = auth.split(" ")[1];
    } else {
      let cookies = parseCookie(requestOrSession.headers.get("Cookie") ?? "");
      auth = cookies.session ?? null;
      console.log("Got from cookies");
    }
  }

  if (auth) {
    let pkey: { [key: string]: string } = await fetch(
      "https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys"
    ).then((res) => res.json());
    try {
      const protectedHeader = await jose.decodeProtectedHeader(auth);
      console.log("Cookie: ", protectedHeader);

      if (protectedHeader && protectedHeader.kid && protectedHeader.alg) {
        let publicKey = pkey[protectedHeader.kid];
        const { payload } = await jose.compactVerify(
          auth,
          await jose.importX509(publicKey, protectedHeader.alg)
        );
        let decoded = new TextDecoder().decode(payload);
        try {
          let parsed = JSON.parse(decoded);

          if (parsed.exp > Date.now() / 1000) {
            let user = await getUserFromFirebaseId(parsed.user_id);
            console.log("User b", user);
            if (user) {
              return {
                emailVerified: parsed.email_verified,
                uid: parsed.user_id,
                photoURL: user.photoURL,
                isAnonymous:
                  parsed?.firebase?.identities?.sign_in_provider ===
                  "anonymous",
              } as FirebaseUser;
            } else {
              return null;
            }
          } else {
            return null;
          }
        } catch (e: any) {
          console.error(e);
          return null;
        }
      }
    } catch (e: any) {
      console.error(e);
      return null;
    }

    if (auth) {
      try {
        let res = (await fetch(getFirebaseAuthUrl("accounts:lookup"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idToken: auth,
          }),
        }).then((res) => res.json())) as {
          error?: { message: string };
          users?: (FirebaseUser & {
            localId: string;
            photoUrl: string;
          })[];
        };

        if (res.error) {
          console.error(res.error);
          return null;
        } else {
          let user = res.users?.[0] ?? null;
          if (user) {
            return {
              ...user,
              uid: user.localId,
              photoURL: user.photoUrl,
            } as FirebaseUser;
          } else {
            return null;
          }
        }
      } catch (e: any) {
        console.log(e);
        return null;
      }
    } else {
      return null;
    }
  } else {
    return null;
  }
}

export async function getRequestAuthState(
  request: Request
): Promise<AuthState> {
  let auth = await checkRequestAuth(request);

  if (auth) {
    return {
      isAnonymous: auth.isAnonymous,
      isLoading: false,
      user: await getUserFromFirebaseId(auth.uid),
    } as AuthState;
  } else {
    return {
      isAnonymous: false,
      isLoading: false,
      user: null,
    } as AuthState;
  }
}

export async function getRequestUser(
  request: Request
): Promise<PrismaUser | null> {
  let auth = await checkRequestAuth(request);

  if (auth) {
    let user = await getUserFromFirebaseId(auth.uid);
    if (user) {
      return user;
    } else {
      let newUser = await updateUserFromFirebase(auth);
      if (newUser) {
        return newUser;
      } else {
        return null;
      }
    }
  } else {
    return null;
  }
}

export async function getUserFromFirebaseId(
  id: string
): Promise<PrismaUser | null> {
  let data = await db()
    .selectFrom("User")
    .selectAll()
    .where("User.firebaseId", "=", id)
    .executeTakeFirst();

  if (data) {
    return data;
  } else {
    return null;
  }
}
export async function updateUserFromFirebase(
  user: FirebaseUser,
  maxAttempts = 10
): Promise<PrismaUser | null> {
  try {
    let res = await db()
      .updateTable("User")
      .set({
        photoURL: user.photoURL ?? "",
      })
      .where("User.firebaseId", "=", user.uid)
      .executeTakeFirstOrThrow();

    if (res.numUpdatedRows > 0) {
      let data = await getUserFromFirebaseId(user.uid);
      if (data) {
        return data;
      }
    } else {
      return null;
    }
  } catch (e: any) {
    let vals = {
      email: user.email ?? "",
      photoURL: user.photoURL ?? "",
      publicId: nanoid(32),
      firebaseId: user.uid,
      updatedAt: new Date(),
      createdAt: new Date(),
      firstName: "",
      lastName: "",
      lastSeen: new Date(),
    };
    let data = await db()
      .insertInto("User")

      .values([vals])
      .execute();

    if (data && data[0].insertId) {
      return {
        ...vals,
        id: data[0].insertId,
      };
    } else {
      return null;
    }
  }
  return null;
}

export function prismaUserToClientUser(user: PrismaUser): User {
  return {
    id: user.publicId,
    email: "",
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt,
    photoURL: user.photoURL,
  } as User;
}
