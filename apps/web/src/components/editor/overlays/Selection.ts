import { getSvelteContext } from 'src/store/editor';
import { Overlay } from './Overlay';
import * as THREE from 'three';
import { get } from 'svelte/store';

class OutlinedBox {
	box: THREE.Mesh;
	line: THREE.Line;

	constructor(overlay: Overlay) {
		this.box = new THREE.Mesh(
			new THREE.BoxGeometry(1, 0.1, 1),
			new THREE.MeshBasicMaterial({ color: '#1a64ac', opacity: 0.1, transparent: true })
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
			new THREE.MeshBasicMaterial({ color: '#0c8ae5', opacity: 1, transparent: false })
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

export class SelectionOverlay extends Overlay {
	isDown: boolean = false;
	box: OutlinedBox | null = null;

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

		this.box = new OutlinedBox(this);
	}

	refresh(): void {
		if (!this.box) {
			return;
		}

		if (this.isDown) {
			const start = get(this.editor.selectionStart);
			const end = get(this.editor.currentMousePosition);

			let startVec = this.overlay.latLngAltitudeToVector3({ lat: start[0], lng: start[1] });
			let endVec = this.overlay.latLngAltitudeToVector3({ lat: end[0], lng: end[1] });

			let center = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];

			this.box.setPosition(
				this.overlay.latLngAltitudeToVector3({ lat: center[0], lng: center[1] })
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
			console.log('hiding box');
			this.box.setVisible(false);
		}

		this.overlay.requestRedraw();
	}
}
