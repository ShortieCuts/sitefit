import { getSvelteContext } from 'src/store/editor';
import { Overlay } from './Overlay';
import * as THREE from 'three';
import { get } from 'svelte/store';
import { makeRotationMatrix, multiplyMatrix, ObjectType, type Object2D, Path } from 'core';
import { createRenderObject, RendererOverlay, type RenderObject2D } from './Renderer';
import { Vector3 } from 'three';
import Flatten from '@flatten-js/core';
import { IGNORED_OBJECTS } from '../tools/select';
import { isMobile } from 'src/store/responsive';
const { Polygon, point, Circle: FlatCircle, arc, matrix, Box } = Flatten;

class OutlinedBox {
	box: THREE.Mesh;
	line: THREE.Line;

	constructor(
		overlay: Overlay,
		innerColor = '#1a64ac',
		innerOpacity = 0.1,
		outerColor = '#0c8ae5',
		outerOpacity = 1
	) {
		this.box = new THREE.Mesh(
			new THREE.BoxGeometry(1, 0.1, 1),
			new THREE.MeshBasicMaterial({
				color: innerColor as THREE.ColorRepresentation,
				opacity: innerOpacity,
				transparent: true,
				depthTest: false
			})
		);
		let geo = new THREE.BufferGeometry().setFromPoints([
			new THREE.Vector3(-0.5, 0, -0.5),
			new THREE.Vector3(-0.5, 0, 0.5),
			new THREE.Vector3(0.5, 0, 0.5),
			new THREE.Vector3(0.5, 0, -0.5),
			new THREE.Vector3(-0.5, 0, -0.5)
		]);

		this.line = new THREE.Line(
			geo,
			new THREE.MeshBasicMaterial({
				color: outerColor as THREE.ColorRepresentation,
				opacity: outerOpacity,
				transparent: false
			})
		);

		const scene = overlay.overlay.getScene();
		scene.add(this.box);
		scene.add(this.line);
	}

	setVisible(visible: boolean): void {
		this.box.visible = visible;
		this.line.visible = visible;
	}

	setPosition(pos: THREE.Vector3): void {
		this.box.position.copy(pos);
		let p2 = pos.clone();

		p2.y = pos.y + 0.09;
		this.line.position.copy(p2);
	}

	setScale(max: THREE.Vector3): void {
		this.box.scale.copy(max);
		this.line.scale.copy(max);
	}

	setRotation(rot: number): void {
		this.box.rotation.y = rot;
		this.line.rotation.y = rot;
	}
}

class SelectionBox {
	main: OutlinedBox;
	topLeft: OutlinedBox;
	topRight: OutlinedBox;
	bottomLeft: OutlinedBox;
	bottomRight: OutlinedBox;
	topMid: OutlinedBox;
	overlay: Overlay;

	constructor(overlay: Overlay) {
		this.overlay = overlay;
		let grabInnerColor = '#fff';
		let grabInnerOpacity = 1;
		let grabOuterColor = '#1a64ac';
		let grabOuterOpacity = 1;

		let mainInnerColor = '#fff';
		let mainInnerOpacity = 0;
		let mainOuterColor = '#0c8ae5';
		let mainOuterOpacity = 1;

		this.main = new OutlinedBox(
			overlay,
			mainInnerColor,
			mainInnerOpacity,
			mainOuterColor,
			mainOuterOpacity
		);

		this.topMid = new OutlinedBox(
			overlay,
			grabInnerColor,
			grabInnerOpacity,
			grabOuterColor,
			grabOuterOpacity
		);

		this.topLeft = new OutlinedBox(
			overlay,
			grabInnerColor,
			grabInnerOpacity,
			grabOuterColor,
			grabOuterOpacity
		);
		this.topRight = new OutlinedBox(
			overlay,
			grabInnerColor,
			grabInnerOpacity,
			grabOuterColor,
			grabOuterOpacity
		);
		this.bottomLeft = new OutlinedBox(
			overlay,
			grabInnerColor,
			grabInnerOpacity,
			grabOuterColor,
			grabOuterOpacity
		);
		this.bottomRight = new OutlinedBox(
			overlay,
			grabInnerColor,
			grabInnerOpacity,
			grabOuterColor,
			grabOuterOpacity
		);
	}

	setVisible(visible: boolean, showHandles = true): void {
		this.main.setVisible(visible);
		if (!showHandles) {
			visible = false;
		}
		this.topLeft.setVisible(visible);
		this.topRight.setVisible(visible);
		this.bottomLeft.setVisible(visible);
		this.bottomRight.setVisible(visible);
		this.topMid.setVisible(visible);
	}

	updateSize() {
		let grabSize = this.overlay.map.getZoom() ?? 1;
		grabSize = 21 - grabSize;

		grabSize = Math.max(1, grabSize);
		grabSize ** 2;
		grabSize /= 2;
		grabSize = get(this.overlay.editor.screenScale);
		this.topLeft.setScale(new THREE.Vector3(grabSize, 1, grabSize));
		this.topRight.setScale(new THREE.Vector3(grabSize, 1, grabSize));
		this.bottomLeft.setScale(new THREE.Vector3(grabSize, 1, grabSize));
		this.bottomRight.setScale(new THREE.Vector3(grabSize, 1, grabSize));
		this.topMid.setScale(new THREE.Vector3(grabSize * 2, 1, grabSize));
		this.overlay.overlay.requestRedraw();
	}

	setPositionAndScale(pos: THREE.Vector3, scale: THREE.Vector3): void {
		this.main.setPosition(pos);
		this.main.setScale(scale);

		let rotation = this.main.box.rotation.y;

		let matrix = makeRotationMatrix(-rotation);
		let topMidPos = multiplyMatrix([0, -scale.z / 2], matrix);
		let topLeftPos = multiplyMatrix([-scale.x / 2, scale.z / 2], matrix);
		let topRightPos = multiplyMatrix([scale.x / 2, scale.z / 2], matrix);
		let bottomLeftPos = multiplyMatrix([-scale.x / 2, -scale.z / 2], matrix);
		let bottomRightPos = multiplyMatrix([scale.x / 2, -scale.z / 2], matrix);

		this.topMid.setPosition(
			new THREE.Vector3(pos.x + topMidPos[0], pos.y + 0.1, pos.z + topMidPos[1])
		);

		this.topLeft.setPosition(
			new THREE.Vector3(pos.x + topLeftPos[0], pos.y + 0.1, pos.z + topLeftPos[1])
		);
		this.topRight.setPosition(
			new THREE.Vector3(pos.x + topRightPos[0], pos.y + 0.1, pos.z + topRightPos[1])
		);
		this.bottomLeft.setPosition(
			new THREE.Vector3(pos.x + bottomLeftPos[0], pos.y + 0.1, pos.z + bottomLeftPos[1])
		);
		this.bottomRight.setPosition(
			new THREE.Vector3(pos.x + bottomRightPos[0], pos.y + 0.1, pos.z + bottomRightPos[1])
		);

		this.updateSize();
	}

	setRotation(rotation: number): void {
		this.main.setRotation(rotation);
		this.topLeft.setRotation(rotation);
		this.topRight.setRotation(rotation);
		this.bottomLeft.setRotation(rotation);
		this.bottomRight.setRotation(rotation);
		this.topMid.setRotation(rotation);
	}
}

class OutlinedGeometry {
	obj: RenderObject2D;

	constructor(overlay: RendererOverlay, source: Object2D) {
		this.obj = createRenderObject(overlay, source);
		this.obj.setMaterial(
			new THREE.LineBasicMaterial({
				color: '#0c8ce9',
				opacity: 1,
				linewidth: 1,
				transparent: true,
				depthTest: false
			})
		);
		this.obj.refresh(overlay, source);
		this.obj.translate(new Vector3(0, 0, 0));

		overlay.overlay.requestRedraw();
	}

	destroy(overlay: RendererOverlay): void {
		this.obj?.destroy(overlay);
		overlay.overlay.requestRedraw();
	}
}

export class SelectionOverlay extends Overlay {
	isDown: boolean = false;
	box: OutlinedBox | null = null;
	selectionBox: SelectionBox | null = null;

	init(): void {
		super.init();

		this.addUnsub(
			this.editor.selectionDown.subscribe((down) => {
				this.isDown = down;
				this.refresh();
			})
		);

		this.addUnsub(
			this.editor.currentMousePosition.subscribe(() => {
				this.refresh();
			})
		);

		this.addUnsub(
			this.editor.effectiveSelection.subscribe(() => {
				this.refresh();
			})
		);
		this.addUnsub(
			this.editor.activeTool.subscribe(() => {
				this.refresh();
			})
		);
		this.addUnsub(
			this.editor.translating.subscribe(() => {
				this.refresh();
			})
		);
		this.addUnsub(
			this.broker.sessionAccess.subscribe(() => {
				this.refresh();
			})
		);

		this.addUnsub(
			this.broker.needsRender.subscribe((newVal) => {
				if (newVal) {
					this.refresh();
				}
			})
		);
		this.addUnsub(
			this.editor.screenScale.subscribe((newVal) => {
				this.selectionBox?.updateSize();
			})
		);

		let remove = this.map.onZoom((a) => {
			this.selectionBox?.updateSize();
		});
		this.addUnsub(remove);

		this.box = new OutlinedBox(this);
		this.selectionBox = new SelectionBox(this);
	}

	refresh(): void {
		let access = get(this.broker.sessionAccess);
		if (!this.box || !this.selectionBox) {
			return;
		}

		if (this.isDown) {
			const start = get(this.editor.selectionStart);
			const end = get(this.editor.currentMousePosition);

			let startVec = this.broker.normalizeVector(this.overlay.lonLatToVector3(start[1], start[0]));
			let endVec = this.broker.normalizeVector(this.overlay.lonLatToVector3(end[1], end[0]));

			let center = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];

			this.box.setPosition(
				this.broker.normalizeVector(this.overlay.lonLatToVector3(center[1], center[0]))
			);

			this.box.setScale(
				new THREE.Vector3(
					Math.abs(startVec.x - endVec.x),
					Math.abs(1),
					Math.abs(startVec.z - endVec.z)
				)
			);

			this.box.setVisible(true);
		} else {
			this.box.setVisible(false);
		}

		let globalShouldHandlesBeVisible =
			(access == 'WRITE' &&
				!get(isMobile) &&
				!get(this.editor.editingObject) &&
				get(this.editor.activeTool) == 'select') ||
			get(this.editor.activeTool) == 'pan';

		let sels = get(this.editor.effectiveSelection);
		if (sels.length > 0) {
			let objs = [];
			for (let id of sels) {
				let obj = this.broker.project.objectsMap.get(id);
				if (obj) objs.push(obj);
			}

			let box = computeBounds(objs);
			if (box.height > 0 || box.width > 0) {
				let startVec = [box.low.x, box.low.y];
				let endVec = [box.high.x, box.high.y];

				if (objs.length == 1) {
					let angle = objs[0].transform.rotation;
					let ox = objs[0].transform.position[0];
					let oy = objs[0].transform.position[1];

					this.selectionBox.setRotation(-angle);

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

					let width = newBox.width;
					let height = newBox.height;
					let center = [newBox.low.x + width / 2, newBox.low.y + height / 2];

					this.selectionBox.setPositionAndScale(
						new Vector3(center[0], 0, center[1]),
						new THREE.Vector3(Math.abs(width), Math.abs(1), Math.abs(height))
					);
				} else {
					this.selectionBox.setRotation(0);

					let center = [(startVec[0] + endVec[0]) / 2, (startVec[1] + endVec[1]) / 2];

					this.selectionBox.setPositionAndScale(
						new Vector3(center[0], 0, center[1]),
						new THREE.Vector3(
							Math.abs(startVec[0] - endVec[0]),
							Math.abs(1),
							Math.abs(startVec[1] - endVec[1])
						)
					);
				}

				this.selectionBox.setVisible(true, globalShouldHandlesBeVisible);

				if (objs.length == 1 && objs[0].type == ObjectType.Path) {
					let path = objs[0] as Path;
					if (path.segments.length == 2 && !path.smartObject) {
						this.selectionBox.main.line.visible = false;
						// This is a line, let's just show 2 handles
						if (path.flatShape && path.flatShape.length == 1) {
							this.selectionBox.topRight.setVisible(false);
							this.selectionBox.bottomLeft.setVisible(false);
							this.selectionBox.topLeft.setVisible(false);
							this.selectionBox.bottomRight.setVisible(false);
							let rawPath = path.flatShape[0] as Flatten.Segment;
							let closeMatch = (a: Flatten.Point, b: THREE.Vector3) => {
								let threshold = 0.1;
								return Math.abs(a.x - b.x) < threshold && Math.abs(a.y - b.z) < threshold;
							};
							if (
								closeMatch(rawPath.start, this.selectionBox.bottomLeft.box.position) ||
								closeMatch(rawPath.end, this.selectionBox.bottomLeft.box.position)
							) {
								this.selectionBox.bottomLeft.setVisible(true);
							}

							if (
								closeMatch(rawPath.start, this.selectionBox.bottomRight.box.position) ||
								closeMatch(rawPath.end, this.selectionBox.bottomRight.box.position)
							) {
								this.selectionBox.bottomRight.setVisible(true);
							}

							if (
								closeMatch(rawPath.start, this.selectionBox.topLeft.box.position) ||
								closeMatch(rawPath.end, this.selectionBox.topLeft.box.position)
							) {
								this.selectionBox.topLeft.setVisible(true);
							}

							if (
								closeMatch(rawPath.start, this.selectionBox.topRight.box.position) ||
								closeMatch(rawPath.end, this.selectionBox.topRight.box.position)
							) {
								this.selectionBox.topRight.setVisible(true);
							}
						}
					}
				}
			} else {
				this.selectionBox?.setVisible(false, globalShouldHandlesBeVisible);
			}
		} else {
			this.selectionBox?.setVisible(false, globalShouldHandlesBeVisible);
		}

		if (get(this.editor.translating) || get(this.editor.editingObject)) {
			this.selectionBox?.setVisible(false, globalShouldHandlesBeVisible);
		}

		this.overlay.requestRedraw();
	}
}

export function computeBounds(objects: Object2D[]): Flatten.Box {
	let box: Flatten.Box | null = null;

	for (let obj of objects) {
		if (IGNORED_OBJECTS.includes(obj.type)) continue;

		if (obj.flatShape) {
			for (let fl of obj.flatShape) {
				if (fl instanceof Flatten.Box) {
					if (!box) box = fl.clone();
					else box = box.merge(fl);
				} else {
					if (fl.box) {
						let bounds = fl.box;
						if (bounds) {
							if (!box) box = bounds.clone();
							else box = box.merge(bounds);
						}
					}
				}
			}
		}
	}

	return box || new Flatten.Box(0, 0, 0, 0);
}
