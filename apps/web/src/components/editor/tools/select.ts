import { faArrowPointer } from '@fortawesome/free-solid-svg-icons';
import type { EditorContext, ProjectBroker } from 'src/store/editor';
import { get } from 'svelte/store';
import Flatten from '@flatten-js/core';
const { Polygon, point, Circle: FlatCircle, arc, matrix, Box, Relations } = Flatten;
import {
	Arc,
	Circle,
	makeObject,
	Object2D,
	ObjectType,
	Path,
	type Object2DShape,
	type ObjectID
} from 'core';
import type { ThreeJSOverlayView } from '@googlemaps/three';
import { computeBounds } from '../overlays/Selection';
import { Cursors } from '../cursors';
import { isMobile } from 'src/store/responsive';

export const IGNORED_OBJECTS = ['cornerstone', 'group'];

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

	let sels = get(editor.effectiveSelection);
	let objs = [];
	for (let id of sels) {
		let obj = broker.project.objectsMap.get(id);
		if (obj) objs.push(obj);
	}
	let box = computeBounds(objs);
	editor.transformOrigin.set([box.center.x, box.center.y]);
}

let lastPosition: [number, number] = [0, 0];
let lastRotation = [0, 0];
let lastScale = [0, 0];
let transformStartBox: Flatten.Box | null = null;
let transformStartObjects = new Map<ObjectID, Object2D>();
function computeStartBox(editor: EditorContext, broker: ProjectBroker) {
	transformStartObjects.clear();
	let sels = get(editor.effectiveSelection);
	let objs = [];
	for (let id of sels) {
		let obj = broker.project.objectsMap.get(id);
		let data = obj?.serialize();
		let copyObj = makeObject(data);
		copyObj.deserialize(data);
		transformStartObjects.set(id, copyObj);
		if (obj) objs.push(obj);
	}

	transformStartBox = computeBounds(objs);
}

function transformPoint(
	left: number,
	right: number,
	top: number,
	bottom: number,
	scaleDirectionX: number,
	scaleDirectionY: number,
	scaleFactorX: number,
	scaleFactorY: number,
	point: [number, number]
): [number, number] {
	// Calculate the width and height of the bounding box
	const width = right - left;
	const height = bottom - top;

	// Calculate the center point of the bounding box
	const cx = left + 0.5 * width;
	const cy = top + 0.5 * height;

	// Calculate the distance between the center point and the given point
	let dx = point[0] - cx;
	let dy = point[1] - cy;

	// Scale the distances in the x-direction and y-direction
	if (scaleDirectionX == -1) {
		dx *= scaleFactorX;
	} else if (scaleDirectionX == 1) {
		dx *= -scaleFactorX;
	}
	if (scaleDirectionY == -1) {
		dy *= scaleFactorY;
	} else if (scaleDirectionY == 1) {
		dy *= -scaleFactorY;
	}

	// Add the scaled distances to the center point to obtain the transformed point
	const tx = cx + dx;
	const ty = cy + dy;

	return [tx, ty];
}

export const SelectTool = {
	icon: faArrowPointer,
	key: 'select',
	shortcut: 's',
	onDown: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		if (get(isMobile)) {
			let toolMode = get(editor.mobileToolMode);
			if (toolMode == 'transform') {
				return;
			}
			// Search through top-level objects to select
			let target = get(editor.currentMousePositionRelative);
			let minSize = Infinity;
			let currentObj: string | null = null;
			for (let obj of broker.project.objects) {
				if (!obj.parent) {
					let bounds = broker.project.computeBounds(obj.id);
					if (
						target[0] > bounds.minX &&
						target[0] < bounds.maxX &&
						target[1] > bounds.minY &&
						target[1] < bounds.maxY
					) {
						let area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
						if (area < minSize) {
							minSize = area;
							currentObj = obj.id;
						}
					}
				}
			}

			if (currentObj) {
				editor.selection.set([currentObj]);
				editor.computeEffectiveSelection(broker);
			} else {
				editor.selection.set([]);
				editor.computeEffectiveSelection(broker);
			}

			return;
		}

		editor.selectionStart.set(get(editor.currentMousePosition));

		if (get(editor.canScale)) {
			// Do scaling
			editor.canScale.set(false);
			editor.scaling.set(true);
			lastPosition = get(editor.currentMousePositionRelative);

			computeStartBox(editor, broker);

			return;
		} else if (get(editor.canRotate)) {
			// Do rotate
			editor.canRotate.set(false);
			editor.rotating.set(true);
			lastPosition = get(editor.currentMousePositionRelative);

			computeStartBox(editor, broker);

			return;
		}

		editor.selectionDown.set(true);

		let cursor = get(editor.currentMousePositionRelative);
		let hover = getObjectAtCursor(editor, broker, cursor);

		let canChangeSelection = true;

		if (hover) {
			let sels = get(editor.effectiveSelection);

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
					editor.computeEffectiveSelection(broker);
				} else {
					editor.selection.set([]);
					editor.computeEffectiveSelection(broker);
				}
			} else {
				if (hover) {
					editor.selection.set([...get(editor.selection), hover]);
					editor.computeEffectiveSelection(broker);
				}
			}
		}
		computeStartBox(editor, broker);
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
			if (isTranslating) {
				let transaction = broker.project.createTransaction();
				let sels = get(editor.effectiveSelection);
				for (let id of sels) {
					let obj = broker.project.objectsMap.get(id);
					let objOrig = transformStartObjects.get(id);
					if (obj && objOrig) {
						transaction.update(id, 'transform', structuredClone(obj.transform));
						obj.transform = objOrig.transform;
					}
				}
				broker.commitTransaction(transaction);
			} else if (isScaling) {
				let sels = get(editor.effectiveSelection);
				let transaction = broker.project.createTransaction();
				for (let id of sels) {
					let obj = broker.project.objectsMap.get(id);
					let objOrig = transformStartObjects.get(id);
					if (obj && objOrig) {
						transaction.update(id, 'transform', structuredClone(obj.transform));
						if (obj.type == ObjectType.Path) {
							transaction.update(id, 'segments', structuredClone((obj as Path).segments));
						} else if (obj.type == ObjectType.Arc) {
							transaction.update(id, 'radius', structuredClone((obj as Arc).radius));
							transaction.update(id, 'startAngle', structuredClone((obj as Arc).startAngle));
							transaction.update(id, 'endAngle', structuredClone((obj as Arc).endAngle));
							(obj as Arc).radius = (objOrig as Arc).radius;
							(obj as Arc).startAngle = (objOrig as Arc).startAngle;
							(obj as Arc).endAngle = (objOrig as Arc).endAngle;
						} else if (obj.type == ObjectType.Circle) {
							transaction.update(id, 'radius', structuredClone((obj as Circle).radius));
							(obj as Circle).radius = (objOrig as Circle).radius;
						}

						obj.transform = objOrig.transform;
						if (obj.type == ObjectType.Path) {
							(obj as Path).segments = (objOrig as Path).segments;
						}
					}
				}
				broker.commitTransaction(transaction);
			} else if (isRotating) {
				let sels = get(editor.effectiveSelection);
				let transaction = broker.project.createTransaction();
				for (let id of sels) {
					let obj = broker.project.objectsMap.get(id);
					let objOrig = transformStartObjects.get(id);
					if (obj && objOrig) {
						transaction.update(id, 'transform', structuredClone(obj.transform));

						obj.transform = objOrig.transform;
					}
				}
				broker.commitTransaction(transaction);
			}
		}
	},
	onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		// Check for object intersection with cursor

		let isTranslating = get(editor.translating);
		let isRotating = get(editor.rotating);
		let isScaling = get(editor.scaling);

		if (isTranslating || isScaling || isRotating) {
			// Transforming
			let currentMousePosition = get(editor.currentMousePositionRelative);

			let deltaX = currentMousePosition[0] - lastPosition[0];
			let deltaY = currentMousePosition[1] - lastPosition[1];
			let sels = get(editor.effectiveSelection);

			if (isTranslating) {
				lastPosition = [...currentMousePosition];
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
			} else if (isScaling) {
				let sels = get(editor.effectiveSelection);
				let objs = [];
				let didApply = false;
				for (let id of sels) {
					let obj = broker.project.objectsMap.get(id);
					if (obj) {
						objs.push(obj);

						if (obj.transform.rotation != 0) {
							// Apply transform
							let rotation = obj.transform.rotation;
							let translation = point(obj.transform.position[0], obj.transform.position[1]);

							let mat = matrix(1, 0, 0, 1, 0, 0)
								.translate(translation.x, translation.y)
								.rotate(rotation);
							if (obj.type == ObjectType.Path) {
								let path = obj as Path;
								for (let seg of path.segments) {
									let p = point(seg[0], seg[1]);
									p = p.transform(mat);
									seg[0] = p.x;
									seg[1] = p.y;
								}
								obj.transform.position[0] = 0;
								obj.transform.position[1] = 0;
							} else if (obj.type == ObjectType.Arc) {
								let arc = obj as Arc;

								// Apply start/end angles
								let startAngle = arc.startAngle;
								let endAngle = arc.endAngle;
								let center = point(arc.transform.position[0], arc.transform.position[1]);
								let radius = arc.radius;

								arc.startAngle = startAngle - rotation;
								arc.endAngle = endAngle - rotation;
							}

							obj.transform.rotation = 0;
							obj.computeShape();

							didApply = true;
						}
					}
				}

				if (didApply) {
					computeStartBox(editor, broker);
				}
				let box = computeBounds(objs);

				if (!transformStartBox) return;
				let direction = get(editor.scaleDirection);
				if (ev.shiftKey) {
					let widthRatio = transformStartBox.width / transformStartBox.height;
					let heightRatio = transformStartBox.height / transformStartBox.width;

					if (direction[0] == 1 && direction[1] == 1) {
						let dx = currentMousePosition[0] - transformStartBox.high.x;
						let dy = currentMousePosition[1] - transformStartBox.high.y;
						if (dy > dx) {
							currentMousePosition[0] = dy * widthRatio + transformStartBox.high.x;
						} else {
							currentMousePosition[1] = dx * heightRatio + transformStartBox.high.y;
						}
					} else if (direction[0] == -1 && direction[1] == -1) {
						let dx = currentMousePosition[0] - transformStartBox.low.x;
						let dy = currentMousePosition[1] - transformStartBox.low.y;
						if (dy < dx) {
							currentMousePosition[0] = dy * widthRatio + transformStartBox.low.x;
						} else {
							currentMousePosition[1] = dx * heightRatio + transformStartBox.low.y;
						}
					} else if (direction[0] == 1 && direction[1] == -1) {
						let dx = currentMousePosition[0] - transformStartBox.high.x;
						let dy = currentMousePosition[1] - transformStartBox.low.y;
						if (Math.abs(dy) > Math.abs(dx)) {
							currentMousePosition[0] = dy * widthRatio * -1 + transformStartBox.high.x;
						} else {
							currentMousePosition[1] = dx * heightRatio * -1 + transformStartBox.low.y;
						}
					} else if (direction[0] == -1 && direction[1] == 1) {
						let dx = currentMousePosition[0] - transformStartBox.low.x;
						let dy = currentMousePosition[1] - transformStartBox.high.y;
						if (Math.abs(dy) > Math.abs(dx)) {
							currentMousePosition[0] = dy * widthRatio * -1 + transformStartBox.low.x;
						} else {
							currentMousePosition[1] = dx * heightRatio * -1 + transformStartBox.high.y;
						}
					}
				}

				let deltaScaleX =
					(currentMousePosition[0] - transformStartBox.low.x) / transformStartBox.width;

				let deltaScaleY =
					(currentMousePosition[1] - transformStartBox.low.y) / transformStartBox.height;

				for (let id of sels) {
					let obj = broker.project.objectsMap.get(id);
					let originalObj = transformStartObjects.get(id);
					if (obj && originalObj) {
						function normalizeX(x: number) {
							if (!obj) return 0;
							return x - obj.transform.position[0];
						}

						function normalizeY(y: number) {
							if (!obj) return 0;
							return y - obj.transform.position[1];
						}
						let width = transformStartBox.width;
						let height = transformStartBox.height;
						let relativeX = (originalObj.transform.position[0] - transformStartBox.low.x) / width;
						let relativeY = (originalObj.transform.position[1] - transformStartBox.low.y) / height;

						let newBoxWidth = width + currentMousePosition[0] - transformStartBox.high.x;
						let newBoxHeight = height + currentMousePosition[1] - transformStartBox.high.y;

						let newBoxLeft = transformStartBox.low.x;
						if (direction[0] == -1) {
							newBoxLeft = currentMousePosition[0];
							newBoxWidth = width - currentMousePosition[0] + transformStartBox.low.x;
						}

						let newBoxTop = transformStartBox.low.y;
						if (direction[1] == -1) {
							newBoxTop = currentMousePosition[1];
							newBoxHeight = height - currentMousePosition[1] + transformStartBox.low.y;
						}

						let scaleX = Math.abs(newBoxWidth / width);
						let scaleY = Math.abs(newBoxHeight / height);

						let newRelativeX = relativeX * newBoxWidth;
						let newRelativeY = relativeY * newBoxHeight;

						if (obj.type == ObjectType.Path) {
							let path = obj as Path;
							let originalPath = originalObj as Path;
							for (let i = 0; i < path.segments.length; i++) {
								let relativeX =
									originalPath.segments[i][0] + obj.transform.position[0] - transformStartBox.low.x;
								let relativeY =
									originalPath.segments[i][1] + obj.transform.position[1] - transformStartBox.low.y;

								if (direction[0] == 0) {
									// No op
								} else if (direction[0] > 0) {
									// Scale right
									path.segments[i][0] = normalizeX(
										transformStartBox.low.x + relativeX * deltaScaleX
									);
								} else {
									// Scale left and lock right edge
									path.segments[i][0] = normalizeX(
										transformStartBox.low.x +
											relativeX * (1 - deltaScaleX) +
											deltaScaleX * transformStartBox.width
									);
								}

								if (direction[1] == 0) {
									// No op
								} else if (direction[1] > 0) {
									// Scale down
									path.segments[i][1] = normalizeY(
										transformStartBox.low.y + relativeY * deltaScaleY
									);
								} else {
									// Scale up and lock bottom edge
									path.segments[i][1] = normalizeY(
										transformStartBox.low.y +
											relativeY * (1 - deltaScaleY) +
											deltaScaleY * transformStartBox.height
									);
								}
							}
						} else if (obj.type == ObjectType.Arc || obj.type == ObjectType.Circle) {
							let arc = obj as Arc | Circle;
							let originalArc = originalObj as Arc | Circle;

							arc.radius = originalArc.radius * Math.max(scaleX, scaleY);
							if (direction[0] == 0) {
								arc.radius = originalArc.radius * scaleY;
							}
							if (direction[1] == 0) {
								arc.radius = originalArc.radius * scaleX;
							}

							if (direction[0] != 0) {
								arc.transform.position[0] = newBoxLeft + newRelativeX;
							}

							if (direction[1] != 0) {
								arc.transform.position[1] = newBoxTop + newRelativeY;
							}
						}

						obj.computeShape();
						broker.markObjectDirty(id);
					}
				}

				broker.needsRender.set(true);
			} else if (isRotating) {
				if (!transformStartBox) return;
				function dot(a: [number, number], b: [number, number]) {
					return a[0] * b[0] + a[1] * b[1];
				}

				function cross(a: [number, number], b: [number, number]) {
					return a[0] * b[1] - a[1] * b[0];
				}

				function length(a: [number, number]) {
					return Math.sqrt(dot(a, a));
				}
				function sub(a: [number, number], b: [number, number]): [number, number] {
					return [a[0] - b[0], a[1] - b[1]];
				}
				let center: [number, number] = [transformStartBox.center.x, transformStartBox.center.y];

				let lastRel = sub(lastPosition, center);
				lastRel = [lastRel[0] / length(lastRel), lastRel[1] / length(lastRel)];
				let currentRel = sub(currentMousePosition, center);
				currentRel = [currentRel[0] / length(currentRel), currentRel[1] / length(currentRel)];
				let deltaAngle = Math.atan2(cross(lastRel, currentRel), dot(lastRel, currentRel));
				if (ev.shiftKey) {
					deltaAngle = Math.round(deltaAngle / (Math.PI / 4)) * (Math.PI / 4);
				}
				let rotationMatrix = matrix(1, 0, 0, 1, 0, 0).rotate(deltaAngle);
				let centerPoint = transformStartBox.center;

				// lastPosition = [...currentMousePosition];
				if (isNaN(deltaAngle)) return;

				let sels = get(editor.effectiveSelection);

				for (let id of sels) {
					let obj = broker.project.objectsMap.get(id);
					let originalObj = transformStartObjects.get(id);
					if (obj && originalObj) {
						// Rotate about center point
						let objectAnchorPoint = point(
							originalObj.transform.position[0],
							originalObj.transform.position[1]
						);
						let objPoint = point(
							objectAnchorPoint.x - centerPoint.x,
							objectAnchorPoint.y - centerPoint.y
						);
						obj.transform.rotation = originalObj.transform.rotation + deltaAngle;

						let rotatedPoint = objPoint.transform(rotationMatrix);
						obj.transform.position[0] = rotatedPoint.x + centerPoint.x;
						obj.transform.position[1] = rotatedPoint.y + centerPoint.y;

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
			let sels = get(editor.effectiveSelection);
			let objs = [];
			for (let id of sels) {
				let obj = broker.project.objectsMap.get(id);
				if (obj) objs.push(obj);
			}
			let box = computeBounds(objs);
			if (box.width > 0 || box.height > 0) {
				let cursorPoint = point(cursor[0], cursor[1]);

				let setCursor = false;
				let canScale = false;
				let canRotate = false;
				let scaleDirection: [number, number] = [0, 0];

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
					canScale = true;
					scaleDirection = [Math.abs(box.low.x - cursor[0]) < dist ? -1 : 1, 0];
					setCursor = true;
				}

				if (
					(Math.abs(box.low.y - cursor[1]) < dist || Math.abs(box.high.y - cursor[1]) < dist) &&
					cursor[0] > box.low.x &&
					cursor[0] < box.high.x
				) {
					editor.selectToolCursor.set(Cursors.ns);
					canScale = true;
					scaleDirection = [0, Math.abs(box.low.y - cursor[1]) < dist ? -1 : 1];
					setCursor = true;
				}

				if (topLeft.distanceTo(cursorPoint)[0] < dist) {
					editor.selectToolCursor.set(Cursors.nwse);
					canScale = true;
					scaleDirection = [-1, -1];
					setCursor = true;
				}

				if (topRight.distanceTo(cursorPoint)[0] < dist) {
					editor.selectToolCursor.set(Cursors.nesw);
					canScale = true;
					scaleDirection = [1, -1];
					setCursor = true;
				}

				if (bottomLeft.distanceTo(cursorPoint)[0] < dist) {
					editor.selectToolCursor.set(Cursors.nesw);
					canScale = true;
					scaleDirection = [-1, 1];
					setCursor = true;
				}

				if (bottomRight.distanceTo(cursorPoint)[0] < dist) {
					editor.selectToolCursor.set(Cursors.nwse);
					canScale = true;
					scaleDirection = [1, 1];
					setCursor = true;
				}

				if (topLeftRotate.distanceTo(cursorPoint)[0] < dist) {
					editor.selectToolCursor.set(Cursors.rtl);
					canRotate = true;
					setCursor = true;
				}

				if (topRightRotate.distanceTo(cursorPoint)[0] < dist) {
					editor.selectToolCursor.set(Cursors.rtr);
					canRotate = true;
					setCursor = true;
				}

				if (bottomLeftRotate.distanceTo(cursorPoint)[0] < dist) {
					editor.selectToolCursor.set(Cursors.rbl);
					canRotate = true;
					setCursor = true;
				}

				if (bottomRightRotate.distanceTo(cursorPoint)[0] < dist) {
					editor.selectToolCursor.set(Cursors.rbr);
					canRotate = true;
					setCursor = true;
				}

				if (!setCursor) {
					editor.selectToolCursor.set(Cursors.default);
				}

				if (canRotate) {
					editor.canRotate.set(canRotate);
					editor.canScale.set(false);
				} else {
					editor.canScale.set(canScale);
					editor.canRotate.set(false);
				}
				editor.scaleDirection.set(scaleDirection);
			} else {
				editor.selectToolCursor.set(Cursors.default);
			}
			// Hover object highlight
			let hover = getObjectAtCursor(editor, broker, cursor);

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

function shapeToBox(shape: Object2DShape): Flatten.Box {
	if (shape instanceof Flatten.Box) {
		return shape;
	} else {
		return shape.box;
	}
}

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

	let startVec = broker.normalizeVector(
		overlay.latLngAltitudeToVector3({ lat: start[0], lng: start[1] })
	);
	let endVec = broker.normalizeVector(
		overlay.latLngAltitudeToVector3({ lat: end[0], lng: end[1] })
	);

	let box = new Box(
		Math.min(startVec.x, endVec.x),
		Math.min(startVec.z, endVec.z),
		Math.max(startVec.x, endVec.x),
		Math.max(startVec.z, endVec.z)
	);

	let poly = boxToPoly(box);
	let selection = [];
	let quadObjects = broker.project.getObjectsInBounds({
		minX: box.low.x,
		minY: box.low.y,
		maxX: box.high.x,
		maxY: box.high.y
	});
	for (let obj of quadObjects) {
		if (!obj.flatShape) continue;
		if (IGNORED_OBJECTS.includes(obj.type)) continue;
		let doesIntersect = false;
		for (let fl of obj.flatShape) {
			if (doesIntersect) continue;
			// let relate = Relations.relate(box, fl);
			let box: Flatten.Box;
			if (fl instanceof Flatten.Box) {
				box = fl;
			} else {
				box = fl.box;
			}

			// Cheap bounding box check
			if (box.high.x < poly.box.low.x) continue;
			if (box.low.x > poly.box.high.x) continue;
			if (box.high.y < poly.box.low.y) continue;
			if (box.low.y > poly.box.high.y) continue;

			// If the box is completely inside the polygon, we can just add it
			if (
				box.high.x <= poly.box.high.x &&
				box.low.x >= poly.box.low.x &&
				box.high.y <= poly.box.high.y &&
				box.low.y >= poly.box.low.y
			) {
				doesIntersect = true;
				continue;
			}

			try {
				let inters = poly.intersect(fl);
				let to = poly.contains(fl) || inters.length > 0;
				if (to) {
					doesIntersect = true;
				}
			} catch (e) {}
		}

		if (doesIntersect) selection.push(obj.id);
	}

	editor.selection.set(selection);
	editor.computeEffectiveSelection(broker);
}

function computeSelectionCenter(editor: EditorContext, broker: ProjectBroker): [number, number] {}

function getObjectAtCursor(
	editor: EditorContext,
	broker: ProjectBroker,
	cursor: [number, number]
): ObjectID | null {
	let topObject = null;
	let topZ = -Infinity;
	let quadObjects = broker.project.getObjectsInBounds({
		minX: cursor[0] - 0.0001,
		minY: cursor[1] - 0.0001,
		maxX: cursor[0] + 0.0001,
		maxY: cursor[1] + 0.0001
	});

	for (let obj of quadObjects) {
		if (!obj.flatShape) continue;
		for (let fl of obj.flatShape) {
			let [dist, seg] = distanceTo(fl, point(cursor[0], cursor[1]));
			if (dist < get(editor.screenScale) / 2) {
				if ((obj.order ?? 0) >= topZ) {
					topZ = obj.order ?? 0;
					topObject = obj.id;
				}
			}

			if (fl instanceof Flatten.Polygon) {
				if (fl.contains(point(cursor[0], cursor[1]))) {
					if ((obj.order ?? 0) >= topZ) {
						topZ = obj.order ?? 0;
						topObject = obj.id;
					}
				}
			}
		}
	}

	return topObject;
}
