import { faCompass, faCompassDrafting, faPen } from '@fortawesome/free-solid-svg-icons';
import type { EditorContext, ProjectBroker } from 'src/store/editor';

import { Material, Path } from 'core';
import { get } from 'svelte/store';

let isDown = false;
let downPos: [number, number] = [0, 0];
let active = false;

function makeShapeObject(
	start: [number, number],
	end: [number, number],
	type: 'triangle' | 'rectangle' | 'circle'
) {
	let smartPath = new Path();
	smartPath.name = 'Shape';
	smartPath.style = new Material();
	smartPath.style.color = [0 / 255, 200 / 255, 255 / 255, 1];
	smartPath.style.filled = false;
	smartPath.closed = true;
	smartPath.smartObject = 'path';

	if (type == 'rectangle') {
		smartPath.segments.push(start);
		smartPath.segments.push([end[0], start[1]]);
		smartPath.segments.push(end);
		smartPath.segments.push([start[0], end[1]]);
	} else if (type == 'triangle') {
		smartPath.segments.push(start);
		smartPath.segments.push(end);
		smartPath.segments.push([start[0], end[1]]);
	} else if (type == 'circle') {
		let radius = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
		let center = [...start];
		let segments = 64;
		for (let i = 0; i <= segments; i++) {
			let angle = (i / segments) * Math.PI * 2;
			smartPath.segments.push([
				center[0] + Math.cos(angle) * radius,
				center[1] + Math.sin(angle) * radius
			]);
		}
	}

	return smartPath;
}

export const ShapeTool = {
	icon: faCompassDrafting,
	key: 'shape',
	access: 'WRITE',
	shortcut: '',
	hidden: true,
	onDown(ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) {
		downPos = [...editor.getDesiredPosition()];
		isDown = true;
		active = true;
	},
	cancel(editor: EditorContext, broker: ProjectBroker) {
		if (active) {
			isDown = false;
			broker.stagingObject.set(null);
			active = false;
		}
	},
	commit(editor: EditorContext, broker: ProjectBroker) {
		if (active) {
			let id = broker.commitStagedObject();
			if (id) editor.select(id);
			broker.stagingObject.set(null);
			isDown = false;
			active = false;
		}
	},
	onUp(ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) {
		let dx = downPos[0] - editor.getDesiredPosition()[0];
		let dy = downPos[1] - editor.getDesiredPosition()[1];

		if (Math.sqrt(dx * dx + dy * dy) < 0.1) {
			let newObj = makeShapeObject(
				downPos,
				[downPos[0] + 10, downPos[1] + 10],
				get(editor.activeToolSmartObject) as any
			);
			broker.stagingObject.set(newObj);
		}

		editor.activeTool.set('pan');

		this.commit(editor, broker);
	},
	onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		if (isDown && active) {
			let pos = editor.getDesiredPosition();
			if (ev.shiftKey) {
				let dx = pos[0] - downPos[0];
				let dy = pos[1] - downPos[1];
				let angle = Math.atan2(dy, dx);
				let length = Math.sqrt(dx * dx + dy * dy);
				let snap = Math.PI / 8;
				angle = Math.round(angle / snap) * snap;
				pos = [downPos[0] + Math.cos(angle) * length, downPos[1] + Math.sin(angle) * length];
			}
			let newObj = makeShapeObject(downPos, pos, get(editor.activeToolSmartObject) as any);
			broker.stagingObject.set(newObj);
		}
	}
};
