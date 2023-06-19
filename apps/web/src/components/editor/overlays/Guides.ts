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

class GuideElement {
	line: THREE.Line;

	constructor(
		overlay: Overlay,
		color = '#1a64ac',
		opacity = 0.1,
		start: THREE.Vector3,
		end: THREE.Vector3
	) {
		let geo = new THREE.BufferGeometry().setFromPoints([start, end]);

		this.line = new THREE.Line(
			geo,
			new THREE.MeshBasicMaterial({
				color: color as THREE.ColorRepresentation,
				opacity: opacity,
				transparent: false
			})
		);

		overlay.overlay.getScene().add(this.line);
	}

	setVisible(visible: boolean): void {
		this.line.visible = visible;
	}

	destroy(): void {
		this.line.parent?.remove(this.line);
	}
}

export class GuidesOverlay extends Overlay {
	isDown: boolean = false;
	elements: GuideElement[] = [];

	init(): void {
		super.init();

		this.addUnsub(
			this.editor.guides.subscribe((down) => {
				this.refresh();
			})
		);
	}

	refresh(): void {
		for (let element of this.elements) {
			element.destroy();
		}
		let z = 0.2;
		this.elements = [];

		let guides = get(this.editor.guides);

		let grabSize = this.map.getZoom() ?? 1;
		grabSize = 21 - grabSize;

		grabSize = Math.max(1, grabSize);
		grabSize ** 2;
		grabSize /= 2;
		grabSize = get(this.editor.screenScale);

		for (let line of guides.lines) {
			let start = new THREE.Vector3(line[0][0], 0, line[0][1]);
			let end = new THREE.Vector3(line[1][0], 0, line[1][1]);

			this.elements.push(new GuideElement(this, '#ff0000', z, start, end));
		}

		let heading = get(this.editor.broker.watchCornerstone().heading);
		let mat = Flatten.matrix(1, 0, 0, 1, 0, 0);

		let pointDist = grabSize * 0.25;
		for (let point of guides.points) {
			let upPoint = Flatten.point(0, -pointDist).transform(mat).translate(point[0], point[1]);
			let downPoint = Flatten.point(0, pointDist).transform(mat).translate(point[0], point[1]);
			let leftPoint = Flatten.point(-pointDist, 0).transform(mat).translate(point[0], point[1]);
			let rightPoint = Flatten.point(+pointDist, 0).transform(mat).translate(point[0], point[1]);

			let topLeftPoint = Flatten.point(-pointDist, -pointDist)
				.transform(mat)
				.translate(point[0], point[1]);
			let topRightPoint = Flatten.point(+pointDist, -pointDist)
				.transform(mat)
				.translate(point[0], point[1]);
			let bottomLeftPoint = Flatten.point(-pointDist, +pointDist)
				.transform(mat)
				.translate(point[0], point[1]);
			let bottomRightPoint = Flatten.point(+pointDist, +pointDist)
				.transform(mat)
				.translate(point[0], point[1]);

			// this.elements.push(
			// 	new GuideElement(
			// 		this,
			// 		'#7c28a5',
			// 		0.9,
			// 		new THREE.Vector3(upPoint.x, 0, upPoint.y),
			// 		new THREE.Vector3(downPoint.x, 0, downPoint.y)
			// 	)
			// );
			// this.elements.push(
			// 	new GuideElement(
			// 		this,
			// 		'#7c28a5',
			// 		0.9,
			// 		new THREE.Vector3(leftPoint.x, 0, leftPoint.y),
			// 		new THREE.Vector3(rightPoint.x, 0, rightPoint.y)
			// 	)
			// );

			this.elements.push(
				new GuideElement(
					this,
					'#ff0000',
					1,
					new THREE.Vector3(topLeftPoint.x, z, topLeftPoint.y),
					new THREE.Vector3(bottomRightPoint.x, z, bottomRightPoint.y)
				)
			);

			this.elements.push(
				new GuideElement(
					this,
					'#ff0000',
					1,
					new THREE.Vector3(topRightPoint.x, z, topRightPoint.y),
					new THREE.Vector3(bottomLeftPoint.x, z, bottomLeftPoint.y)
				)
			);
		}

		this.overlay.requestRedraw();
	}
}
