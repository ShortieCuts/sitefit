import {
	faCompass,
	faCompassDrafting,
	faPen,
	faTriangleCircleSquare
} from '@fortawesome/free-solid-svg-icons';
import type { EditorContext, ProjectBroker } from 'src/store/editor';
import { get } from 'svelte/store';
import { Material, Path, SVG } from 'core';
import createDOMPurify from 'dompurify';

let stagingObject: SVG | null = null;
export const ShapeTool = {
	icon: faTriangleCircleSquare,
	key: 'shape',
	access: 'WRITE',
	shortcut: '',
	hidden: true,
	onDown(ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) {
		if (stagingObject) {
			stagingObject.style.color = [0, 0, 0, 1];
			let newId = broker.commitStagedObject();
			stagingObject = null;
			if (newId) editor.select(newId);
		}
	},
	cancel(editor: EditorContext, broker: ProjectBroker) {
		if (stagingObject) {
			broker.stagingObject.set(null);
			stagingObject = null;
		}
	},
	commit(editor: EditorContext, broker: ProjectBroker) {
		if (stagingObject) {
			broker.stagingObject.set(null);
			stagingObject = null;
		}
	},
	onUp: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {},
	onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		if (!stagingObject) {
			let svg = new SVG();
			svg.svg = get(editor.activeSVG);
			svg.style = new Material();
			svg.style.color = [0, 0, 0, 0.75];
			const DOMPurify = createDOMPurify(window);

			let clean = DOMPurify.sanitize(svg.svg) as string;
			let wrapper = document.createElement('div');
			wrapper.innerHTML = clean;
			let svgElement = wrapper.querySelector('svg') as SVGElement;
			let width = svgElement.getAttribute('width');
			let height = svgElement.getAttribute('height');
			svg.sourceWidth = parseInt(width || '0');
			svg.sourceHeight = parseInt(height || '0');

			let viewBounds = get(editor.viewBounds);
			let location = [
				(viewBounds.minX + viewBounds.maxX) / 2,
				(viewBounds.minY + viewBounds.maxY) / 2
			];
			let viewWidth = viewBounds.maxX - viewBounds.minX;
			let viewHeight = viewBounds.maxY - viewBounds.minY;
			let scaleFactor = Math.min(viewWidth / svg.sourceWidth, viewHeight / svg.sourceHeight) / 12;
			svg.transform.size[0] = scaleFactor;
			svg.transform.size[1] = scaleFactor;
			svg.transform.position[0] = location[0] - (svg.sourceWidth / 2) * scaleFactor;
			svg.transform.position[1] = location[1] - (svg.sourceHeight / 2) * scaleFactor;

			broker.stagingObject.set(svg);
			stagingObject = svg;
		}

		broker.stagingObject.update((obj) => {
			if (obj && obj instanceof SVG) {
				let targetPos = editor.getDesiredPosition();
				obj.transform.position[0] = targetPos[0] - (obj.sourceWidth / 2) * obj.transform.size[0];
				obj.transform.position[1] = targetPos[1] - (obj.sourceHeight / 2) * obj.transform.size[1];
				return obj;
			} else {
				return null;
			}
		});

		broker.needsRender.set(true);
	}
};
