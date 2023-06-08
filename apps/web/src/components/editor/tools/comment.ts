import { faComment } from '@fortawesome/free-solid-svg-icons';
import type { EditorContext, ProjectBroker } from 'src/store/editor';
import { isMobile } from 'src/store/responsive';
import { get } from 'svelte/store';

export const CommentTool = {
	icon: faComment,
	key: 'comment',
	shortcut: 'c',
	access: 'COMMENT',
	hidden: true,
	onDown: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		if (get(isMobile)) return;
		let latLon = get(editor.currentMousePosition);

		editor.stagingComment.set({
			longitude: latLon[1],
			latitude: latLon[0],
			text: ''
		});

		setTimeout(() => {
			let input = document.querySelector('#comment-input') as HTMLInputElement;
			input.focus();
		}, 100);
	},
	onUp: (ev: MouseEvent) => {},
	onMove: (ev: MouseEvent) => {}
};
