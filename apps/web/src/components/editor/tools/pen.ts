import { faPen } from '@fortawesome/free-solid-svg-icons';
import type { EditorContext, ProjectBroker } from 'src/store/editor';
import { get } from 'svelte/store';
import { Path } from 'core';

let isDown = false;
export const PenTool = {
	icon: faPen,
	key: 'pen',
	shortcut: 'v',
	onDown: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		let obj = new Path();
		obj.name = 'Line';
		obj.segments.push(editor.getDesiredPosition());
		broker.stagingObject.set(obj);
		isDown = true;
	},
	onUp: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		isDown = false;

		broker.commitStagedObject();
	},
	onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		if (isDown) {
			broker.stagingObject.update((obj) => {
				if (obj) {
					let path = obj as Path;
					if (path.segments.length <= 1) path.segments.push(editor.getDesiredPosition());
					path.segments[path.segments.length - 1] = editor.getDesiredPosition();
					return obj;
				} else {
					return null;
				}
			});
		}
	}
};
