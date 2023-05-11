import type { ThreeJSOverlayView } from '@googlemaps/three';
import type { EditorContext, ProjectBroker } from 'src/store/editor';

export class Overlay {
	map: google.maps.Map;
	unsubs: (() => void)[] = [];
	editor: EditorContext;
	broker: ProjectBroker;
	overlay: ThreeJSOverlayView;
	overlayView: google.maps.OverlayView;
	draws: (() => void)[] = [];

	constructor(
		map: google.maps.Map,
		overlay: ThreeJSOverlayView,
		overlayView: google.maps.OverlayView,
		editor: EditorContext,
		broker: ProjectBroker
	) {
		this.map = map;
		this.editor = editor;
		this.broker = broker;
		this.overlay = overlay;
		this.overlayView = overlayView;

		this.unsubs = [];
	}

	addUnsub(unsub: () => void) {
		this.unsubs.push(unsub);
	}

	init() {}

	destroy() {
		this.unsubs.forEach((unsub) => unsub());
	}

	addDraw(draw: () => void) {
		this.draws.push(draw);
	}

	refresh() {}
}
