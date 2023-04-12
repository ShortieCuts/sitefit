import { getSvelteContext } from 'src/store/editor';
import { Overlay } from './Overlay';
import * as THREE from 'three';
import { get } from 'svelte/store';
import { Group, Path, type Object2D, type ObjectID } from 'core';
import type { Vector3 } from 'three';

export interface RenderObject2D {
	refresh(overlay: Overlay, obj: Object2D): void;
	destroy(overlay: Overlay): void;
	setMaterial(mat: THREE.Material): void;
	translate(delta: Vector3): void;
}

function randomColorHEX() {
	let letters = '0123456789ABCDEF';
	let color = '#';
	for (let i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}
function colorArrayToThreeColor(arr: [number, number, number, number]): THREE.Color {
	return new THREE.Color(arr[0], arr[1], arr[2]);
}

class RenderPath implements RenderObject2D {
	line: THREE.Line;
	filled: THREE.Mesh;

	constructor(overlay: Overlay) {
		let geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(100 * 3), 3));

		geo.setDrawRange(0, 0);

		let geo2 = new THREE.ShapeGeometry(new THREE.Shape());

		this.line = new THREE.Line(
			geo,
			new THREE.MeshBasicMaterial({ color: '#ff0000', opacity: 1, transparent: false })
		);

		this.filled = new THREE.Mesh(
			geo2,
			new THREE.MeshBasicMaterial({ color: '#ff0000', side: THREE.DoubleSide })
		);

		overlay.overlay.scene.add(this.line);
		overlay.overlay.scene.add(this.filled);
	}

	refresh(overlay: Overlay, obj: Path): void {
		let mat = this.line.material as THREE.MeshBasicMaterial;
		let mat2 = this.filled.material as THREE.MeshBasicMaterial;
		if (obj.style && obj.style.color) {
			mat.color.set(colorArrayToThreeColor(obj.style.color));
			mat2.color.set(colorArrayToThreeColor(obj.style.color));

			mat.transparent = obj.style.color[3] < 1;
			mat.opacity = obj.style.color[3];
			mat2.transparent = obj.style.color[3] < 1;
			mat2.opacity = obj.style.color[3];
		}

		let arr = (this.line.geometry.attributes.position as any).array as Float32Array;

		let i = 0;
		for (let p of obj.segments) {
			arr[i++] = p[0];
			arr[i++] = 0;
			arr[i++] = p[1];
		}

		if (obj.closed) {
			arr[i++] = obj.segments[0][0];
			arr[i++] = 0;
			arr[i++] = obj.segments[0][1];
		}

		this.line.geometry.setDrawRange(0, obj.segments.length + (obj.closed ? 1 : 0));

		this.line.geometry.attributes.position.needsUpdate = true;

		this.line.geometry.computeBoundingSphere();
		this.line.geometry.computeBoundingBox();

		this.line.position.setX(obj.transform.position[0]);
		this.line.position.setZ(obj.transform.position[1]);
		this.line.scale.setX(obj.transform.size[0]);
		this.line.scale.setZ(obj.transform.size[1]);

		this.line.setRotationFromEuler(new THREE.Euler(0, -obj.transform.rotation, 0));

		if (obj.style && obj.style.filled) {
			this.line.visible = false;
			let shape = new THREE.Shape();

			shape.moveTo(obj.segments[0][0], obj.segments[0][1]);

			for (let i = 1; i < obj.segments.length; i++) {
				shape.lineTo(obj.segments[i][0], obj.segments[i][1]);
			}

			if (obj.closed) {
				shape.lineTo(obj.segments[0][0], obj.segments[0][1]);
			}

			this.filled.geometry.dispose();

			let geo = new THREE.ShapeGeometry(shape);
			geo.rotateX(Math.PI * 0.5);
			this.filled.geometry = geo;

			this.filled.position.setX(obj.transform.position[0]);
			this.filled.position.setZ(obj.transform.position[1]);
			this.filled.scale.setX(obj.transform.size[0]);
			this.filled.scale.setZ(obj.transform.size[1]);

			this.filled.setRotationFromEuler(new THREE.Euler(0, -obj.transform.rotation, 0));
		}
	}

	setMaterial(mat: THREE.Material): void {
		this.line.material = mat;
		this.line.material.needsUpdate = true;

		this.filled.material = mat;
		this.filled.material.needsUpdate = true;
	}

	translate(delta: Vector3): void {
		this.line.position.add(delta);

		this.filled.position.add(delta);
	}

	destroy(overlay: Overlay): void {
		overlay.overlay.scene.remove(this.line);
		this.line.geometry.dispose();

		overlay.overlay.scene.remove(this.filled);
		this.filled.geometry.dispose();
	}
}

class RenderGroup implements RenderObject2D {
	constructor(overlay: Overlay) {}

	refresh(overlay: Overlay, obj: Group): void {}

	setMaterial(mat: THREE.Material): void {}

	translate(delta: Vector3): void {}

	destroy(overlay: Overlay): void {}
}

export function createRenderObject(overlay: Overlay, obj: Object2D): RenderObject2D {
	if (obj instanceof Path) {
		return new RenderPath(overlay);
	} else if (obj instanceof Group) {
		return new RenderGroup(overlay);
	}

	throw new Error('Unsupported object type');
}

export class RendererOverlay extends Overlay {
	isDown: boolean = false;
	stagedObject: RenderObject2D | null = null;

	renderedObjects: Map<ObjectID, RenderObject2D> = new Map();

	init(): void {
		super.init();

		this.addUnsub(
			this.broker.stagingObject.subscribe((newVal) => {
				if (!newVal) {
					this.stagedObject?.destroy(this);
					this.stagedObject = null;
					this.overlay.requestRedraw();
				} else {
					this.stagedObject?.destroy(this);
					this.stagedObject = createRenderObject(this, newVal);
					this.stagedObject.refresh(this, newVal);
					this.overlay.requestRedraw();
				}
			})
		);

		this.addUnsub(
			this.broker.needsRender.subscribe((newVal) => {
				if (newVal) {
					let dirty = this.broker.rendererDirtyObjects;

					for (let obj of dirty) {
						let doesExist = this.broker.project.objectsMap.has(obj);
						if (doesExist) {
							let renderObj = this.renderedObjects.get(obj);
							if (!renderObj) {
								renderObj = createRenderObject(this, this.broker.project.objectsMap.get(obj)!);
								this.renderedObjects.set(obj, renderObj);
							}

							renderObj.refresh(this, this.broker.project.objectsMap.get(obj)!);
						} else {
							if (this.renderedObjects.has(obj)) {
								this.destroyObject(obj);
							}
						}
					}

					dirty.clear();

					this.broker.needsRender.set(false);

					this.overlay.requestRedraw();
				}
			})
		);

		let geo = new THREE.BufferGeometry().setFromPoints([
			new THREE.Vector3(-0.5, 0, -0.5),
			new THREE.Vector3(-0.5, 0, 0.5)
		]);
		let line = new THREE.Line(
			geo,
			new THREE.MeshBasicMaterial({ color: '#0c8ae5', opacity: 1, transparent: false })
		);

		this.overlay.scene.add(line);
	}

	destroyObject(id: ObjectID) {
		let obj = this.renderedObjects.get(id);
		if (obj) {
			obj.destroy(this);
			this.renderedObjects.delete(id);
		}
	}

	refresh(): void {}
}
