import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const db = prisma;

export { Prisma };
