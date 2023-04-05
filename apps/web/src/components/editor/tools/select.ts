import { faArrowPointer } from '@fortawesome/free-solid-svg-icons';
import type { EditorContext, ProjectBroker } from 'src/store/editor';
import { get } from 'svelte/store';
import Flatten from '@flatten-js/core';
const { Polygon, point, Circle: FlatCircle, arc, matrix, Box, Relations } = Flatten;
import type { Object2DShape, ObjectID } from 'core';
import type { ThreeJSOverlayView } from '@googlemaps/three';

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

export const SelectTool = {
	icon: faArrowPointer,
	key: 'select',
	shortcut: 's',
	onDown: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		editor.selectionStart.set(get(editor.currentMousePosition));
		editor.selectionDown.set(true);

		let cursor = get(editor.currentMousePositionRelative);
		let hover = getObjectAtCursor(broker, cursor);
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
	},
	onUp: (ev: MouseEvent, editor: EditorContext) => {
		editor.selectionDown.set(false);
	},
	onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		// Check for object intersection with cursor
		let cursor = get(editor.currentMousePositionRelative);
		let hover = getObjectAtCursor(broker, cursor);
		if (hover) {
			if (get(editor.hoveringObject) !== hover) editor.hoveringObject.set(hover);
		} else {
			if (get(editor.hoveringObject) !== '') editor.hoveringObject.set('');
		}

		let overlay = get(editor.overlay);
		if (get(editor.selectionDown)) if (overlay) computeSelectionBox(editor, broker, overlay);
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
	console.log(selection);

	editor.selection.set(selection);
}

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
