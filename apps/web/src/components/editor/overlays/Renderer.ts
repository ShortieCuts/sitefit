import { getSvelteContext } from 'src/store/editor';
import { Overlay } from './Overlay';
import * as THREE from 'three';
import { get } from 'svelte/store';
import { Path, type Object2D, type ObjectID } from 'core';
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

class RenderPath implements RenderObject2D {
	line: THREE.Line;

	constructor(overlay: Overlay) {
		let geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(100 * 3), 3));

		geo.setDrawRange(0, 0);

		this.line = new THREE.Line(
			geo,
			new THREE.MeshBasicMaterial({ color: '#fff', opacity: 1, transparent: false })
		);

		overlay.overlay.scene.add(this.line);
	}

	refresh(overlay: Overlay, obj: Path): void {
		let arr = (this.line.geometry.attributes.position as any).array as Float32Array;

		let i = 0;
		for (let p of obj.segments) {
			arr[i++] = p[0];
			arr[i++] = 0;
			arr[i++] = p[1];
		}

		this.line.geometry.setDrawRange(0, obj.segments.length);

		this.line.geometry.attributes.position.needsUpdate = true;

		this.line.geometry.computeBoundingSphere();
		this.line.geometry.computeBoundingBox();

		this.line.position.setX(obj.transform.position[0]);
		this.line.position.setZ(obj.transform.position[1]);
		this.line.scale.setX(obj.transform.size[0]);
		this.line.scale.setZ(obj.transform.size[1]);

		this.line.setRotationFromEuler(new THREE.Euler(0, -obj.transform.rotation, 0));
	}

	setMaterial(mat: THREE.Material): void {
		this.line.material = mat;
		this.line.material.needsUpdate = true;
	}

	translate(delta: Vector3): void {
		this.line.position.add(delta);
	}

	destroy(overlay: Overlay): void {
		overlay.overlay.scene.remove(this.line);
		this.line.geometry.dispose();
	}
}

export function createRenderObject(overlay: Overlay, obj: Object2D): RenderObject2D {
	if (obj instanceof Path) {
		return new RenderPath(overlay);
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
