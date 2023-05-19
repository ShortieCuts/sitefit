import {
  isBatch,
  isCommitTransaction,
  isJoin,
  isLogin,
  isRefresh,
  isWriteGlobalProperty,
  Project,
  SocketMessage,
} from "core";

import {
  SET_GOOGLE_CLOUD_KEY,
  SET_FIREBASE_WEB_API_KEY,
  SET_PROJECT_ID,
  SET_DATABASE_URL,
  SET_DATABASE_HOST,
  SET_DATABASE_USER,
  SET_DATABASE_PASSWORD,
} from "secrets";

import { checkRequestAuth, getUserFromFirebaseId } from "auth";

import { randomNiceColorFromString } from "./color";
import LZString from "lz-string";
import { db } from "db";
import { AccessLevel, AccessStatus } from "db/db/types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleErrors(request: Request, func: () => Promise<Response>) {
  try {
    return await func();
  } catch (err: any) {
    if (request.headers.get("Upgrade") == "websocket") {
      // Annoyingly, if we return an HTTP error in response to a WebSocket request, Chrome devtools
      // won't show us the response body! So... let's send a WebSocket response with an error
      // frame instead.
      let pair = new WebSocketPair();
      pair[1].accept();
      pair[1].send(JSON.stringify({ error: err.stack }));
      pair[1].close(1011, "Uncaught exception during session setup");
      return new Response(null, { status: 101, webSocket: pair[0] });
    } else {
      return new Response(err.stack, { status: 500 });
    }
  }
}

class Session {
  uid: string;
  userId: string | null;
  socket: WebSocket;
  quit: boolean = false;
  color: string = "#000000";
  accessLevel: AccessLevel | null = null;

  engine: EngineInstance;

  constructor(engine: EngineInstance, socket: WebSocket, uid: string) {
    this.socket = socket;
    this.uid = uid;
    this.userId = null;
    this.engine = engine;
  }

  checkAccess(level: AccessLevel): boolean {
    if (level == "READ") return true;
    if (level == "COMMENT")
      return this.accessLevel == "COMMENT" || this.accessLevel == "WRITE";
    if (level == "WRITE") return this.accessLevel == "WRITE";
    return false;
  }

  async handleLogin(msg: SocketMessage): Promise<boolean> {
    if (isLogin(msg)) {
      if (msg.session) {
        if (msg.session.startsWith("!")) {
          let access = await db()
            .selectFrom("Access")
            .selectAll()
            .where("token", "=", msg.session.slice(1))
            .where("projectId", "=", this.engine.realIdInt)
            .executeTakeFirst();

          if (access) {
            this.userId = "email:" + access.email;
            return true;
          }
        } else {
          let res = await checkRequestAuth(msg.session);
          if (res) {
            let user = await getUserFromFirebaseId(res.uid);
            if (user) {
              this.userId = user.publicId;
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        }
      } else {
        this.userId = "anon";
        return true;
      }
    }

    return false;
  }

  setAccessLevel(level: AccessLevel) {
    this.accessLevel = level;
    this.send(SocketMessage.setAccessLevel(level));
  }

  kill() {
    this.quit = true;
    this.socket.close();
  }

  send(msg: SocketMessage) {
    if (this.socket.readyState == WebSocket.READY_STATE_OPEN) {
      this.socket.send(LZString.compressToUint8Array(JSON.stringify(msg)));
    } else {
      console.log("Socket not ready", this.socket.readyState);
    }
  }
}

export class EngineInstance {
  state: DurableObjectState;
  uidCounter: number = 0;
  project: Project | null;

  dirty: boolean = false;
  key: string;
  env: Env;
  saveTimer: number | null = null;
  saveNonce: number = 0;

  realId: string | null = null;
  realIdInt: bigint | null = null;

  broken: boolean = false;

  sessions: Session[] = [];

  accessState: {
    ownerId: string;
    blanketAccessGranted: boolean;
    blanketAccess: "READ" | "WRITE" | "COMMENT";
    access: {
      level: "READ" | "WRITE" | "COMMENT";
      id: bigint;
      createdAt: Date;
      token: string;
      email: string;
      userId: string;
    }[];
  } | null = null;

  private queuedMessages: SocketMessage[] = [];
  private messageQueueTimeout: number | null = null;

  constructor(state: DurableObjectState, env: Env) {
    SET_GOOGLE_CLOUD_KEY(env.GOOGLE_CLOUD_KEY);
    SET_FIREBASE_WEB_API_KEY(env.FIREBASE_WEB_API_KEY);
    SET_PROJECT_ID(env.PROJECT_ID);
    SET_DATABASE_URL(env.DATABASE_URL);
    SET_DATABASE_HOST(env.DATABASE_HOST);
    SET_DATABASE_USER(env.DATABASE_USER);
    SET_DATABASE_PASSWORD(env.DATABASE_PASSWORD);

    this.env = env;
    this.state = state;
    this.project = null;

    this.key = state.id.toString();

    state.blockConcurrencyWhile(async () => {
      let vals = await env.PROJECTS.get(this.key);
      if (vals) {
        let rawJson = await vals.text();
        let parsedVal = {};
        try {
          parsedVal = JSON.parse(rawJson);
        } catch (e) {
          this.broken = true;
          console.log("Error parsing project: ", e);
        }
        try {
          this.project = new Project(this.key);
          this.project.deserialize(parsedVal);
        } catch (e) {
          console.log("Error deserializing project: ", e, e.stack);
          this.broken = true;
        }
      } else {
        this.project = new Project(this.key);
      }
    });
  }

  async refreshAccess() {
    if (!this.realId) return;

    let project = await db()
      .selectFrom("Project")
      .selectAll()
      .where("publicId", "=", this.realId)
      .executeTakeFirst();

    if (!project) {
      throw new Error("Project not found");
    }

    this.realIdInt = project.id;

    let ownerUser = await db()
      .selectFrom("User")
      .selectAll()
      .where("id", "=", project.ownerId)
      .executeTakeFirst();

    if (!ownerUser) {
      throw new Error("Owner not found");
    }

    let grantedAccess = await db()
      .selectFrom("Access")
      .where("projectId", "=", project.id)
      .where("userId", "!=", 0n)
      .innerJoin("User", "Access.userId", "User.id")
      .select([
        "Access.level",
        "Access.id",
        "Access.createdAt",
        "User.publicId",
        "User.firstName",
        "User.lastName",
        "User.photoURL",
        "User.email",
        "Access.token",
      ])
      .execute();

    let grantedAccessEmail = await db()
      .selectFrom("Access")
      .where("projectId", "=", project.id)
      .where("userId", "=", 0n)
      .select([
        "Access.level",
        "Access.id",
        "Access.createdAt",
        "Access.email",
        "Access.token",
      ])
      .execute();

    this.accessState = {
      ownerId: ownerUser.publicId,
      blanketAccessGranted: project.blanketAccessGranted,
      blanketAccess: project.blanketAccess,
      access: [
        ...grantedAccess.map((access) => ({
          level: access.level,
          id: access.id,
          createdAt: access.createdAt,
          token: access.token,
          email: access.email,
          userId: access.publicId,
        })),
        ...grantedAccessEmail.map((access) => ({
          level: access.level,
          id: access.id,
          createdAt: access.createdAt,
          token: access.token,
          email: access.email,
          userId: "email:" + access.email,
        })),
      ],
    };

    for (let session of this.sessions) {
      this.checkSessionAccess(session);
    }
  }

  checkSessionAccess(session: Session) {
    if (!this.accessState) return;

    if (session.userId == this.accessState.ownerId) {
      session.setAccessLevel("WRITE");
      return;
    }

    for (let access of this.accessState.access) {
      if (session.userId?.startsWith("email:")) {
        console.log("sess", session.userId, access.email);
        if (access.email == session.userId.replace("email:", "")) {
          session.setAccessLevel(access.level);
          return;
        }
      } else {
        if (access.userId == session.userId) {
          session.setAccessLevel(access.level);
          return;
        }
      }
    }

    if (!this.accessState.blanketAccessGranted) {
      session.kill();
    }

    session.setAccessLevel(this.accessState.blanketAccess);
  }

  async enqueueSave() {
    let nonce = ++this.saveNonce;
    await sleep(1000);
    if (nonce !== this.saveNonce) {
      return;
    }

    await this.save();
  }

  async save() {
    console.log("Auto saving...");
    if (this.dirty && !this.broken && this.project) {
      let data = JSON.stringify(this.project.serialize());

      console.log("Saving");
      let resp = await this.env.PROJECTS.put(this.key, data);

      console.log("Auto saved.");
      this.dirty = false;
    }
  }

  // Handle HTTP requests from clients.
  async fetch(request: Request, env: Env) {
    console.log("Got request in durable object", request.url);

    return await handleErrors(request, async () => {
      let url = new URL(request.url);
      console.log("Inside durable object", url);

      switch (url.pathname.split("/")[2]) {
        case "setId": {
          let body = (await request.json()) as any;
          this.realId = body?.id ?? "";

          return new Response(null, { status: 200 });
        }
        case "websocket": {
          if (request.headers.get("Upgrade") != "websocket") {
            return new Response("expected websocket", { status: 400 });
          }

          this.realId = url.pathname.split("/")[1];

          let ip = request.headers.get("CF-Connecting-IP");

          let pair = new WebSocketPair();
          console.log("New pair", pair);

          if (!this.accessState) {
            console.log("before access", this.accessState);
            await this.refreshAccess();
            console.log("after access", this.accessState);
          } else {
            console.log("has access", this.accessState);
          }

          await this.handleSession(pair[1], ip);

          return new Response(null, { status: 101, webSocket: pair[0] });
        }

        default:
          return new Response("Not found", { status: 404 });
      }
    });
  }

  async syncAll(session: Session) {
    session.send(
      SocketMessage.sync({
        broken: this.broken,
        selfUid: session.uid,
        project: this.project?.serialize() ?? {},
        sessions: this.sessions
          .filter((s) => !s.quit && s.userId)
          .map((s) => ({
            color: s.color,
            userId: s.userId ?? "impossible",
            uid: s.uid,
          })),
      })
    );
  }

  async handleSession(webSocket: WebSocket, ip: string | null) {
    webSocket.accept();

    let session = new Session(this, webSocket, "s" + this.uidCounter++);
    this.sessions.push(session);

    // Set event handlers to receive messages.
    let loggedIn = false;
    webSocket.addEventListener("message", async (msg: MessageEvent) => {
      if (session.quit) {
        webSocket.close(1011, "WebSocket broken.");
        return;
      }

      let data: SocketMessage | null = null;
      try {
        let raw = LZString.decompressFromUint8Array(
          new Uint8Array(msg.data as ArrayBuffer)
        );
        data = JSON.parse(raw);
      } catch (e) {
        console.log("Error parsing message: ", e);
      }

      try {
        if (data) {
          if (isLogin(data)) {
            if (await session.handleLogin(data)) {
              this.checkSessionAccess(session);
              loggedIn = true;
              session.color = randomNiceColorFromString(
                `${session.userId}.${session.uid}`
              );
              this.syncAll(session);
              this.broadcast(
                SocketMessage.join(
                  session.uid,
                  session.userId ?? "",
                  session.color
                )
              );
            } else {
              session.kill();
            }
          } else if (isBatch(data)) {
            for (let msg of data.messages) {
              await this.handleMessage(session, msg);
            }
          } else {
            await this.handleMessage(session, data);
          }
        }
      } catch (err: any) {
        if (webSocket.readyState == WebSocket.READY_STATE_OPEN) {
          webSocket.send(JSON.stringify({ error: err.stack }));
        }
      }
    });

    let closeOrErrorHandler = (evt: CloseEvent | ErrorEvent) => {
      session.quit = true;
      this.sessions = this.sessions.filter((member) => member !== session);
      this.broadcast(SocketMessage.leave(session.uid));
    };
    webSocket.addEventListener("close", closeOrErrorHandler);
    webSocket.addEventListener("error", closeOrErrorHandler);
  }

  async handleMessage(session: Session, data: SocketMessage): Promise<void> {
    if (this.project === null) {
      return;
    }

    if (isWriteGlobalProperty(data)) {
      if (session.checkAccess("WRITE")) {
        const clampedNumbers = ["cadOpacity", "boundaryOpacity"];
        if (data.key == "mapStyle") {
          if (["google-satellite", "google-simple"].includes(data.value)) {
            this.project.globalProperties.mapStyle = data.value;
            this.enqueueBroadcast(data);
            this.dirty = true;
            this.enqueueSave();
          }
        } else if (data.key == "overrideCadColor") {
          this.project.globalProperties.overrideCadColor = data.value;
          this.enqueueBroadcast(data);
          this.dirty = true;
          this.enqueueSave();
        } else if (clampedNumbers.includes(data.key)) {
          this.project.globalProperties[data.key] = Math.max(
            0,
            Math.min(1, data.value)
          );
          this.enqueueBroadcast(data);
          this.dirty = true;
          this.enqueueSave();
        }
      }
    } else if (isCommitTransaction(data)) {
      if (session.checkAccess("WRITE")) {
        if (this.project) {
          let appliedMutations = this.project.applyTransaction(
            data.transaction,
            false
          );
          let newTransaction = this.project.createTransaction();

          for (let mutation of appliedMutations) {
            newTransaction.mutations.push(mutation);
          }
          this.enqueueBroadcast(
            SocketMessage.commitTransaction(newTransaction)
          );
          this.dirty = true;
          this.enqueueSave();
        }
      }
    } else if (isRefresh(data)) {
      if (data.subject == "access") {
        if (session.checkAccess("WRITE")) {
          if (this.project) {
            this.refreshAccess();
            this.broadcast(SocketMessage.refresh("access"));
          }
        }
      } else if (data.subject == "comments" || data.subject == "replies") {
        if (session.checkAccess("COMMENT")) {
          this.broadcast(data);
        }
      }
    }
  }

  enqueueBroadcast(message: SocketMessage) {
    this.queuedMessages.push(message);

    if (this.messageQueueTimeout) {
      clearTimeout(this.messageQueueTimeout);
    }

    this.messageQueueTimeout = setTimeout(() => {
      if (this.queuedMessages.length == 1) {
        this.broadcast(this.queuedMessages[0]);
        this.queuedMessages = [];
      } else if (this.queuedMessages.length > 1) {
        this.broadcast(SocketMessage.batch(this.queuedMessages));
        this.queuedMessages = [];
      }
    }, 1);
  }

  broadcast(message: SocketMessage) {
    let json = LZString.compressToUint8Array(JSON.stringify(message));

    let dead: Session[] = [];
    this.sessions = this.sessions.filter((session) => {
      if (session.userId) {
        try {
          if (session.socket.readyState == WebSocket.READY_STATE_OPEN) {
            session.socket.send(json);
          }
          return true;
        } catch (err) {
          session.quit = true;
          dead.push(session);
          return false;
        }
      } else {
        return true;
      }
    });

    dead.forEach((sess) => {
      this.broadcast(SocketMessage.leave(sess.uid));
    });
  }
}
