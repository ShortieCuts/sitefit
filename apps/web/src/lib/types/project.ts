export type ListViewProject = {
	publicId: string;
	name: string;
	description: string;
	homeLat: number;
	homeLong: number;

	createdAt: Date;
	updatedAt: Date;
};

export type MetadataProject = {
	name: string;
	description: string;
	homeLat: number;
	homeLong: number;

	createdAt: Date;
	updatedAt: Date;

	access: {
		items: {
			id: bigint;
			userId: string;
			level: 'READ' | 'WRITE' | 'COMMENT';
		}[];
		blanketAccess: 'READ' | 'WRITE' | 'COMMENT';
		blanketAccessGranted: boolean;
	};
};

export type ProjectTreeNode = {
	type: 'folder' | 'project';
	name: string;
	id: string;
	children: ProjectTreeNode[];

	file?: ListViewProject;
};
