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
	type ObjectID,
	Text,
	SVG,
	makeRotationMatrix,
	multiplyMatrix
} from 'core';
import type { ThreeJSOverlayView } from '@googlemaps/three';
import { computeBounds } from '../overlays/Selection';
import { Cursors } from '../cursors';
import { isMobile } from 'src/store/responsive';
import { Quadtree } from 'core/lib/quadtree/Quadtree';
import type { MapProviderOverlay } from '../overlays/Overlay';

export const IGNORED_OBJECTS = ['cornerstone', 'group'];
let needsRootReset = false;
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
let clickTimer = 0;

export const noParcelFilter = (obj: Object2D) => !(obj.pinned ?? false);

function computeStartBox(editor: EditorContext, broker: ProjectBroker) {
	transformStartObjects.clear();
	let sels = get(editor.effectiveSelection);
	let objs = [];
	for (let id of sels) {
		let obj = broker.project.objectsMap.get(id);
		if (obj) {
			let data = obj?.serialize();
			let copyObj = makeObject(data);
			copyObj.deserialize(data);
			transformStartObjects.set(id, copyObj);
			if (obj) objs.push(obj);
		}
	}

	transformStartBox = computeBounds(objs);

	if (objs.length == 1) {
		let angle = objs[0].transform.rotation;
		let ox = objs[0].transform.position[0];
		let oy = objs[0].transform.position[1];

		let mat = makeRotationMatrix(-angle);

		objs[0].transform.position = multiplyMatrix(
			[ox - transformStartBox.center.x, oy - transformStartBox.center.y],
			mat
		);
		objs[0].transform.position[0] += transformStartBox.center.x;
		objs[0].transform.position[1] += transformStartBox.center.y;
		objs[0].transform.rotation = 0;
		objs[0].computeShape();
		transformStartBox = computeBounds(objs);
		objs[0].transform.rotation = angle;
		objs[0].transform.position = [ox, oy];

		objs[0].computeShape();
	}
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

export function calculateGuides(
	editor: EditorContext,
	broker: ProjectBroker,
	candidateOverride: Flatten.Point | null = null
): {
	points: Flatten.Point[];
	lines: Flatten.Segment[];
	translation: [number, number];
} {
	let map = get(editor.map);
	if (!map) return { points: [], lines: [], translation: [0, 0] };
	let snappingDistance = map.getZoom() ?? 1;
	snappingDistance = 21 - snappingDistance;

	snappingDistance = Math.max(1, snappingDistance);
	snappingDistance ** 2;
	snappingDistance /= 2;
	snappingDistance = get(editor.screenScale);

	// Points on the subject object(s) (current effective selection)
	let candidatePoints: Flatten.Point[] = [];

	// Points on the target object(s) (all objects)
	let targetPoints: Flatten.Point[] = [];

	let targetLines: Flatten.Segment[] = [];
	let targetArc: Flatten.Arc[] = [];

	let selection = get(editor.effectiveSelection);
	let selectionSet = new Set(selection);
	let viewBounds = get(editor.viewBounds);
	for (let obj of broker.project.objects) {
		if (IGNORED_OBJECTS.includes(obj.id) || get(editor.editingObject) === obj.id) continue;
		let guides = obj.getGuides();
		if (selectionSet.has(obj.id) && !candidateOverride) {
			candidatePoints.push(...guides.points);
		} else {
			for (let point of guides.points) {
				if (
					point.x > viewBounds.minX &&
					point.x < viewBounds.maxX &&
					point.y > viewBounds.minY &&
					point.y < viewBounds.maxY
				) {
					targetPoints.push(point);
				}
			}

			for (let seg of guides.segments) {
				if (
					seg.start.x > viewBounds.minX &&
					seg.start.x < viewBounds.maxX &&
					seg.start.y > viewBounds.minY &&
					seg.start.y < viewBounds.maxY &&
					seg.end.x > viewBounds.minX &&
					seg.end.x < viewBounds.maxX &&
					seg.end.y > viewBounds.minY &&
					seg.end.y < viewBounds.maxY
				) {
					targetLines.push(seg);
				}
			}
			targetArc.push(...guides.arcs);
		}
	}

	if (candidatePoints.length > 15) {
		let bounds = broker.project.computeBoundsMulti(selection);
		let center = [(bounds.maxX + bounds.minX) / 2, (bounds.maxY + bounds.minY) / 2];
		candidatePoints = [
			Flatten.point(center[0], center[1]),
			Flatten.point(bounds.minX, bounds.minY),
			Flatten.point(bounds.maxX, bounds.minY),
			Flatten.point(bounds.minX, bounds.maxY),
			Flatten.point(bounds.maxX, bounds.maxY)
		];
	}

	if (candidateOverride) {
		candidatePoints = [candidateOverride];
	}

	let outPoints: Flatten.Point[] = [];
	let outLines: Flatten.Segment[] = [];

	let currentTranslation: [number, number] = [0, 0];
	let translations = new Map<
		string,
		{
			translation: [number, number];
			points: Flatten.Point[];
			lines: Flatten.Segment[];
			distance: number;
		}
	>();

	function addPoint(target: Flatten.Point, candidate: Flatten.Point) {
		let localTranslation = [target.x - candidate.x, target.y - candidate.y];
		let key = `${localTranslation[0]}:${localTranslation[1]}`;
		let data = translations.get(key);
		if (!data) {
			data = {
				translation: [localTranslation[0], localTranslation[1]],
				points: [],
				lines: [],
				distance: 0
			};
			translations.set(key, data);
		}

		data.points.push(target);
		data.distance += target.distanceTo(candidate)[0];
	}

	function addLine(a: Flatten.Point, b: Flatten.Point, candidate: Flatten.Point) {
		let localTranslation = [b.x - candidate.x, b.y - candidate.y];
		let key = `${localTranslation[0]}:${localTranslation[1]}`;
		let data = translations.get(key);
		if (!data) {
			data = {
				translation: [localTranslation[0], localTranslation[1]],
				points: [],
				lines: [],
				distance: 0
			};
			translations.set(key, data);
		}

		data.lines.push(Flatten.segment(a, b));

		data.points.push(a);
		data.points.push(b);

		data.distance += b.distanceTo(candidate)[0];
	}

	for (let point of candidatePoints) {
		for (let target of targetPoints) {
			let [dist, seg] = point.distanceTo(target);
			if (dist < snappingDistance) {
				addPoint(target, point);
			}

			if (Math.abs(target.x - point.x) < snappingDistance) {
				addLine(target, Flatten.point(target.x, point.y), point);
			}

			if (Math.abs(target.y - point.y) < snappingDistance) {
				addLine(target, Flatten.point(point.x, target.y), point);
			}
		}

		for (let target of targetLines) {
			let [dist, seg] = point.distanceTo(target);
			if (dist < snappingDistance) {
				addPoint(seg.end, point);
				addLine(target.start, seg.end, point);
				addLine(target.end, seg.end, point);
			}
		}
	}

	let bestScore = Infinity;
	let translation: {
		translation: [number, number];
		points: Flatten.Point[];
		lines: Flatten.Segment[];
	} | null = null;

	for (let [key, data] of translations) {
		if (data.lines.length == 0) {
			let total = data.points.length;
			if (data.distance < bestScore) {
				bestScore = data.distance;
				translation = data;
			}
		}
	}

	if (bestScore < Infinity && translation) {
		return {
			points: translation.points,
			lines: translation.lines,
			translation: translation.translation
		};
	}

	bestScore = Infinity;
	translation = null;
	for (let [key, data] of translations) {
		if (data.lines.length > 0) {
			let total = data.points.length;
			if (data.distance < bestScore) {
				bestScore = total;
				translation = data;
			}
		}
	}

	if (bestScore < Infinity && translation) {
		return {
			points: translation.points,
			lines: translation.lines,
			translation: translation.translation
		};
	}

	return {
		points: [],
		lines: [],
		translation: [0, 0]
	};
}

export function selectDown(ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) {
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
			if (!obj.parent && !obj.pinned) {
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
			editor.select(currentObj);
			editor.activateDialog('');
		} else {
			editor.deselectAll();
		}

		return;
	}

	selectionAdditional = [];

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
	let cursorScreen = get(editor.currentMousePositionScreen);
	let hover = getObjectAtCursor(editor, broker, cursor, cursorScreen, noParcelFilter);

	let canChangeSelection = true;
	let pinnedHover = false;

	if (hover || get(editor.canTranslate)) {
		let sels = get(editor.effectiveSelection);

		if (hover) {
			hover = ascendToRoot(editor, broker, hover);
			if (sels.includes(hover)) {
				canChangeSelection = false;
				if (ev.shiftKey) {
					canChangeSelection = true;
				}
			}

			let hoverObj = broker.project.objectsMap.get(hover);
			if (hoverObj && hoverObj.pinned && !get(editor.canTranslate)) {
				{
					pinnedHover = true;
				}
			}
		}

		if (!pinnedHover) {
			if (get(editor.canTranslate)) {
				canChangeSelection = false;
				editor.selectToolCursor.set(Cursors.grabbing);
			}
			editor.canTranslate.set(false);

			startTransform(editor, broker);
			editor.translating.set(true);
			editor.selectionDown.set(false);
			lastPosition = get(editor.currentMousePositionRelative);
		}
	}

	if (canChangeSelection) {
		editor.editingObject.set(null);
		editor.editingObjectDown.set(false);

		if (!pinnedHover) {
			if (!ev.shiftKey) {
				if (hover) {
					editor.select(hover);
					let hoverObj = broker.project.objectsMap.get(hover);
					if (hoverObj) {
						if (hoverObj.type == ObjectType.Path) {
							let hoverPath = hoverObj as Path;
							if (hoverPath.segments.length == 2) {
								editor.editingObject.set(hover);
							}
						}
					}
				} else {
					// We don't reset the root until mouse up
					let cacheRoot = get(editor.rootGroup);
					editor.deselectAll();
					editor.rootGroup.set(cacheRoot);
					needsRootReset = true;
				}
			} else {
				if (hover) {
					console.log('hover', hover);
					let currentSelection = get(editor.selection);
					if (currentSelection.includes(hover)) {
						currentSelection = currentSelection.filter((x) => x != hover);
					} else {
						currentSelection.push(hover);
					}
					editor.selection.set(currentSelection);

					editor.computeEffectiveSelection(broker);
					editor.rootGroup.set(null);
				} else {
					selectionAdditional = [...get(editor.selection)];
				}
			}
		} else {
			editor.deselectAll();
			editor.hoveringObject.set('');
		}
	} else {
		if (!pinnedHover) {
			if (Date.now() - clickTimer < 300) {
				// Double click
				if (hover) {
					let obj = broker.project.objectsMap.get(hover);
					if (obj) {
						if (obj.type == 'group') {
							editor.rootGroup.set(hover);
						} else {
							setTimeout(() => {
								editor.editingObject.set(hover);
								editor.editingObjectDown.set(true);
							}, 1);
						}
					}
				}
				hover = getObjectAtCursor(editor, broker, cursor, cursorScreen, noParcelFilter);
				if (hover) {
					hover = ascendToRoot(editor, broker, hover);
					editor.select(hover);
					editor.hoveringObject.set(hover);
				}
			}
		}
	}

	clickTimer = Date.now();
	computeStartBox(editor, broker);
}

export function selectUp(ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) {
	editor.guides.set({
		lines: [],
		points: []
	});
	if (needsRootReset) {
		editor.rootGroup.set(null);
		needsRootReset = false;
	}
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
			let didRealChange = false;
			for (let id of sels) {
				let obj = broker.project.objectsMap.get(id);
				let objOrig = transformStartObjects.get(id);
				if (obj && objOrig) {
					transaction.update(id, 'transform', structuredClone(obj.transform));
					if (
						obj.transform.position[0] != objOrig.transform.position[0] ||
						obj.transform.position[1] != objOrig.transform.position[1]
					) {
						didRealChange = true;
					}
					obj.transform = objOrig.transform;
				}
			}
			if (get(editor.selectToolCursor) == Cursors.grabbing) {
				editor.selectToolCursor.set(Cursors.grab);
			}
			if (didRealChange) {
				broker.commitTransaction(transaction);
			}
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
					} else if (obj.type == ObjectType.Text) {
						transaction.update(id, 'size', structuredClone((obj as Text).size));
						(obj as Text).size = (objOrig as Text).size;
					}

					obj.transform = structuredClone(objOrig.transform);
					if (obj.type == ObjectType.Path) {
						(obj as Path).segments = structuredClone((objOrig as Path).segments);
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
}

export function selectMove(ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) {
	let access = get(broker.sessionAccess);

	// Check for object intersection with cursor

	let isTranslating = get(editor.translating);
	let isRotating = get(editor.rotating);
	let isScaling = get(editor.scaling);
	let canTransform = !get(editor.editingObjectDown);

	// let effectiveSelection = get(editor.effectiveSelection);
	// if (effectiveSelection.length == 1) {
	// 	for (let objId of effectiveSelection) {
	// 		let obj = broker.project.objectsMap.get(objId);
	// 		if (obj) {
	// 			if (obj.pinned) {
	// 				canTransform = false;
	// 				isTranslating = false;
	// 				isRotating = false;
	// 				isScaling = false;

	// 				editor.deselectAll();

	// 				break;
	// 			}
	// 		}
	// 	}
	// }

	if (access === 'WRITE' && (isTranslating || isScaling || isRotating) && canTransform) {
		// Transforming
		let currentMousePosition = get(editor.currentMousePositionRelative);

		let sels = get(editor.effectiveSelection);
		if (isScaling) {
			if (sels.length == 1) {
				let obj = broker.project.objectsMap.get(sels[0]);
				if (obj && transformStartBox) {
					let matrix = makeRotationMatrix(-obj.transform.rotation);
					currentMousePosition = multiplyMatrix(
						[
							currentMousePosition[0] - transformStartBox.center.x,
							currentMousePosition[1] - transformStartBox.center.y
						],
						matrix
					);

					currentMousePosition[0] += transformStartBox.center.x;
					currentMousePosition[1] += transformStartBox.center.y;
				}
			}
		}

		let rootDeltaX = currentMousePosition[0] - lastPosition[0];
		let rootDeltaY = currentMousePosition[1] - lastPosition[1];

		if (isTranslating) {
			if (ev.shiftKey) {
				if (Math.abs(rootDeltaX) > Math.abs(rootDeltaY)) {
					rootDeltaY = 0;
				} else {
					rootDeltaX = 0;
				}
			}
			for (let id of sels) {
				let obj = broker.project.objectsMap.get(id);
				let origObj = transformStartObjects.get(id);
				if (obj && origObj) {
					obj.transform.position[0] = origObj.transform.position[0] + rootDeltaX;
					obj.transform.position[1] = origObj.transform.position[1] + rootDeltaY;
					obj.computeShape();
					broker.markObjectDirty(id);
				}
			}

			let deltaX = 0;
			let deltaY = 0;

			if (!ev.ctrlKey) {
				let guides = calculateGuides(editor, broker);

				if (guides.lines.length > 0 || guides.points.length > 0) {
					editor.guides.set({
						lines: guides.lines.map((l) => [
							[l.start.x, l.start.y],
							[l.end.x, l.end.y]
						]),
						points: guides.points.map((p) => [p.x, p.y])
					});
					deltaX = guides.translation[0];
					deltaY = guides.translation[1];
				} else {
					editor.guides.set({
						lines: [],
						points: []
					});
				}
			} else {
				editor.guides.set({
					lines: [],
					points: []
				});
			}

			if (ev.shiftKey) {
				if (Math.abs(rootDeltaX) > Math.abs(rootDeltaY)) {
					deltaY = 0;
				} else {
					deltaX = 0;
				}
			}

			if (deltaX != 0 || deltaY != 0) {
				for (let id of sels) {
					let obj = broker.project.objectsMap.get(id);
					let origObj = transformStartObjects.get(id);
					if (obj && origObj) {
						obj.transform.position[0] += deltaX;
						obj.transform.position[1] += deltaY;
						obj.computeShape();
						broker.markObjectDirty(id);
					}
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

					if (sels.length != 1 && obj.transform.rotation != 0) {
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

							obj.transform.rotation = 0;
						} else if (obj.type == ObjectType.Arc) {
							let arc = obj as Arc;

							// Apply start/end angles
							let startAngle = arc.startAngle;
							let endAngle = arc.endAngle;
							let center = point(arc.transform.position[0], arc.transform.position[1]);
							let radius = arc.radius;

							arc.startAngle = startAngle - rotation;
							arc.endAngle = endAngle - rotation;
							obj.transform.rotation = 0;
						}

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
					let width = transformStartBox.width;
					let height = transformStartBox.height;
					let rotMatrix = makeRotationMatrix(0);
					if (sels.length == 1) {
						rotMatrix = makeRotationMatrix(-originalObj.transform.rotation);
					}
					let unrotated = multiplyMatrix(
						[
							originalObj.transform.position[0] - transformStartBox.center.x,
							originalObj.transform.position[1] - transformStartBox.center.y
						],
						rotMatrix
					);
					unrotated[0] += transformStartBox.center.x;
					unrotated[1] += transformStartBox.center.y;

					let unrotatedObjPos = multiplyMatrix(
						[
							obj.transform.position[0] - transformStartBox.center.x,
							obj.transform.position[1] - transformStartBox.center.y
						],
						rotMatrix
					);
					unrotatedObjPos[0] += transformStartBox.center.x;
					unrotatedObjPos[1] += transformStartBox.center.y;

					function normalizeX(x: number) {
						if (!obj) return 0;
						return x - unrotatedObjPos[0];
					}

					function normalizeY(y: number) {
						if (!obj) return 0;
						return y - unrotatedObjPos[1];
					}

					let relativeX = (unrotated[0] - transformStartBox.low.x) / width;
					let relativeY = (unrotated[1] - transformStartBox.low.y) / height;

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
								originalPath.segments[i][0] + unrotatedObjPos[0] - transformStartBox.low.x;
							let relativeY =
								originalPath.segments[i][1] + unrotatedObjPos[1] - transformStartBox.low.y;

							if (direction[0] == 0) {
								// No op
							} else if (direction[0] > 0) {
								// Scale right
								path.segments[i][0] = normalizeX(transformStartBox.low.x + relativeX * deltaScaleX);
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
								path.segments[i][1] = normalizeY(transformStartBox.low.y + relativeY * deltaScaleY);
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
					} else if (obj.type == ObjectType.Text) {
						let text = obj as Text;
						let originalText = originalObj as Text;

						let newFontSize = originalText.size * Math.max(scaleX, scaleY);
						if (direction[0] == 0) {
							newFontSize = originalText.size * scaleY;
						}

						if (direction[1] == 0) {
							newFontSize = originalText.size * scaleX;
						}

						text.size = newFontSize;
						if (direction[0] != 0) {
							text.transform.position[0] = newBoxLeft + newRelativeX;
						}

						if (direction[1] != 0) {
							text.transform.position[1] = newBoxTop + newRelativeY;
						}
					} else if (obj.type == ObjectType.SVG) {
						let svg = obj as SVG;
						let originalSVG = originalObj as SVG;

						if (direction[0] != 0) {
							svg.transform.position[0] = newBoxLeft + newRelativeX;
							svg.transform.size[0] = originalSVG.transform.size[0] * scaleX;
						}
						if (direction[1] != 0) {
							svg.transform.position[1] = newBoxTop + newRelativeY;
							svg.transform.size[1] = originalSVG.transform.size[1] * scaleY;
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
		let cursorScreen = get(editor.currentMousePositionScreen);

		// Corner grabbing cursor
		let sels = get(editor.effectiveSelection);
		let objs = [];
		for (let id of sels) {
			let obj = broker.project.objectsMap.get(id);
			if (obj) objs.push(obj);
		}
		let box = computeBounds(objs);
		if (access == 'WRITE' && (box.width > 0 || box.height > 0) && canTransform) {
			needsRootReset = false;
			let cursorPoint = point(cursor[0], cursor[1]);

			if (objs.length == 1) {
				let angle = objs[0].transform.rotation;
				let ox = objs[0].transform.position[0];
				let oy = objs[0].transform.position[1];

				let mat = makeRotationMatrix(-angle);

				objs[0].transform.position = multiplyMatrix([ox - box.center.x, oy - box.center.y], mat);
				objs[0].transform.position[0] += box.center.x;
				objs[0].transform.position[1] += box.center.y;
				objs[0].transform.rotation = 0;
				objs[0].computeShape();
				let newBox = computeBounds(objs);
				objs[0].transform.rotation = angle;
				objs[0].transform.position = [ox, oy];

				objs[0].computeShape();

				box = newBox;
			}

			let setCursor = false;
			let canScale = false;
			let canRotate = false;
			let canTranslate = false;
			let scaleDirection: [number, number] = [0, 0];

			let dist = get(editor.screenScale);

			let topMid = point(box.center.x, box.low.y);

			let topLeft = point(box.low.x, box.low.y);
			let topRight = point(box.high.x, box.low.y);
			let bottomLeft = point(box.low.x, box.high.y);
			let bottomRight = point(box.high.x, box.high.y);

			let rotateDistance = dist;
			let topLeftRotate = point(box.low.x - rotateDistance, box.low.y - rotateDistance);
			let topRightRotate = point(box.high.x + rotateDistance, box.low.y - rotateDistance);
			let bottomRightRotate = point(box.high.x + rotateDistance, box.high.y + rotateDistance);
			let bottomLeftRotate = point(box.low.x - rotateDistance, box.high.y + rotateDistance);

			let useMoveCursor = false;

			if (objs.length == 1) {
				let matr = makeRotationMatrix(-objs[0].transform.rotation);
				cursor = multiplyMatrix([cursor[0] - box.center.x, cursor[1] - box.center.y], matr);

				cursor[0] += box.center.x;
				cursor[1] += box.center.y;
				cursorPoint = point(cursor[0], cursor[1]);

				if (objs[0].type == ObjectType.Path) {
					let path = objs[0] as Path;
					if (path.flatShape && path.flatShape.length == 1 && !path.smartObject) {
						useMoveCursor = true;

						let closeMatch = (a: Flatten.Point, b: Flatten.Point) => {
							let threshold = 0.1;
							return Math.abs(a.x - b.x) < threshold && Math.abs(a.y - b.y) < threshold;
						};

						let shape = path.flatShape[0];
						if (shape instanceof Flatten.Segment) {
							if (!closeMatch(topLeft, shape.start) && !closeMatch(topLeft, shape.end)) {
								topLeft = point(10000000, 1000000);
							}

							if (!closeMatch(topRight, shape.start) && !closeMatch(topRight, shape.end)) {
								topRight = point(10000000, 1000000);
							}

							if (!closeMatch(bottomLeft, shape.start) && !closeMatch(bottomLeft, shape.end)) {
								bottomLeft = point(10000000, 1000000);
							}

							if (!closeMatch(bottomRight, shape.start) && !closeMatch(bottomRight, shape.end)) {
								bottomRight = point(10000000, 1000000);
							}
						}
					}
				}
				// topLeft = topLeft.transform(matrix);
				// topRight = topRight.transform(matrix);
				// bottomLeft = bottomLeft.transform(matrix);
				// bottomRight = bottomRight.transform(matrix);
				// topLeftRotate = topLeftRotate.transform(matrix);
				// topRightRotate = topRightRotate.transform(matrix);
				// bottomLeftRotate = bottomLeftRotate.transform(matrix);
				// bottomRightRotate = bottomRightRotate.transform(matrix);
			}

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
				editor.selectToolCursor.set(useMoveCursor ? Cursors.crosshair : Cursors.nwse);
				canScale = true;
				scaleDirection = [-1, -1];
				setCursor = true;
			}

			if (topRight.distanceTo(cursorPoint)[0] < dist) {
				editor.selectToolCursor.set(useMoveCursor ? Cursors.crosshair : Cursors.nesw);
				canScale = true;
				scaleDirection = [1, -1];
				setCursor = true;
			}

			if (bottomLeft.distanceTo(cursorPoint)[0] < dist) {
				editor.selectToolCursor.set(useMoveCursor ? Cursors.crosshair : Cursors.nesw);
				canScale = true;
				scaleDirection = [-1, 1];
				setCursor = true;
			}

			if (bottomRight.distanceTo(cursorPoint)[0] < dist) {
				editor.selectToolCursor.set(useMoveCursor ? Cursors.crosshair : Cursors.nwse);
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
			if (
				cursor[0] > topMid.x - dist * 1.5 &&
				cursor[0] < topMid.x + dist * 1.5 &&
				cursor[1] > topMid.y - dist &&
				cursor[1] < topMid.y + dist
			) {
				editor.selectToolCursor.set(Cursors.grab);

				canScale = false;
				canRotate = false;
				canTranslate = true;
				setCursor = true;
			}

			if (!setCursor) {
				editor.selectToolCursor.set(Cursors.default);
			} else {
				if (objs.length == 1) {
					let cursorVal = get(editor.selectToolCursor);
					if (cursorVal != Cursors.grab) {
						cursorVal = cursorVal.replace(
							'%rot%',
							(objs[0].transform.rotation * (180 / Math.PI)).toString()
						);

						editor.selectToolCursor.set(cursorVal);
					}
				}
			}

			if (canRotate) {
				editor.canRotate.set(canRotate);
				editor.canScale.set(false);
				editor.canTranslate.set(false);
			} else if (canScale) {
				editor.canScale.set(canScale);
				editor.canRotate.set(false);
				editor.canTranslate.set(false);
			} else {
				editor.canTranslate.set(canTranslate);
				editor.canScale.set(false);
				editor.canRotate.set(false);
			}
			editor.scaleDirection.set(scaleDirection);
		} else {
			editor.selectToolCursor.set(Cursors.default);
		}
		if (!get(editor.selectionDown) && !(isTranslating || isScaling || isRotating)) {
			// Hover object highlight
			let hover = getObjectAtCursor(editor, broker, cursor, cursorScreen, noParcelFilter);

			if (hover) {
				let hoverObj = broker.project.objectsMap.get(hover);
				if (hoverObj) {
					if (!hoverObj.pinned) {
						hover = ascendToRoot(editor, broker, hover);
						if (get(editor.hoveringObject) !== hover) editor.hoveringObject.set(hover);
					}
				}
			} else {
				if (get(editor.hoveringObject) !== '') editor.hoveringObject.set('');
			}
		}

		let overlay = get(editor.overlay);
		if (get(editor.selectionDown)) if (overlay) computeSelectionBox(editor, broker, overlay);
	}
}

let selectionAdditional: ObjectID[] = [];

export const SelectTool = {
	icon: faArrowPointer,
	access: 'READ',
	key: 'select',
	shortcut: 's',
	onDown: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) =>
		selectDown(ev, editor, broker),
	onUp: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		selectUp(ev, editor, broker);
	},
	onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		selectMove(ev, editor, broker);
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
	overlay: MapProviderOverlay
): void {
	const start = get(editor.selectionStart);
	const end = get(editor.currentMousePosition);

	let startVec = broker.normalizeVector(overlay.lonLatToVector3(start[1], start[0]));
	let endVec = broker.normalizeVector(overlay.lonLatToVector3(end[1], end[0]));

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
		if (IGNORED_OBJECTS.includes(obj.type) || obj.pinned) continue;
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

		if (doesIntersect) {
			let top = ascendToRoot(editor, broker, obj.id);
			selection.push(top);
		}
	}

	if (selection.length > 1) {
		for (let i = selection.length - 1; i >= 0; i--) {
			let obj = broker.project.objectsMap.get(selection[i]);
			if (obj && obj.pinned) {
				selection.splice(i, 1);
			}
		}
	}
	editor.selection.set([...selectionAdditional, ...selection]);
	editor.computeEffectiveSelection(broker);
}

function computeSelectionCenter(editor: EditorContext, broker: ProjectBroker): [number, number] {}

export function getObjectAtCursor(
	editor: EditorContext,
	broker: ProjectBroker,
	cursor: [number, number],
	cursorScreen: [number, number],
	filterObjects?: (obj: Object2D) => boolean
): ObjectID | null {
	let topObject = null;
	let topZ = -Infinity;
	let quadObjects = broker.project.getObjectsInBounds({
		minX: cursor[0] - 0.0001,
		minY: cursor[1] - 0.0001,
		maxX: cursor[0] + 0.0001,
		maxY: cursor[1] + 0.0001
	});

	let map = get(editor.map);
	if (map) {
		let el = map.getDiv();
		let hoverables = el.querySelectorAll('[data-hoverable]');

		for (let h of hoverables) {
			let rect = h.getBoundingClientRect();
			if (
				cursorScreen[0] >= rect.left &&
				cursorScreen[0] <= rect.right &&
				cursorScreen[1] >= rect.top &&
				cursorScreen[1] <= rect.bottom
			) {
				h.classList.add('pointer-events-all');
				let el = document.elementFromPoint(cursorScreen[0], cursorScreen[1]);
				h.classList.remove('pointer-events-all');
				if (el === h) {
					return h.dataset.objectId;
				}
			}
		}
	}

	for (let obj of quadObjects) {
		if (!obj.flatShape) continue;
		if (filterObjects && !filterObjects(obj)) continue;
		for (let fl of obj.flatShape) {
			let [dist, seg] = distanceTo(fl, point(cursor[0], cursor[1]));
			if (dist < get(editor.screenScale)) {
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

export function ascendToRoot(editor: EditorContext, broker: ProjectBroker, id: ObjectID) {
	if (id) {
		let parentToHover = id;
		let rootGroup = get(editor.rootGroup);
		while (true) {
			let obj = broker.project.objectsMap.get(parentToHover);
			if (rootGroup === (obj?.parent ?? null)) {
				break;
			} else {
				if (obj?.parent) {
					parentToHover = obj.parent;
				} else {
					break;
				}
			}
		}

		id = parentToHover;
	}

	return id;
}
