import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;
export type Visibility = "PUBLIC" | "PRIVATE" | "UNLISTED";
export type AccessLevel = "READ" | "COMMENT" | "WRITE";
export type AccessStatus = "ACTIVE" | "REVOKED";
export type Access = {
    id: Generated<bigint>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    status: AccessStatus;
    level: AccessLevel;
    userId: bigint;
    projectId: bigint;
};
export type Cad = {
    id: Generated<bigint>;
    publicId: string;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    name: string;
    description: string;
    size: number;
    long: number;
    lat: number;
    filename: string;
    ownerId: bigint;
    parentId: bigint | null;
};
export type CadFolder = {
    id: Generated<bigint>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    name: string;
    ownerId: bigint;
    parentId: bigint | null;
};
export type Comment = {
    id: Generated<bigint>;
    isRoot: Generated<boolean>;
    parentId: bigint | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    text: string;
    long: number;
    lat: number;
    toLong: number;
    toLat: number;
    authorId: bigint;
    projectId: bigint;
};
export type CommentRead = {
    id: Generated<bigint>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    commentId: bigint;
    userId: bigint;
};
export type Project = {
    id: Generated<bigint>;
    publicId: string;
    name: string;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    description: string;
    homeLong: number;
    homeLat: number;
    ownerId: bigint;
    blanketAccess: AccessLevel;
    blanketAccessGranted: Generated<boolean>;
    parentId: bigint | null;
};
export type ProjectFolder = {
    id: Generated<bigint>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    name: string;
    ownerId: bigint;
    parentId: bigint | null;
};
export type User = {
    id: Generated<bigint>;
    publicId: string;
    firebaseId: string;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    lastSeen: Timestamp | null;
    email: string;
    firstName: string | null;
    lastName: string | null;
    photoURL: string;
};
export type DB = {
    Access: Access;
    Cad: Cad;
    CadFolder: CadFolder;
    Comment: Comment;
    CommentRead: CommentRead;
    Project: Project;
    ProjectFolder: ProjectFolder;
    User: User;
};
