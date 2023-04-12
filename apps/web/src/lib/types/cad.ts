export type CadTreeNode = {
	type: 'folder' | 'cad';
	name: string;
	id: string;
	children: CadTreeNode[];

	file?: CadFile;
};

export type CadFile = {
	name: string;
	description: string;
	lat: number;
	long: number;
	filename: string;

	createdAt: Date;
	updatedAt: Date;
};
