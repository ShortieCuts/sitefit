import { faArrowPointer } from '@fortawesome/free-solid-svg-icons';
import type { EditorContext, ProjectBroker } from 'src/store/editor';
import { get } from 'svelte/store';
import Flatten from '@flatten-js/core';
const { Polygon, point, Circle: FlatCircle, arc, matrix, Box, Relations } = Flatten;
import type { Object2DShape, ObjectID } from 'core';
import type { ThreeJSOverlayView } from '@googlemaps/three';
import { computeBounds } from '../overlays/Selection';
import { Cursors } from '../cursors';

function distanceTo(obj: Object2DShape, p: Flatten.Point): [number, Flatten.Segment] {
	if (obj instanceof Flatten.Box) {
		let segs = obj.toSegments();
		let minDist = Infinity;
		let minSeg: Flatten.Segment = segs[0];
		for (let seg of segs) {
			let [dist, segs] = p.distanceTo(seg);
			if (dist < minDist) {
				minDist = dist;
				minSeg = segs;
			}
		}

		return [minDist, minSeg];
	} else {
		return p.distanceTo(obj);
	}
}

function startTransform(editor: EditorContext, broker: ProjectBroker) {
	let overlay = get(editor.overlay);
	if (!overlay) return;

	let sels = get(editor.selection);
	let objs = [];
	for (let id of sels) {
		let obj = broker.project.objectsMap.get(id);
		if (obj) objs.push(obj);
	}
	let box = computeBounds(objs);
	editor.transformOrigin.set([box.center.x, box.center.y]);
}

let lastPosition = [0, 0];
let lastRotation = [0, 0];
let lastScale = [0, 0];

export const SelectTool = {
	icon: faArrowPointer,
	key: 'select',
	shortcut: 's',
	onDown: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		editor.selectionStart.set(get(editor.currentMousePosition));
		editor.selectionDown.set(true);

		let cursor = get(editor.currentMousePositionRelative);
		let hover = getObjectAtCursor(broker, cursor);

		let canChangeSelection = true;

		if (hover) {
			let sels = get(editor.selection);

			if (sels.includes(hover)) {
				canChangeSelection = false;
			}

			startTransform(editor, broker);
			editor.translating.set(true);
			editor.selectionDown.set(false);
			lastPosition = get(editor.currentMousePositionRelative);
		}

		if (canChangeSelection) {
			if (!ev.shiftKey) {
				if (hover) {
					editor.selection.set([hover]);
				} else {
					editor.selection.set([]);
				}
			} else {
				if (hover) {
					editor.selection.set([...get(editor.selection), hover]);
				}
			}
		}
	},
	onUp: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		editor.selectionDown.set(false);

		let isTranslating = get(editor.translating);
		let isRotating = get(editor.rotating);
		let isScaling = get(editor.scaling);
		if (isTranslating || isRotating || isScaling) {
			// Apply our transformations
			editor.translating.set(false);
			editor.rotating.set(false);
			editor.scaling.set(false);

			let sels = get(editor.selection);
			for (let id of sels) {
				let obj = broker.project.objectsMap.get(id);
				if (obj) {
					let transaction = broker.project.createTransaction();
					transaction.update(id, 'transform', obj.transform);
					broker.commitTransaction(transaction);
				}
			}
		}
	},
	onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		// Check for object intersection with cursor

		let isTranslating = get(editor.translating);
		let isRotating = get(editor.rotating);
		let isScaling = get(editor.scaling);

		if (isTranslating || isScaling || isScaling) {
			// Transforming
			let currentMousePosition = get(editor.currentMousePositionRelative);

			if (isTranslating) {
				let deltaX = currentMousePosition[0] - lastPosition[0];
				let deltaY = currentMousePosition[1] - lastPosition[1];
				lastPosition = [...currentMousePosition];

				let sels = get(editor.selection);
				for (let id of sels) {
					let obj = broker.project.objectsMap.get(id);
					if (obj) {
						obj.transform.position[0] += deltaX;
						obj.transform.position[1] += deltaY;
						obj.computeShape();
						broker.markObjectDirty(id);
					}
				}

				broker.needsRender.set(true);
			}
		} else {
			// Not transforming
			let cursor = get(editor.currentMousePositionRelative);

			// Corner grabbing cursor
			let sels = get(editor.selection);
			let objs = [];
			for (let id of sels) {
				let obj = broker.project.objectsMap.get(id);
				if (obj) objs.push(obj);
			}
			let box = computeBounds(objs);
			let cursorPoint = point(cursor[0], cursor[1]);

			let setCursor = false;

			let dist = get(editor.screenScale);

			let topLeft = point(box.low.x, box.low.y);
			let topRight = point(box.high.x, box.low.y);
			let bottomLeft = point(box.low.x, box.high.y);
			let bottomRight = point(box.high.x, box.high.y);

			let rotateDistance = dist;
			let topLeftRotate = point(box.low.x - rotateDistance, box.low.y - rotateDistance);
			let topRightRotate = point(box.high.x + rotateDistance, box.low.y - rotateDistance);
			let bottomRightRotate = point(box.high.x + rotateDistance, box.high.y + rotateDistance);
			let bottomLeftRotate = point(box.low.x - rotateDistance, box.high.y + rotateDistance);
			if (
				(Math.abs(box.low.x - cursor[0]) < dist || Math.abs(box.high.x - cursor[0]) < dist) &&
				cursor[1] > box.low.y &&
				cursor[1] < box.high.y
			) {
				editor.selectToolCursor.set(Cursors.ew);
				setCursor = true;
			}

			if (
				(Math.abs(box.low.y - cursor[1]) < dist || Math.abs(box.high.y - cursor[1]) < dist) &&
				cursor[0] > box.low.x &&
				cursor[0] < box.high.x
			) {
				editor.selectToolCursor.set(Cursors.ns);
				setCursor = true;
			}
			if (topLeft.distanceTo(cursorPoint)[0] < dist) {
				editor.selectToolCursor.set(Cursors.nwse);
				setCursor = true;
			}

			if (topRight.distanceTo(cursorPoint)[0] < dist) {
				editor.selectToolCursor.set(Cursors.nesw);
				setCursor = true;
			}

			if (bottomLeft.distanceTo(cursorPoint)[0] < dist) {
				editor.selectToolCursor.set(Cursors.nesw);
				setCursor = true;
			}

			if (bottomRight.distanceTo(cursorPoint)[0] < dist) {
				editor.selectToolCursor.set(Cursors.nwse);
				setCursor = true;
			}

			if (topLeftRotate.distanceTo(cursorPoint)[0] < dist) {
				editor.selectToolCursor.set(Cursors.rtl);
				setCursor = true;
			}

			if (topRightRotate.distanceTo(cursorPoint)[0] < dist) {
				editor.selectToolCursor.set(Cursors.rtr);
				setCursor = true;
			}

			if (bottomLeftRotate.distanceTo(cursorPoint)[0] < dist) {
				editor.selectToolCursor.set(Cursors.rbl);
				setCursor = true;
			}

			if (bottomRightRotate.distanceTo(cursorPoint)[0] < dist) {
				editor.selectToolCursor.set(Cursors.rbr);
				setCursor = true;
			}

			if (!setCursor) {
				editor.selectToolCursor.set(Cursors.default);
			}

			// Hover object highlight
			let hover = getObjectAtCursor(broker, cursor);
			if (hover) {
				if (get(editor.hoveringObject) !== hover) editor.hoveringObject.set(hover);
			} else {
				if (get(editor.hoveringObject) !== '') editor.hoveringObject.set('');
			}

			let overlay = get(editor.overlay);
			if (get(editor.selectionDown)) if (overlay) computeSelectionBox(editor, broker, overlay);
		}
	}
};

function boxToPoly(box: Flatten.Box): Flatten.Polygon {
	let poly = new Polygon(box);
	// poly.addFace(box.toPoints());
	return poly;
}

function computeSelectionBox(
	editor: EditorContext,
	broker: ProjectBroker,
	overlay: ThreeJSOverlayView
): void {
	const start = get(editor.selectionStart);
	const end = get(editor.currentMousePosition);

	let startVec = overlay.latLngAltitudeToVector3({ lat: start[0], lng: start[1] });
	let endVec = overlay.latLngAltitudeToVector3({ lat: end[0], lng: end[1] });

	let box = new Box(
		Math.min(startVec.x, endVec.x),
		Math.min(startVec.z, endVec.z),
		Math.max(startVec.x, endVec.x),
		Math.max(startVec.z, endVec.z)
	);

	let poly = boxToPoly(box);
	let selection = [];
	for (let obj of broker.project.objects) {
		if (!obj.flatShape) continue;
		for (let fl of obj.flatShape) {
			// let relate = Relations.relate(box, fl);
			let inters = poly.intersect(fl);
			let to = poly.contains(fl) || inters.length > 0;
			if (to) {
				selection.push(obj.id);
			}
		}
	}

	editor.selection.set(selection);
}

function computeSelectionCenter(editor: EditorContext, broker: ProjectBroker): [number, number] {}

function getObjectAtCursor(broker: ProjectBroker, cursor: [number, number]): ObjectID | null {
	for (let obj of broker.project.objects) {
		if (!obj.flatShape) continue;
		for (let fl of obj.flatShape) {
			let [dist, seg] = distanceTo(fl, point(cursor[0], cursor[1]));
			if (dist < 1) {
				return obj.id;
			}
		}
	}

	return null;
}
