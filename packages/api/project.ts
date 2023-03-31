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
  let p = await db.project.create({
    data: {
      publicId: nanoid(32),
      name: project.name,
      description: project.description ?? "",
      homeLat: 0,
      homeLong: 0,
      blanketAccess: "READ",
      blanketAccessGranted: false,
      owner: {
        connect: {
          publicId: project.owner,
        },
      },
    },
  });
  if (p) {
    return p.publicId;
  }

  return null;
}
