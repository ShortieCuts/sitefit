export type EditorLayerNode = {
	icon:
		| 'cad'
		| 'folder'
		| 'object'
		| 'group'
		| 'layer'
		| 'cornerstone'
		| 'circle'
		| 'arc'
		| 'path'
		| 'solid'
		| 'text';
	id: string;
	name: string;
	order: number;
	visible: boolean;
	children: EditorLayerNode[];
};
