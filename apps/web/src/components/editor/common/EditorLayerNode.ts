export type EditorLayerNode = {
	icon: 'folder' | 'object' | 'group' | 'layer';
	id: string;
	name: string;
	visible: boolean;
	children: EditorLayerNode[];
};
