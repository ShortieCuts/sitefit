export type PublicUserInfo = {
	id: string;
	firstName: string;
	lastName: string;
	photoURL: string;
};

export type UserAccessInfo = {
	id: bigint;
	userId: string;
	firstName: string;
	lastName: string;
	photoURL: string;
	email: string;
	access: 'READ' | 'WRITE' | 'COMMENT' | 'OWNER';
	createdAt: Date;
};
