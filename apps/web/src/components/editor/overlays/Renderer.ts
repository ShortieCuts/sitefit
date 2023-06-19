import { getSvelteContext } from 'src/store/editor';
import { Overlay } from './Overlay';
import * as THREE from 'three';
import { get } from 'svelte/store';
import {
	Arc,
	Circle,
	Cornerstone,
	Group,
	Path,
	Text,
	type Object2D,
	type ObjectID,
	ObjectType,
	SVG,
	getSmartObject,
	smartObjectRender
} from 'core';
import type { Vector3 } from 'three';
import Flatten from '@flatten-js/core';
import { metersAreaToFootArea, metersToFeetPrettyPrint } from '$lib/util/distance';
import createDOMPurify from 'dompurify';
import { colorArrayToCss } from '$lib/util/color';

const fontAspectRatio = 0.6109113885585942; // Roboto Mono
const ACTIVE_COLOR = '#0c8ae5';

export interface RenderObject2D {
	active: boolean;
	refresh(overlay: RendererOverlay | HeadlessRenderer, obj: Object2D): void;
	destroy(overlay: RendererOverlay | HeadlessRenderer): void;
	setMaterial(mat: THREE.Material): void;
	translate(delta: Vector3): void;
	getPosition(): Vector3;

	mapUpdate?(overlay: RendererOverlay | HeadlessRenderer, obj: Object2D): void;
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

let DOMPurify: any = null;
if (typeof window !== 'undefined') {
	DOMPurify = createDOMPurify(window);
}

class RenderPath implements RenderObject2D {
	active: boolean = false;
	line: THREE.Line;
	filled: THREE.Mesh;

	textEl?: HTMLDivElement;

	smartObjects: [Object2D, RenderObject2D][] = [];

	constructor(overlay: RendererOverlay | HeadlessRenderer, obj: Path) {
		let geo = new THREE.BufferGeometry();
		let elements = 20;

		if (obj.segments.length > 20) {
			elements = obj.segments.length;
		}

		geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(elements * 3), 3));

		let indices = [];
		for (let i = 0; i < elements; i++) {
			indices.push(i);
		}

		geo.setIndex(indices);

		geo.setDrawRange(0, 0);

		let geo2 = new THREE.ShapeGeometry(new THREE.Shape());

		if (obj.measurement) {
			this.line = new THREE.Line(
				geo,
				new THREE.LineDashedMaterial({
					color: '#ff0000',
					opacity: 1,
					transparent: false,
					dashSize: 3,
					gapSize: 2
				})
			);

			this.textEl = document.createElement('div');
			this.textEl.style.position = 'absolute';
			this.textEl.style.top = '0';
			this.textEl.style.left = '0';
			this.textEl.style.fontFamily = 'sans-serif';
			this.textEl.style.background = 'transparent';
			this.textEl.style.fontSize = '12px';
			this.textEl.style.fontWeight = 'bold';
			this.textEl.style.pointerEvents = 'none';
			this.textEl.style.transformOrigin = 'center';
			this.textEl.style.fontFamily = '"Roboto Mono", monospace';
			this.textEl.style.lineHeight = '1em';
			this.textEl.style.overflow = 'visible';
			this.textEl.style.height = '0px';
			this.textEl.style.width = '0px';
			this.textEl.style.background = 'red';
			this.textEl.style.display = 'flex';
			this.textEl.style.willChange = 'transform, font-size';
			this.textEl.style.alignItems = 'center';
			this.textEl.style.justifyContent = 'center';
			this.textEl.style.whiteSpace = 'nowrap';

			this.textEl.style.resize = 'none';

			let childDiv = document.createElement('div');
			childDiv.style.background = 'white';
			childDiv.style.padding = '2px 4px';
			childDiv.style.borderRadius = '2px';
			childDiv.style.border = `2px dashed ${colorArrayToCss(obj.style.color)}`;
			childDiv.dataset.hoverable = 'true';
			childDiv.dataset.objectId = obj.id;

			this.textEl.appendChild(childDiv);

			overlay.appendElement(this.textEl);
		} else {
			if (obj.disconnected) {
				this.line = new THREE.LineSegments(
					geo,
					new THREE.MeshBasicMaterial({ color: '#ff0000', opacity: 1, transparent: false })
				);
			} else {
				this.line = new THREE.Line(
					geo,
					new THREE.MeshBasicMaterial({ color: '#ff0000', opacity: 1, transparent: false })
				);
			}
		}

		this.filled = new THREE.Mesh(
			geo2,
			new THREE.MeshBasicMaterial({ color: '#ff0000', side: THREE.DoubleSide })
		);

		overlay.scene.add(this.line);
		overlay.scene.add(this.filled);
	}

	getPosition(): THREE.Vector3 {
		return this.line.position;
	}

	refresh(overlay: RendererOverlay | HeadlessRenderer, obj: Path): void {
		// Kill all children
		for (let [smartObj, renderObj] of this.smartObjects) {
			renderObj.destroy(overlay);
		}
		this.smartObjects = [];

		if (obj.smartObject) {
			let smartObject = getSmartObject(obj.smartObject);
			if (smartObject) {
				let children = smartObjectRender(obj, obj.smartObject, obj.smartProperties ?? {});

				for (let child of children) {
					let ro = createRenderObject(overlay, child);
					ro.active = this.active;
					ro.refresh(overlay, child);
					this.smartObjects.push([child, ro]);
				}
			}
		}

		let mat = this.line.material as THREE.MeshBasicMaterial;
		let mat2 = this.filled.material as THREE.MeshBasicMaterial;

		if (obj.style && obj.style.color) {
			mat.color.set(colorArrayToThreeColor(obj.style.color));
			mat2.color.set(colorArrayToThreeColor(obj.style.color));

			mat.transparent = obj.style.color[3] < 1;
			mat.opacity = obj.style.color[3];
			mat2.transparent = obj.style.color[3] < 1;
			mat2.opacity = obj.style.color[3];

			if (overlay.globalOpacity < 1) {
				mat.transparent = true;
				mat.opacity = overlay.globalOpacity;
				mat2.transparent = true;
				mat2.opacity = overlay.globalOpacity;
			}

			if (overlay.cadOverrideColor) {
				mat.color.set(overlay.cadOverrideColor as any);
				mat2.color.set(overlay.cadOverrideColor as any);
			}

			if (obj.smartObject && !this.active) {
				mat.transparent = true;
				mat.opacity = 0;
			}

			if (this.active) {
				mat.color.set(ACTIVE_COLOR);
			}
		}

		if (obj.measurement && this.textEl) {
			let el = this.textEl.querySelector('div') as HTMLDivElement;
			if (el) {
				if (this.active) {
					el.style.background = '#cdefff';
				} else {
					el.style.background = 'white';
				}
			}
		}

		let arr = (this.line.geometry.attributes.position as any).array as Float32Array;
		mat.needsUpdate = true;
		mat2.needsUpdate = true;

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

		if (obj.measurement) {
			this.line.computeLineDistances();
		}

		this.line.position.setX(obj.transform.position[0]);
		this.line.position.setZ(obj.transform.position[1]);
		this.line.scale.setX(obj.transform.size[0]);
		this.line.scale.setZ(obj.transform.size[1]);

		this.line.setRotationFromEuler(new THREE.Euler(0, -obj.transform.rotation, 0));

		if (obj.style && obj.style.filled) {
			this.filled.visible = true;
			if (obj.disconnected) {
				this.line.visible = false;

				this.filled.geometry = this.line.geometry;

				this.filled.position.setX(obj.transform.position[0]);
				if (obj.measurement) {
					this.filled.position.setY(0.01);
					this.line.visible = true;
					mat2.opacity = 0.1;
					mat2.transparent = true;
				}
				this.filled.position.setZ(obj.transform.position[1]);
				this.filled.scale.setX(obj.transform.size[0]);
				this.filled.scale.setZ(obj.transform.size[1]);

				this.filled.setRotationFromEuler(new THREE.Euler(0, -obj.transform.rotation, 0));
			} else {
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
				if (obj.measurement) {
					this.filled.position.setY(0.01);
					this.line.visible = true;
					mat2.opacity = 0.1;
					mat2.transparent = true;
				}
				this.filled.position.setZ(obj.transform.position[1]);
				this.filled.scale.setX(obj.transform.size[0]);
				this.filled.scale.setZ(obj.transform.size[1]);

				this.filled.setRotationFromEuler(new THREE.Euler(0, -obj.transform.rotation, 0));
			}
		} else {
			this.filled.visible = false;
			this.line.visible = true;
		}

		if (this.textEl) {
			let distance = 0;
			let area = 0;
			if (obj.flatShape)
				for (let shape of obj.flatShape) {
					if (shape instanceof Flatten.Segment) {
						distance += shape.length;
					}
					if (shape instanceof Flatten.Polygon) {
						area += shape.area();
					}
				}

			let childDiv = this.textEl.querySelector('div');
			if (childDiv) {
				if (obj.style.filled) {
					childDiv.innerText = metersAreaToFootArea(area);
					// childDiv.innerText = area.toFixed(2) + 'm';
				} else {
					childDiv.innerText = metersToFeetPrettyPrint(distance);
					// childDiv.innerText = distance.toFixed(2) + 'm';
				}
			}

			if (obj.measurement) {
				let matDashed = this.line.material as THREE.LineDashedMaterial;
				// Make sure the line starts and ends with a dash

				let dashSize = 0.5;
				let gapSize = 0.5;

				let dashCount = Math.ceil(distance / (dashSize + gapSize));
				matDashed.dashSize = distance / dashCount;
				matDashed.gapSize = matDashed.dashSize;
			}
		}
		this.mapUpdate(overlay, obj);
	}

	mapUpdate(overlay: RendererOverlay | HeadlessRenderer, obj: Path): void {
		for (let [object, renderObject] of this.smartObjects) {
			if (renderObject.mapUpdate) renderObject.mapUpdate(overlay, object);
		}

		if (!this.textEl) return;

		let text = this.textEl.innerText;

		let objBounds = obj.getBounds();
		let center = [(objBounds.minX + objBounds.maxX) / 2, (objBounds.minY + objBounds.maxY) / 2];
		let pos = { x: center[0], y: center[1] };

		let angle = 0;
		let lineSize = 16;
		if (overlay instanceof RendererOverlay) {
			center[0] += 2;
			let p = overlay.editor.positionToLonLat(objBounds.minX, objBounds.minY);
			let p2 = overlay.editor.positionToLonLat(objBounds.maxX, objBounds.maxY);

			let pos1 = overlay.overlay.lonLatToContainerPixel(p[0], p[1]);
			let pos2 = overlay.overlay.lonLatToContainerPixel(p2[0], p2[1]);
			if (!pos1 || !pos2) return;
			lineSize = Math.sqrt(Math.pow(pos2[0] - pos1[0], 2) + Math.pow(pos2[0] - pos1[1], 2));
			pos.x = (pos1[0] + pos2[0]) / 2;
			pos.y = (pos1[1] + pos2[1]) / 2;
		}

		if (obj.segments.length == 2) {
			let p1 = obj.segments[0];
			let p2 = obj.segments[1];
			angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
			if (angle > Math.PI / 2) angle -= Math.PI;
			if (angle < -Math.PI / 2) angle += Math.PI;
		}

		let screenSize = 16;

		if (obj.style.color) this.textEl.style.color = colorArrayToCss(obj.style.color);
		// let fontAspectRatio = fontAspectRatio;

		let charCount = text.length;

		// Algebra: text.length * fontAspectRatio * fontSize = lineSize;
		let lineGap = 20;
		let fontSize = (lineSize - lineGap * 2) / (text.length * fontAspectRatio);

		if (fontSize <= 10) {
			this.textEl.style.fontSize = `10px`;
			let dx = Math.cos(angle + Math.PI / 2);
			let dy = Math.sin(angle + Math.PI / 2);
			pos.x += dx * 15;
			pos.y += dy * 15;
		} else {
			this.textEl.style.fontSize = `${Math.min(fontSize, 18)}px`;
		}
		// this.textEl.style.width = `${screenSize * text.length * fontAspectRatio}px`;
		// this.textEl.style.top = pos.y + 'px';
		// this.textEl.style.left = pos.x + 'px';

		this.textEl.style.transform = `translate(${pos.x}px, ${pos.y}px) rotate(${angle}rad)`;

		// this.textEl.style.display = 'flex';
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

	destroy(overlay: RendererOverlay | HeadlessRenderer): void {
		for (let [smartObj, renderObj] of this.smartObjects) {
			renderObj.destroy(overlay);
		}
		this.smartObjects = [];

		overlay.scene.remove(this.line);
		this.line.geometry.dispose();

		overlay.scene.remove(this.filled);
		this.filled.geometry.dispose();

		if (this.textEl) this.textEl.remove();
	}
}

class RenderArc implements RenderObject2D {
	active: boolean = false;
	line: THREE.Line;

	constructor(overlay: RendererOverlay | HeadlessRenderer, obj: Arc | Circle) {
		this.line = new THREE.Line(
			new THREE.BufferGeometry(),
			new THREE.MeshBasicMaterial({ color: '#ff0000', opacity: 1, transparent: false })
		);

		overlay.scene.add(this.line);
	}

	getPosition(): THREE.Vector3 {
		return this.line.position;
	}

	refresh(overlay: RendererOverlay | HeadlessRenderer, obj: Arc | Circle): void {
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

		if (overlay.globalOpacity < 1) {
			mat.transparent = true;
			mat.opacity = overlay.globalOpacity;
		}

		if (overlay.cadOverrideColor) {
			mat.color.set(overlay.cadOverrideColor as any);
		}

		mat.needsUpdate = true;

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

	destroy(overlay: RendererOverlay | HeadlessRenderer): void {
		overlay.scene.remove(this.line);
		this.line.geometry.dispose();
	}
}

class RenderGroup implements RenderObject2D {
	active: boolean = false;
	constructor(overlay: RendererOverlay | HeadlessRenderer, obj: Group) {}

	refresh(overlay: RendererOverlay | HeadlessRenderer, obj: Group): void {}

	setMaterial(mat: THREE.Material): void {}

	translate(delta: Vector3): void {}

	destroy(overlay: RendererOverlay | HeadlessRenderer): void {}

	getPosition(): THREE.Vector3 {
		return new THREE.Vector3(0, 0, 0);
	}
}

class RenderCornerstone implements RenderObject2D {
	active: boolean = false;
	constructor(overlay: RendererOverlay | HeadlessRenderer, obj: Cornerstone) {}

	refresh(overlay: RendererOverlay | HeadlessRenderer, obj: Group): void {}

	setMaterial(mat: THREE.Material): void {}

	translate(delta: Vector3): void {}

	destroy(overlay: RendererOverlay | HeadlessRenderer): void {}

	getPosition(): THREE.Vector3 {
		return new THREE.Vector3(0, 0, 0);
	}
}

class RenderText implements RenderObject2D {
	active: boolean = false;
	el: HTMLTextAreaElement;
	threePosition: THREE.Vector3 = new THREE.Vector3();
	constructor(overlay: RendererOverlay | HeadlessRenderer, obj: Text) {
		this.el = document.createElement('textarea');
		this.el.style.position = 'absolute';
		this.el.style.top = '0';
		this.el.style.left = '0';
		this.el.style.fontFamily = 'sans-serif';
		this.el.style.background = 'transparent';
		this.el.style.fontSize = '12px';
		this.el.style.fontWeight = 'bold';
		this.el.style.pointerEvents = 'none';
		this.el.style.transformOrigin = 'top left';
		this.el.style.fontFamily = '"Roboto Mono", monospace';
		this.el.style.lineHeight = '1em';
		this.el.style.overflow = 'hidden';
		this.el.style.resize = 'none';
		this.el.style.willChange = 'transform';
		this.el.readOnly = true;

		overlay.appendElement(this.el);
		let unsaved = false;

		if (overlay instanceof RendererOverlay) {
			const saveText = () => {
				if (!unsaved) return;
				unsaved = false;
				let realObj = overlay.broker.project.objectsMap.get(obj.id);
				if (realObj && overlay && realObj.type == ObjectType.Text) {
					let textObj = realObj as Text;
					let transaction = overlay.broker.project.createTransaction();
					transaction.update(textObj.id, 'text', this.el.value);
					overlay.broker.commitTransaction(transaction);
				}
			};

			let objId = obj.id;
			this.el.addEventListener('input', () => {
				let realObj = overlay.broker.project.objectsMap.get(objId);
				if (realObj && overlay && realObj.type == ObjectType.Text) {
					let textObj = realObj as Text;
					textObj.text = this.el.value;
					textObj.computeShape();
					this.refresh(overlay, textObj);
					overlay.broker.needsRender.set(true);
					unsaved = true;
				}
			});

			this.el.addEventListener('change', (e) => {
				saveText();
			});

			this.el.addEventListener('keydown', (e) => {
				if (e.key == 'Enter' && !e.shiftKey) {
					e.preventDefault();
					overlay.editor.editingObject.set(null);
					saveText();
					this.setEditing(false);
				}
			});
		}
	}

	getPosition(): THREE.Vector3 {
		return this.threePosition;
	}

	refresh(overlay: RendererOverlay | HeadlessRenderer, obj: Text): void {
		this.el.value = obj.text;
		this.el.style.width = obj.text.length + 'ch';

		this.threePosition.set(obj.transform.position[0], 0, obj.transform.position[1]);

		if (overlay.globalOpacity < 1) {
			this.el.style.opacity = overlay.globalOpacity.toString();
		} else {
			if (obj.style.color) this.el.style.opacity = obj.style.color[3].toString();
			else this.el.style.opacity = '1';
		}

		let lines = 0;
		if (obj.maxWidth > 0) {
			this.el.style.width = Math.min(obj.text.length, obj.maxWidth) + 'ch';
			lines = Math.ceil(obj.text.length / obj.maxWidth);
		}
		let breakCount = obj.text.split('\n').length;
		this.el.style.height = Math.max(lines, breakCount) + 'em';

		this.mapUpdate(overlay, obj);
		if (this.active) {
			this.el.style.textShadow = `1px 0 1px ${ACTIVE_COLOR}, -1px 0 1px ${ACTIVE_COLOR}, 0px 1px 1px ${ACTIVE_COLOR}, 0 -1px 1px ${ACTIVE_COLOR}`;
		} else {
			this.el.style.textShadow = `none`;
		}
	}

	setEditing(editing: boolean) {
		if (editing) {
			this.el.focus();
			this.el.readOnly = false;
			this.el.style.pointerEvents = 'auto';
			this.el.style.setProperty('cursor', 'text', 'important');
			this.el.style.userSelect = 'text';
			this.el.style.zIndex = '1000';
			this.el.select();
		} else {
			this.el.blur();
			this.el.removeAttribute('contenteditable');
			this.el.style.pointerEvents = 'none';
			this.el.style.cursor = 'default';
			this.el.style.userSelect = 'none';
			this.el.style.zIndex = 'auto';
		}
	}

	setMaterial(mat: THREE.Material): void {}

	translate(delta: Vector3): void {}

	destroy(overlay: RendererOverlay | HeadlessRenderer): void {
		this.el.remove();
	}

	mapUpdate(overlay: RendererOverlay | HeadlessRenderer, obj: Text): void {
		let pos = { x: obj.transform.position[0], y: obj.transform.position[1] };
		let screenSize = 16 * obj.size;
		let heading = 0;
		let anchorHeading = 0;
		if (overlay instanceof RendererOverlay) {
			heading = overlay.map.getHeading();
			anchorHeading = overlay.heading;

			let p = overlay.editor.positionToLonLat(obj.transform.position[0], obj.transform.position[1]);
			let p2 = overlay.editor.positionToLonLat(
				obj.transform.position[0] + obj.size,
				obj.transform.position[1]
			);

			let pos1 = overlay.overlay.lonLatToContainerPixel(p[0], p[1]);
			let pos2 = overlay.overlay.lonLatToContainerPixel(p2[0], p2[1]);
			if (!pos1 || !pos2) return;
			pos.x = pos1[0];
			pos.y = pos1[1];

			screenSize = Math.sqrt(Math.pow(pos2[0] - pos.x, 2) + Math.pow(pos2[1] - pos.y, 2));
		} else {
			let vec = new THREE.Vector3(obj.transform.position[0], obj.transform.position[1], 0);
			vec.project(overlay.scene.getObjectByName('camera') as THREE.Camera);
			pos.x = -100;
			pos.y = -100; // Move off screen for now
		}

		let inViewport =
			pos.x + obj.text.length * screenSize * fontAspectRatio > 0 &&
			pos.y + screenSize > 0 &&
			pos.x < window.innerWidth &&
			pos.y < window.innerHeight;

		if (inViewport) {
			this.el.style.color = colorArrayToCss(obj.style.color);
			if (overlay.cadOverrideColor) {
				this.el.style.color = overlay.cadOverrideColor;
			}
			this.el.style.fontSize = `${screenSize}px`;
			this.el.style.width = `${screenSize * obj.text.length * fontAspectRatio}px`;
			// this.el.style.top = pos.y + 'px';
			// this.el.style.left = pos.x + 'px';
			let trans = `translate(${pos.x}px, ${pos.y}px) rotate(${
				obj.transform.rotation * (180 / Math.PI) + heading * -1 + anchorHeading
			}deg)`;

			if (this.el.style.transform != trans) {
				this.el.style.transform = trans;
			}
			if (this.el.style.display != 'block') this.el.style.display = 'block';
		} else {
			if (this.el.style.display != 'none') this.el.style.display = 'none';
		}
	}
}

class RenderSVG implements RenderObject2D {
	active: boolean = false;
	el: HTMLDivElement;
	threePosition: THREE.Vector3 = new THREE.Vector3();
	constructor(overlay: RendererOverlay | HeadlessRenderer, obj: SVG) {
		this.el = document.createElement('div');
		this.el.classList.add('render-object-svg');
		this.el.style.position = 'absolute';
		this.el.style.top = '0';
		this.el.style.left = '0';

		this.el.style.pointerEvents = 'none';
		this.el.style.transformOrigin = 'top left';
		this.el.style.fontFamily = '"Roboto Mono", monospace';
		this.el.style.lineHeight = '1em';
		this.el.style.overflow = 'hidden';

		this.el.style.willChange = 'transform';

		this.refresh(overlay, obj);

		overlay.appendElement(this.el);
	}

	getPosition(): THREE.Vector3 {
		return this.threePosition;
	}

	refresh(overlay: RendererOverlay | HeadlessRenderer, obj: SVG): void {
		let clean = DOMPurify.sanitize(obj.svg);
		this.el.innerHTML = clean;
		this.el.querySelectorAll('path').forEach((path) => {
			path.style.stroke = 'none';
			path.style.fill = colorArrayToCss(obj.style.color);
		});

		this.threePosition.set(obj.transform.position[0], 0, obj.transform.position[1]);

		if (overlay.globalOpacity < 1) {
			this.el.style.opacity = overlay.globalOpacity.toString();
		} else {
			if (obj.style.color) this.el.style.opacity = obj.style.color[3].toString();
			else this.el.style.opacity = '1';
		}

		this.mapUpdate(overlay, obj);
		if (this.active) {
			this.el.querySelectorAll('path').forEach((path) => {
				path.style.stroke = ACTIVE_COLOR;
				path.style.strokeWidth = '1';
			});
		} else {
			this.el.querySelectorAll('path').forEach((path) => {
				path.style.stroke = 'none';
			});
		}
	}

	setMaterial(mat: THREE.Material): void {}

	translate(delta: Vector3): void {}

	destroy(overlay: RendererOverlay | HeadlessRenderer): void {
		this.el.remove();
	}

	mapUpdate(overlay: RendererOverlay | HeadlessRenderer, obj: SVG): void {
		let pos = { x: obj.transform.position[0], y: obj.transform.position[1] };
		let screenSize = 16;
		let heading = 0;
		let anchorHeading = 0;
		if (overlay instanceof RendererOverlay) {
			heading = overlay.map.getHeading();
			anchorHeading = overlay.heading;

			let p = overlay.editor.positionToLonLat(obj.transform.position[0], obj.transform.position[1]);
			let p2 = overlay.editor.positionToLonLat(
				obj.transform.position[0] + obj.sourceWidth,
				obj.transform.position[1]
			);

			let pos1 = overlay.overlay.lonLatToVector3(p[0], p[1]);
			let pos2 = overlay.overlay.lonLatToVector3(p2[0], p2[0]);
			if (!pos1 || !pos2) return;
			pos.x = pos1.x;
			pos.y = pos1.y;

			screenSize = Math.sqrt(Math.pow(pos2.x - pos.x, 2) + Math.pow(pos2.y - pos.y, 2));
		} else {
			let vec = new THREE.Vector3(obj.transform.position[0], obj.transform.position[1], 0);
			vec.project(overlay.scene.getObjectByName('camera') as THREE.Camera);
			pos.x = -100;
			pos.y = -100; // Move off screen for now
		}

		let inViewport =
			pos.x + screenSize &&
			pos.y + screenSize > 0 &&
			pos.x < window.innerWidth &&
			pos.y < window.innerHeight;

		if (inViewport) {
			// this.el.style.color = colorArrayToCss(obj.style.color);
			// if (overlay.cadOverrideColor) {
			// 	this.el.style.color = overlay.cadOverrideColor;
			// }
			// this.el.style.fontSize = `${screenSize}px`;
			if (this.el.firstChild && this.el.firstChild instanceof SVGElement) {
				this.el.firstChild.style.width = `${screenSize}px`;
				this.el.firstChild.style.height = `${(obj.sourceHeight / obj.sourceWidth) * screenSize}px`;

				// this.el.style.top = pos.y + 'px';
				// this.el.style.left = pos.x + 'px';
				let trans = `translate(${pos.x}px, ${pos.y}px) rotate(${
					obj.transform.rotation * (180 / Math.PI)
				}deg) scaleX(${obj.transform.size[0]}) scaleY(${obj.transform.size[1]}) rotate(${
					heading * -1 + anchorHeading
				}deg)`;

				if (this.el.style.transform != trans) {
					this.el.style.transform = trans;
				}
				if (this.el.style.display != 'block') this.el.style.display = 'block';
			}
		} else {
			if (this.el.style.display != 'none') this.el.style.display = 'none';
		}
	}
}

export function createRenderObject(
	overlay: RendererOverlay | HeadlessRenderer,
	obj: Object2D
): RenderObject2D {
	if (obj instanceof Path) {
		return new RenderPath(overlay, obj);
	} else if (obj instanceof Group) {
		return new RenderGroup(overlay, obj);
	} else if (obj instanceof Arc || obj instanceof Circle) {
		return new RenderArc(overlay, obj);
	} else if (obj instanceof Cornerstone) {
		return new RenderCornerstone(overlay, obj);
	} else if (obj instanceof Text) {
		return new RenderText(overlay, obj);
	} else if (obj instanceof SVG) {
		return new RenderSVG(overlay, obj);
	} else {
		console.error('Unsupported object type', obj);
		return new RenderPath(overlay, obj as Path);
	}
}

export class RendererOverlay extends Overlay {
	isDown: boolean = false;
	heading: number = 0;
	stagedObject: RenderObject2D | null = null;
	previewObjects: RenderObject2D[] = [];
	scene: THREE.Scene;

	globalOpacity: number = 1;
	cadOverrideColor: string = '';

	renderedObjects: Map<ObjectID, RenderObject2D> = new Map();

	init(): void {
		super.init();

		this.scene = this.overlay.getScene();
		console.log('Using scene', this.scene, this.scene.id);

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

		const refreshEditing = () => {
			let obj = get(this.editor.editingObject);

			if (obj) {
				let realObj = this.broker.project.objectsMap.get(obj);
				if (!realObj) return;

				let renderObj = this.renderedObjects.get(obj);

				if (realObj.type == ObjectType.Text) {
					let textObj = renderObj as RenderText;
					textObj.setEditing(true);
				}
			} else {
				for (let [key, obj] of this.renderedObjects) {
					if (obj instanceof RenderText) {
						obj.setEditing(false);
					}
				}
			}

			this.overlay.requestRedraw();
		};

		this.addDraw(() => {
			for (let [id, ro] of this.renderedObjects.entries()) {
				if (this.broker.project.objectsMap.has(id))
					if (ro.mapUpdate) ro.mapUpdate(this, this.broker.project.objectsMap.get(id)!);
			}

			let previewObjects = get(this.editor.previewObjects);
			for (let [i, ro] of this.previewObjects.entries()) {
				if (ro.mapUpdate) ro.mapUpdate(this, previewObjects[i]!);
			}
		});

		this.addUnsub(
			this.editor.effectiveSelection.subscribe(() => {
				refreshActive();
			})
		);
		this.addUnsub(
			this.editor.editingObject.subscribe(() => {
				refreshEditing();
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
			this.editor.previewObjects.subscribe((newVal) => {
				for (let obj of this.previewObjects) {
					obj.destroy(this);
				}

				this.previewObjects = [];

				for (let obj of newVal) {
					let renderObj = createRenderObject(this, obj);
					renderObj.refresh(this, obj);
					this.previewObjects.push(renderObj);
				}

				this.overlay.requestRedraw();
			})
		);

		this.addUnsub(
			this.editor.needsPreviewRender.subscribe((newVal) => {
				if (newVal) {
					let previewObjects = get(this.editor.previewObjects);
					for (let [i, obj] of this.previewObjects.entries()) {
						let realObj = previewObjects[i];
						obj.refresh(this, realObj!);
					}

					this.overlay.requestRedraw();

					this.editor.needsPreviewRender.set(false);
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

					let maxDist = 0;
					let farObjects: ObjectID[] = [];
					for (let [id, obj] of this.renderedObjects.entries()) {
						let dist = obj.getPosition().distanceTo(new THREE.Vector3(0, 0, 0));
						if (dist > maxDist) maxDist = dist;
						if (dist > 10000) farObjects.push(id);
					}

					if (farObjects.length > 0) {
						this.editor.warnFarObject.set(true);
						this.editor.farObjects.set(farObjects);
					} else {
						this.editor.warnFarObject.set(false);
						this.editor.farObjects.set([]);
					}
				}
			})
		);

		const cadOpacity = this.broker.writableGlobalProperty<number>('cadOpacity', 1);
		const cadOverrideColor = this.broker.writableGlobalProperty<string>('overrideCadColor', '');

		this.globalOpacity = get(cadOpacity);
		this.cadOverrideColor = get(cadOverrideColor);

		this.addUnsub(
			cadOpacity.subscribe((val) => {
				this.globalOpacity = val;
				for (let [key, obj] of this.renderedObjects) {
					obj.refresh(this, this.broker.project.objectsMap.get(key)!);
				}

				this.overlay.requestRedraw();
			})
		);
		this.addUnsub(
			cadOverrideColor.subscribe((val) => {
				this.cadOverrideColor = val;
				for (let [key, obj] of this.renderedObjects) {
					obj.refresh(this, this.broker.project.objectsMap.get(key)!);
				}

				this.overlay.requestRedraw();
			})
		);
	}

	appendElement(el: HTMLElement) {
		if (this.map) {
			this.map.getDiv().appendChild(el);
		}
	}

	destroy(): void {
		super.destroy();

		for (let obj of this.renderedObjects.values()) {
			obj.destroy(this);
		}

		this.renderedObjects.clear();
		this.previewObjects = [];
		this.stagedObject?.destroy(this);
		this.stagedObject = null;
	}

	destroyObject(id: ObjectID) {
		let obj = this.renderedObjects.get(id);
		if (obj) {
			obj.destroy(this);
			this.renderedObjects.delete(id);
		}
	}

	refresh(): void {
		this.broker.needsRender.set(true);
		this.broker.markAllDirty();
	}
}

export class HeadlessRenderer {
	renderedObjects: Map<ObjectID, RenderObject2D> = new Map();
	scene: THREE.Scene;
	overlayElement: HTMLElement;

	globalOpacity: number = 1;
	cadOverrideColor: string = '';

	constructor(scene: THREE.Scene, overlayElement: HTMLElement) {
		this.scene = scene;
		this.overlayElement = overlayElement;
	}

	appendElement(el: HTMLElement) {
		this.overlayElement.appendChild(el);
	}
	render(objects: Object2D[]) {
		for (let obj of objects) {
			let doesExist = this.renderedObjects.has(obj.id);
			if (doesExist) {
				let renderObj = this.renderedObjects.get(obj.id)!;
				renderObj.refresh(this, obj);
			} else {
				let renderObj = createRenderObject(this, obj);
				this.renderedObjects.set(obj.id, renderObj);
				renderObj.refresh(this, obj);
			}
		}

		for (let [key, obj] of this.renderedObjects) {
			if (!objects.find((v) => v.id === key)) {
				obj.destroy(this);
				this.renderedObjects.delete(key);
			}
		}
	}
}
