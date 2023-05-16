import { faCompass, faCompassDrafting, faPen } from '@fortawesome/free-solid-svg-icons';
import type { EditorContext, ProjectBroker } from 'src/store/editor';
import { get } from 'svelte/store';
import { Material, Path } from 'core';

let isDown = false;
let clickMoving = false;
let downPos: [number, number] = [0, 0];
export const MeasurementTool = {
	icon: faCompassDrafting,
	key: 'measurement',
	access: 'WRITE',
	shortcut: 'm',
	onDown: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		if (!clickMoving) {
			let obj = new Path();
			obj.style = new Material();
			obj.style.color = [80 / 255, 200 / 255, 255 / 255, 1];
			obj.style.filled = false;
			obj.style.type = 'color';
			obj.name = 'Ruler';
			obj.measurement = true;
			obj.closed = false;
			obj.parent = undefined;
			obj.segments.push(editor.getDesiredPosition());
			downPos = [...editor.getDesiredPosition()];

			broker.stagingObject.set(obj);
			isDown = true;
		}
	},
	onUp: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		if (clickMoving) {
			clickMoving = false;
			isDown = false;

			let id = broker.commitStagedObject();
			if (id) editor.select(id);
		} else {
			let dx = downPos[0] - editor.getDesiredPosition()[0];
			let dy = downPos[1] - editor.getDesiredPosition()[1];
			if (Math.sqrt(dx * dx + dy * dy) < 0.01) {
				clickMoving = true;
			} else {
				isDown = false;

				let id = broker.commitStagedObject();
				if (id) editor.select(id);
			}
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
