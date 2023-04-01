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
