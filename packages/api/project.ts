import { z } from "zod";
import { db } from "db";
import { nanoid } from "nanoid";
import type { User } from "auth";

export const CreateProjectSchema = z.object({
  owner: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(""),
});

export async function createProject(
  project: z.infer<typeof CreateProjectSchema>
): Promise<string | null> {
  let user = await db()
    .selectFrom("User")
    .select("id")
    .where("publicId", "=", project.owner)
    .executeTakeFirst();
  if (!user) return null;

  let publicId = nanoid(32);
  let newP = await db()
    .insertInto("Project")
    .values({
      publicId,
      name: project.name,
      description: project.description ?? "",
      homeLat: 0,
      homeLong: 0,
      blanketAccess: "READ",
      blanketAccessGranted: false,
      updatedAt: new Date(),
      createdAt: new Date(),

      ownerId: user?.id ?? 0,
    })
    .execute();

  if (newP.length > 0 && (newP[0].numInsertedOrUpdatedRows ?? 0) > 0) {
    return publicId;
  }

  return null;
}

export async function copyProject(
  projectPublicId: string,
  newName: string,
  userId: string,
  devMode: boolean
) {
  const WEBSOCKET_URL = devMode
    ? "http://127.0.0.1:8787"
    : "https://engine.cad-mapper.workers.dev";
  let user = await db()
    .selectFrom("User")
    .select("id")
    .where("publicId", "=", userId)
    .executeTakeFirst();
  if (!user) return null;

  let project = await db()
    .selectFrom("Project")
    .selectAll()
    .where("publicId", "=", projectPublicId)
    .executeTakeFirst();

  if (!project) return null;

  let newPublicId = nanoid(32);
  let newP = await db()
    .insertInto("Project")
    .values({
      publicId: newPublicId,
      name: newName,
      description: project.description ?? "",
      homeLat: project.homeLat,
      homeLong: project.homeLong,
      blanketAccess: "READ",
      blanketAccessGranted: false,
      updatedAt: new Date(),
      createdAt: new Date(),

      ownerId: user.id,
    })
    .execute();

  if (newP.length > 0 && (newP[0].numInsertedOrUpdatedRows ?? 0) > 0) {
    // Copy the project file

    let copyRes = await fetch(
      WEBSOCKET_URL + `/copy/${projectPublicId}/${newPublicId}`,
      {
        method: "POST",
        headers: {
          "x-auth": "Fshegstds2$@!@%!Q-fshsges",
        },
      }
    );

    if (copyRes.status !== 200) {
      await db()
        .deleteFrom("Project")
        .where("publicId", "=", newPublicId)
        .execute();

      console.log("Failed to copy project file", copyRes.status, copyRes.body);
      return null;
    }
    return newPublicId;
  }

  return null;
}
