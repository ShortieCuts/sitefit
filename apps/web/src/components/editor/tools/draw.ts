import { faPen, faPencil } from '@fortawesome/free-solid-svg-icons';
import type { EditorContext, ProjectBroker } from 'src/store/editor';
import { get } from 'svelte/store';
import { Material, Path } from 'core';
import { getStrokePoints } from './freehand.mjs';
import { hexColorToArray } from '$lib/util/color.js';

let isDown = false;
let downPos: [number, number] = [0, 0];
let realPoints: [number, number][] = [];
export const DrawTool = {
	icon: faPencil,
	key: 'draw',
	access: 'WRITE',
	shortcut: 'v',
	hidden: true,
	onDown: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		realPoints = [];
		let obj = new Path();
		obj.style = new Material();
		obj.style.color = hexColorToArray(get(editor.toolPrimaryColor));
		obj.style.filled = false;
		obj.style.type = 'color';
		obj.name = 'Drawing';
		obj.closed = false;
		obj.parent = undefined;
		obj.segments.push(editor.getDesiredPosition());
		downPos = [...editor.getDesiredPosition()];

		broker.stagingObject.set(obj);
		isDown = true;
	},
	onUp: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		let id = broker.commitStagedObject();

		isDown = false;
	},
	onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		if (isDown) {
			broker.stagingObject.update((obj) => {
				if (obj) {
					let path = obj as Path;
					let targetPos = editor.getDesiredPosition();

					const factor = 100 * get(editor.screenScale);

					realPoints.push([targetPos[0] * factor, targetPos[1] * factor]);
					path.segments = getStrokePoints(realPoints, {
						size: 1,
						thinning: 0.7,
						smoothing: 0.01,
						streamline: 0.72,
						simulatePressure: true,
						easing: (t: number) => t * t * t
					}).map((p) => [p.point[0] / factor, p.point[1] / factor]);

					// Merge points that are too close
					let thresh = 0.01;
					while (path.segments.length > 200) {
						for (let i = path.segments.length - 1; i >= 0; i--) {
							if (i + 1 >= path.segments.length) continue;
							let p1 = path.segments[i];
							let p2 = path.segments[i + 1];
							let dist = Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));

							if (dist < thresh) {
								path.segments.splice(i, 1);
							}
						}
						thresh *= 2;
					}

					console.log(path.segments.length);

					return obj;
				} else {
					return null;
				}
			});
		}
	}
};
