export type ProjectComment = {
	id: number;
	authorId: string;
	createdAt: Date;
	updatedAt: Date;
	text: string;
	long: number;
	lat: number;
	toLong: number;
	toLat: number;
	isRoot: boolean;
	read: boolean;
	anonymousName: string;
	anonymousEmail: string;
};
export type ProjectCommentReply = {
	id: number;
	authorId: string;
	createdAt: Date;
	updatedAt: Date;
	text: string;
	anonymousName: string;
	anonymousEmail: string;
};
