import { getSvelteContext } from 'src/store/editor';
import { Overlay } from './Overlay';
import * as THREE from 'three';
import { get } from 'svelte/store';
import type { Object2D } from 'core';
import { createRenderObject, type RenderObject2D } from './Renderer';
import { Vector3 } from 'three';
import Flatten from '@flatten-js/core';
import { IGNORED_OBJECTS } from '../tools/select';
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
				transparent: true
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

		overlay.overlay.scene.add(this.box);
		overlay.overlay.scene.add(this.line);
	}

	setVisible(visible: boolean): void {
		this.box.visible = visible;
		this.line.visible = visible;
	}

	setPosition(pos: THREE.Vector3): void {
		this.box.position.copy(pos);
		this.line.position.copy(pos);
	}

	setScale(max: THREE.Vector3): void {
		this.box.scale.copy(max);
		this.line.scale.copy(max);
	}
}

class SelectionBox {
	main: OutlinedBox;
	topLeft: OutlinedBox;
	topRight: OutlinedBox;
	bottomLeft: OutlinedBox;
	bottomRight: OutlinedBox;
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

	setVisible(visible: boolean): void {
		this.main.setVisible(visible);
		this.topLeft.setVisible(visible);
		this.topRight.setVisible(visible);
		this.bottomLeft.setVisible(visible);
		this.bottomRight.setVisible(visible);
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
		this.overlay.overlay.requestRedraw();
	}

	setPositionAndScale(pos: THREE.Vector3, scale: THREE.Vector3): void {
		this.main.setPosition(pos);
		this.main.setScale(scale);

		this.topLeft.setPosition(new THREE.Vector3(pos.x - scale.x / 2, pos.y, pos.z + scale.z / 2));

		this.topRight.setPosition(new THREE.Vector3(pos.x + scale.x / 2, pos.y, pos.z + scale.z / 2));

		this.bottomLeft.setPosition(new THREE.Vector3(pos.x - scale.x / 2, pos.y, pos.z - scale.z / 2));

		this.bottomRight.setPosition(
			new THREE.Vector3(pos.x + scale.x / 2, pos.y, pos.z - scale.z / 2)
		);

		this.updateSize();
	}
}

class OutlinedGeometry {
	obj: RenderObject2D;

	constructor(overlay: Overlay, source: Object2D) {
		this.obj = createRenderObject(overlay, source);
		this.obj.setMaterial(
			new THREE.LineBasicMaterial({
				color: '#0c8ce9',
				opacity: 1,
				linewidth: 1,
				transparent: false,
				depthTest: false
			})
		);
		this.obj.refresh(overlay, source);
		this.obj.translate(new Vector3(0, 0, 0));

		overlay.overlay.requestRedraw();
	}

	destroy(overlay: Overlay): void {
		this.obj?.destroy(overlay);
		overlay.overlay.requestRedraw();
	}
}

export class SelectionOverlay extends Overlay {
	isDown: boolean = false;
	box: OutlinedBox | null = null;
	selectionBox: SelectionBox | null = null;
	hover: OutlinedGeometry | null = null;

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
			this.editor.hoveringObject.subscribe((val) => {
				this.refreshHover();
			})
		);

		this.addUnsub(
			this.broker.needsRender.subscribe((newVal) => {
				if (newVal) {
					this.refreshHover();
					this.refresh();
				}
			})
		);
		let remove = this.map.addListener('zoom_changed', () => {
			this.selectionBox?.updateSize();
		}).remove;
		this.addUnsub(remove);

		this.box = new OutlinedBox(this);
		this.selectionBox = new SelectionBox(this);
	}

	refreshHover() {
		if (this.hover) {
			this.hover.destroy(this);
			this.hover = null;
		}

		let val = get(this.editor.hoveringObject);

		if (val) {
			let objMap = this.broker.project.objectsMap.get(val);
			if (objMap) this.hover = new OutlinedGeometry(this, objMap);
		}
	}

	refresh(): void {
		if (!this.box || !this.selectionBox) {
			return;
		}

		if (this.isDown) {
			const start = get(this.editor.selectionStart);
			const end = get(this.editor.currentMousePosition);

			let startVec = this.broker.normalizeVector(
				this.overlay.latLngAltitudeToVector3({ lat: start[0], lng: start[1] })
			);
			let endVec = this.broker.normalizeVector(
				this.overlay.latLngAltitudeToVector3({ lat: end[0], lng: end[1] })
			);

			let center = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];

			this.box.setPosition(
				this.broker.normalizeVector(
					this.overlay.latLngAltitudeToVector3({ lat: center[0], lng: center[1] })
				)
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

				let center = [(startVec[0] + endVec[0]) / 2, (startVec[1] + endVec[1]) / 2];

				this.selectionBox.setPositionAndScale(
					new Vector3(center[0], 0, center[1]),
					new THREE.Vector3(
						Math.abs(startVec[0] - endVec[0]),
						Math.abs(1),
						Math.abs(startVec[1] - endVec[1])
					)
				);

				this.selectionBox.setVisible(true);
			} else {
				this.selectionBox?.setVisible(false);
			}
		} else {
			this.selectionBox?.setVisible(false);
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
