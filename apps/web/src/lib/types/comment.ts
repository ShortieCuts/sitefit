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
};
export type ProjectCommentReply = {
	id: number;
	authorId: string;
	createdAt: Date;
	updatedAt: Date;
	text: string;
};
