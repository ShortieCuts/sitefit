import { getSvelteContext } from 'src/store/editor';
import { Overlay } from './Overlay';
import * as THREE from 'three';
import { get } from 'svelte/store';
import { Path, type Object2D } from 'core';
import { Vector3 } from 'three';

interface RenderObject2D {
	refresh(overlay: Overlay, obj: Object2D): void;
	destroy(overlay: Overlay): void;
}

class RenderPath implements RenderObject2D {
	line: THREE.Line;

	constructor(overlay: Overlay) {
		let geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(100 * 3), 3));

		geo.setDrawRange(0, 0);

		this.line = new THREE.Line(
			geo,
			new THREE.MeshBasicMaterial({ color: '#0c8ae5', opacity: 1, transparent: false })
		);

		overlay.overlay.scene.add(this.line);
	}

	refresh(overlay: Overlay, obj: Path): void {
		let arr = (this.line.geometry.attributes.position as any).array as Float32Array;
		console.log(this.line.geometry.attributes.position);

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
	}

	destroy(overlay: Overlay): void {
		overlay.overlay.scene.remove(this.line);
		this.line.geometry.dispose();
	}
}

function createRenderObject(overlay: Overlay, obj: Object2D): RenderObject2D {
	if (obj instanceof Path) {
		return new RenderPath(overlay);
	}

	throw new Error('Unsupported object type');
}

export class RendererOverlay extends Overlay {
	isDown: boolean = false;
	stagedObject: RenderObject2D | null = null;

	init(): void {
		super.init();

		this.addUnsub(
			this.broker.stagingObject.subscribe((newVal) => {
				console.log('staging object changed', newVal);
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

	refresh(): void {}
}
