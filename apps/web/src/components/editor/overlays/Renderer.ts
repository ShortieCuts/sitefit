import { getSvelteContext } from 'src/store/editor';
import { Overlay } from './Overlay';
import * as THREE from 'three';
import { get } from 'svelte/store';
import { Arc, Circle, Cornerstone, Group, Path, Text, type Object2D, type ObjectID } from 'core';
import type { Vector3 } from 'three';

const ACTIVE_COLOR = '#0c8ae5';

export interface RenderObject2D {
	active: boolean;
	refresh(overlay: Overlay, obj: Object2D): void;
	destroy(overlay: Overlay): void;
	setMaterial(mat: THREE.Material): void;
	translate(delta: Vector3): void;

	mapUpdate?(overlay: Overlay, obj: Object2D): void;
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
	active: boolean = false;
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

			if (this.active) {
				mat.color.set(ACTIVE_COLOR);
			}
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

class RenderArc implements RenderObject2D {
	active: boolean = false;
	line: THREE.Line;

	constructor(overlay: Overlay) {
		this.line = new THREE.Line(
			new THREE.BufferGeometry(),
			new THREE.MeshBasicMaterial({ color: '#ff0000', opacity: 1, transparent: false })
		);

		overlay.overlay.scene.add(this.line);
	}

	refresh(overlay: Overlay, obj: Arc | Circle): void {
		let startAngle = 0;
		let endAngle = Math.PI * 2;
		if (obj instanceof Arc) {
			startAngle = obj.startAngle;
			endAngle = obj.endAngle;
		}

		let mat = this.line.material as THREE.MeshBasicMaterial;

		if (obj.style && obj.style.color) {
			mat.color.set(colorArrayToThreeColor(obj.style.color));

			mat.transparent = obj.style.color[3] < 1;
			mat.opacity = obj.style.color[3];

			if (this.active) {
				mat.color.set(ACTIVE_COLOR);
			}
		}

		const curve = new THREE.EllipseCurve(
			0,
			0,
			obj.radius,
			obj.radius,
			startAngle,
			endAngle,
			false,
			0
		);
		const points = curve.getPoints(50);
		const geometry = new THREE.BufferGeometry().setFromPoints(
			points.map((p) => new THREE.Vector3(p.y, 0, p.x))
		);

		this.line.geometry.dispose();
		this.line.geometry = geometry;

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

class RenderGroup implements RenderObject2D {
	active: boolean = false;
	constructor(overlay: Overlay) {}

	refresh(overlay: Overlay, obj: Group): void {}

	setMaterial(mat: THREE.Material): void {}

	translate(delta: Vector3): void {}

	destroy(overlay: Overlay): void {}
}

class RenderCornerstone implements RenderObject2D {
	active: boolean = false;
	constructor(overlay: Overlay) {}

	refresh(overlay: Overlay, obj: Group): void {}

	setMaterial(mat: THREE.Material): void {}

	translate(delta: Vector3): void {}

	destroy(overlay: Overlay): void {}
}

function colorArrayToCss(color: number[]): string {
	return `rgba(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255}, ${color[3]})`;
}

class RenderText implements RenderObject2D {
	active: boolean = false;
	el: HTMLDivElement;
	constructor(overlay: Overlay) {
		this.el = document.createElement('div');
		this.el.style.position = 'absolute';
		this.el.style.top = '0';
		this.el.style.left = '0';
		this.el.style.fontFamily = 'sans-serif';
		this.el.style.fontSize = '12px';
		this.el.style.fontWeight = 'bold';
		this.el.style.pointerEvents = 'none';
		this.el.style.transformOrigin = 'top left';
		this.el.style.fontFamily = 'monospace';
		this.el.style.lineHeight = '1em';

		overlay.map.getDiv().appendChild(this.el);
	}

	refresh(overlay: RendererOverlay, obj: Text): void {
		this.el.innerText = obj.text;

		this.mapUpdate(overlay, obj);
		if (this.active) {
			this.el.style.textShadow = `1px 0 1px ${ACTIVE_COLOR}, -1px 0 1px ${ACTIVE_COLOR}, 0px 1px 1px ${ACTIVE_COLOR}, 0 -1px 1px ${ACTIVE_COLOR}`;
		} else {
			this.el.style.textShadow = `none`;
		}
	}

	setMaterial(mat: THREE.Material): void {}

	translate(delta: Vector3): void {}

	destroy(overlay: Overlay): void {
		this.el.remove();
	}

	mapUpdate(overlay: RendererOverlay, obj: Text): void {
		const map = overlay.overlay.getMap();
		if (!map) return;
		let p = overlay.editor.positionToLonLat(obj.transform.position[0], obj.transform.position[1]);
		let p2 = overlay.editor.positionToLonLat(
			obj.transform.position[0] + obj.size,
			obj.transform.position[1]
		);

		let proj = overlay.overlayView.getProjection();
		if (!proj) return;
		let pos = proj.fromLatLngToContainerPixel(new google.maps.LatLng(p[1], p[0]));
		let pos2 = proj.fromLatLngToContainerPixel(new google.maps.LatLng(p2[1], p2[0]));
		if (!pos || !pos2) return;

		let screenSize = Math.sqrt(Math.pow(pos2.x - pos.x, 2) + Math.pow(pos2.y - pos.y, 2));
		let inViewport =
			pos.x + obj.text.length * screenSize * 0.5498070069642946 > 0 &&
			pos.y + screenSize > 0 &&
			pos.x < window.innerWidth &&
			pos.y < window.innerHeight;

		if (inViewport) {
			this.el.style.color = colorArrayToCss(obj.style.color);
			this.el.style.fontSize = `${screenSize}px`;
			this.el.style.width = `${screenSize * obj.text.length * 0.5498070069642946}px`;
			this.el.style.top = pos.y + 'px';
			this.el.style.left = pos.x + 'px';
			let trans = `rotate(${
				obj.transform.rotation * (180 / Math.PI) +
				(map.getHeading() ?? 0) * -1 +
				(overlay.heading ?? 0)
			}deg)`;

			if (this.el.style.transform != trans) {
				this.el.style.transform = trans;
			}
			this.el.style.display = 'block';
		} else {
			this.el.style.display = 'none';
		}
	}
}

export function createRenderObject(overlay: Overlay, obj: Object2D): RenderObject2D {
	if (obj instanceof Path) {
		return new RenderPath(overlay);
	} else if (obj instanceof Group) {
		return new RenderGroup(overlay);
	} else if (obj instanceof Arc || obj instanceof Circle) {
		return new RenderArc(overlay);
	} else if (obj instanceof Cornerstone) {
		return new RenderCornerstone(overlay);
	} else if (obj instanceof Text) {
		return new RenderText(overlay);
	} else {
		console.error('Unsupported object type', obj);
		return new RenderPath(overlay);
	}
}

export class RendererOverlay extends Overlay {
	isDown: boolean = false;
	heading: number = 0;
	stagedObject: RenderObject2D | null = null;

	renderedObjects: Map<ObjectID, RenderObject2D> = new Map();

	init(): void {
		super.init();

		const isChildOf = (parent: ObjectID, child: ObjectID): boolean => {
			while (true) {
				let obj = this.broker.project.objectsMap.get(child);
				if (!obj) return false;
				if (obj.parent === parent) return true;
				if (!obj.parent) return false;
				child = obj.parent;
			}
		};

		const refreshActive = () => {
			let sel = get(this.editor.effectiveSelection);
			let hover = get(this.editor.hoveringObject);

			for (let [key, obj] of this.renderedObjects) {
				let realObj = this.broker.project.objectsMap.get(key);
				let shouldBeActive = sel.includes(key) || hover === key || isChildOf(hover, key);

				if (obj.active !== shouldBeActive) {
					obj.active = shouldBeActive;
					if (realObj) {
						obj.refresh(this, realObj);
					}
				}
			}

			this.overlay.requestRedraw();
		};

		this.overlayView.draw = () => {
			for (let [id, ro] of this.renderedObjects.entries()) {
				if (ro.mapUpdate) ro.mapUpdate(this, this.broker.project.objectsMap.get(id)!);
			}
		};

		this.addUnsub(
			this.editor.effectiveSelection.subscribe(() => {
				refreshActive();
			})
		);

		this.addUnsub(
			this.editor.hoveringObject.subscribe((val) => {
				refreshActive();
			})
		);
		this.addUnsub(
			this.broker.watchCornerstone().heading.subscribe((val) => {
				this.heading = val;
			})
		);

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
