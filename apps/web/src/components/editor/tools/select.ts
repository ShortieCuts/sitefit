import { faArrowPointer } from '@fortawesome/free-solid-svg-icons';
import type { EditorContext } from 'src/store/editor';
import { get } from 'svelte/store';

export const SelectTool = {
	icon: faArrowPointer,
	key: 'select',
	shortcut: 's',
	onDown: (ev: MouseEvent, editor: EditorContext) => {
		editor.selectionStart.set(get(editor.currentMousePosition));
		editor.selectionDown.set(true);
	},
	onUp: (ev: MouseEvent, editor: EditorContext) => {
		editor.selectionDown.set(false);
	},
	onMove: (ev: MouseEvent, editor: EditorContext) => {}
};
