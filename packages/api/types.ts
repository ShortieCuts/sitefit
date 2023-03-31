// Keep in sync with prisma\schema.prisma:

import type { User } from "auth";
import { db, Prisma } from "db";

export type Visibility = "PUBLIC" | "PRIVATE" | "UNLISTED";

export type AccessLevel = "READ" | "WRITE" | "COMMENT";
export type AccessStatus = "ACTIVE" | "REVOKED";

export type Project = {
  publicId: string;
  name: string;
  description: string;
  homeLat: number;
  homeLong: number;

  createdAt: Date;
  updatedAt: Date;

  owner: User;

  cadsUsed: Cad;

  comments: Comment[];

  blanketAccess: AccessLevel;
  blanketAccessGranted: boolean;

  grantedAccess: Access[];
};

export type Cad = {
  publicId: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  description: string;
  size: number;
  long: number;
  lat: number;
  filename: String;
  owner: User;
  projects: Project[];
};

export type Comment = {
  id: BigInt;
  isRoot: Boolean;

  parent?: Comment;
  children: Comment[];

  createdAt: Date;
  updatedAt: Date;
  text: String;

  long: number;
  lat: number;

  toLong: number;
  toLat: number;

  author: User;

  project: Project;

  readBy: CommentRead[];
};

export type CommentRead = {
  id: BigInt;
  createdAt: Date;
  updatedAt: Date;

  comment: Comment;

  user: User;
};

export type Access = {
  id: BigInt;
  createdAt: Date;
  updatedAt: Date;

  status: AccessStatus;

  level: AccessLevel;

  user: User;

  project: Project;
};
