import type { ThreeJSOverlayView } from '@googlemaps/three';
import type { EditorContext, ProjectBroker } from 'src/store/editor';
import type { MapProvider } from '../maps/generic';

export interface MapProviderOverlay {
	requestRedraw: () => void;
	lonLatToVector3: (lon: number, lat: number) => THREE.Vector3;
	lonLatToContainerPixel: (lon: number, lat: number) => [number, number];
	getScene: () => THREE.Scene;
}

export class Overlay {
	map: MapProvider;
	unsubs: (() => void)[] = [];
	editor: EditorContext;
	broker: ProjectBroker;
	overlay: MapProviderOverlay;
	// overlayView: google.maps.OverlayView;
	draws: (() => void)[] = [];

	constructor(
		map: MapProvider,
		overlay: MapProviderOverlay,
		editor: EditorContext,
		broker: ProjectBroker
	) {
		this.map = map;
		this.editor = editor;
		this.broker = broker;
		this.overlay = overlay;

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
