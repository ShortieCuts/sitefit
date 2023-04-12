export type EditorLayerNode = {
	icon: 'folder' | 'object' | 'group' | 'layer';
	id: string;
	name: string;
	order: number;
	visible: boolean;
	children: EditorLayerNode[];
};
