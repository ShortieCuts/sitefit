import { faCompass, faCompassDrafting, faPen } from '@fortawesome/free-solid-svg-icons';
import type { EditorContext, ProjectBroker } from 'src/store/editor';
import { get } from 'svelte/store';
import { Material, Path } from 'core';

let isDown = false;
let clickMoving = false;
let downPos: [number, number] = [0, 0];
let active = false;
let committed = false;
export const AreaTool = {
	icon: faCompassDrafting,
	key: 'area',
	access: 'WRITE',
	shortcut: 'n',
	hidden: true,
	onDown: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		committed = false;
		active = true;
		if (!clickMoving) {
			let obj = new Path();
			obj.order = broker.getHighestOrder();
			obj.style = new Material();
			obj.style.color = [80 / 255, 200 / 255, 255 / 255, 1];
			obj.style.filled = false;
			obj.style.type = 'color';
			obj.name = 'Area';
			obj.measurement = true;
			obj.style.filled = true;
			obj.closed = false;
			obj.parent = undefined;
			obj.closed = true;
			obj.segments.push(editor.getDesiredPosition());
			downPos = [...editor.getDesiredPosition()];

			broker.stagingObject.set(obj);
			isDown = true;
			editor.measureToolCount.set(1);
		} else {
			broker.stagingObject.update((obj) => {
				if (obj) {
					let path = obj as Path;
					path.segments.push(editor.getDesiredPosition());
					editor.measureToolCount.set(path.segments.length);
				}
				return obj;
			});
		}
	},
	cancel(editor: EditorContext, broker: ProjectBroker) {
		editor.measureToolCount.set(0);
		if (active) {
			clickMoving = false;
			active = false;
			isDown = false;
			broker.stagingObject.set(null);
		}
	},
	commit(editor: EditorContext, broker: ProjectBroker) {
		let isEmpty = false;
		editor.measureToolCount.set(0);
		if (clickMoving) {
			broker.stagingObject.update((obj) => {
				if (obj) {
					let path = obj as Path;
					path.segments.pop();
					if (path.segments.length <= 1) isEmpty = true;
				}
				return obj;
			});

			active = false;
			clickMoving = false;
			isDown = false;
			if (!isEmpty) {
				let id = broker.commitStagedObject();
				if (id) editor.select(id);
			}
		}

		broker.stagingObject.set(null);

		committed = true;
	},
	onUp: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		if (clickMoving) {
		} else if (!committed) {
			let dx = downPos[0] - editor.getDesiredPosition()[0];
			let dy = downPos[1] - editor.getDesiredPosition()[1];

			clickMoving = true;
		}
	},
	onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		if (isDown || clickMoving) {
			broker.stagingObject.update((obj) => {
				if (obj) {
					let path = obj as Path;
					let targetPos = editor.getDesiredPosition();
					let deltaX = targetPos[0] - downPos[0];
					let deltaY = targetPos[1] - downPos[1];
					if (ev.shiftKey) {
						let angle = Math.atan2(deltaY, deltaX);
						let length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
						let snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
						targetPos = [
							downPos[0] + Math.cos(snapAngle) * length,
							downPos[1] + Math.sin(snapAngle) * length
						];
					}
					if (path.segments.length <= 1) path.segments.push(targetPos);
					path.segments[path.segments.length - 1] = targetPos;
					return obj;
				} else {
					return null;
				}
			});
		}
	}
};
