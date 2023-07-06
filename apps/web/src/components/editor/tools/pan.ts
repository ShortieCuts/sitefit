import { faHand } from '@fortawesome/free-solid-svg-icons';
import {
	ascendToRoot,
	getObjectAtCursor,
	noParcelFilter,
	selectDown,
	selectMove,
	selectUp
} from './select';
import type { EditorContext, ProjectBroker } from 'src/store/editor';
import { get } from 'svelte/store';
import { Cursors } from '../cursors';
import { ObjectType, Path } from 'core';

let downPosition: [number, number] = [0, 0];
export const PanTool = {
	icon: faHand,
	access: 'READ',
	key: 'pan',
	shortcut: 'p',
	onDown: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		downPosition = [ev.clientX, ev.clientY];

		let cursor = get(editor.currentMousePositionRelative);
		let cursorScreen = get(editor.currentMousePositionScreen);
		let hover = getObjectAtCursor(editor, broker, cursor, cursorScreen, noParcelFilter);

		if (hover) {
			let hoverObj = broker.project.objectsMap.get(hover);
			if (hoverObj) {
				if (hoverObj.pinned) {
					return;
				}
			}
			hover = ascendToRoot(editor, broker, hover);
			if (get(editor.hoveringObject) == hover) {
				if (get(editor.selection).includes(hover)) {
					selectDown(ev, editor, broker);
				}
			}
		} else {
			editor.onIdleMapClick();
			if (get(editor.selectToolCursor) != Cursors.default) {
				selectDown(ev, editor, broker);
			}
		}
	},
	onUp: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		let dx = downPosition[0] - ev.clientX;
		let dy = downPosition[1] - ev.clientY;
		if (Math.sqrt(dx * dx + dy * dy) < 0.01) {
			let cursor = get(editor.currentMousePositionRelative);
			let cursorScreen = get(editor.currentMousePositionScreen);
			let hover = getObjectAtCursor(editor, broker, cursor, cursorScreen, noParcelFilter);
			if (hover) {
				let hoverObj = broker.project.objectsMap.get(hover);
				if (hoverObj) {
					if (hoverObj.pinned) {
						return;
					}
				}

				hover = ascendToRoot(editor, broker, hover);
				editor.selection.set([hover]);
				editor.editingObject.set(null);

				editor.computeEffectiveSelection(broker);
				editor.rootGroup.set(null);

				let hoverObjRoot = broker.project.objectsMap.get(hover);
				if (hoverObjRoot) {
					if (hoverObjRoot.type == ObjectType.Path) {
						let hoverPath = hoverObjRoot as Path;
						if (hoverPath.segments.length == 2) {
							editor.editingObject.set(hover);
						}
					}
				}
			} else {
				editor.selection.set([]);
				editor.computeEffectiveSelection(broker);
				editor.rootGroup.set(null);
			}
		}

		selectUp(ev, editor, broker);
	},
	onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		// Hover object highlight
		// let cursor = get(editor.currentMousePositionRelative);
		// let hover = getObjectAtCursor(editor, broker, cursor);

		// if (hover) {
		// 	hover = ascendToRoot(editor, broker, hover);
		// 	if (get(editor.hoveringObject) !== hover) editor.hoveringObject.set(hover);
		// } else {
		// 	if (get(editor.hoveringObject) !== '') editor.hoveringObject.set('');
		// }

		selectMove(ev, editor, broker);
	}
};
