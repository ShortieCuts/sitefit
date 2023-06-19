import type { MapProviderOverlay, Overlay } from '../overlays/Overlay';
import * as THREE from 'three';

export type MouseMapEvent = {
	domEvent: MouseEvent;
	lon: number;
	lat: number;
};

export type ZoomMapEvent = {
	zoom: number;
};

export type BoundsMapEvent = {
	north: number;
	south: number;
	east: number;
	west: number;
};

export type MapStyle = {
	name: string;
	key: string;
	thumbnail: string;
};

export class MapProvider {
	listeners: {
		click: ((ev: MouseMapEvent) => void)[];
		down: ((ev: MouseMapEvent) => void)[];
		up: ((ev: MouseMapEvent) => void)[];
		move: ((ev: MouseMapEvent) => void)[];
		zoom: ((ev: ZoomMapEvent) => void)[];
		bounds: ((ev: BoundsMapEvent) => void)[];
		draw: (() => void)[];
	} = {
		click: [],
		down: [],
		up: [],
		move: [],
		zoom: [],
		bounds: [],
		draw: []
	};

	overlays: Overlay[] = [];
	overlayFactory: (map: MapProvider) => Overlay[] = () => [];

	anchor: {
		lon: number;
		lat: number;
		heading: number;
	} = {
		lon: 0,
		lat: 0,
		heading: 0
	};

	static async createMap(parent: HTMLElement, makeOverlays: () => Overlay[]): Promise<MapProvider> {
		return new MapProvider();
	}

	onMakeOverlays(fn: (map: MapProvider) => Overlay[]) {
		this.overlayFactory = fn;
	}

	getOverlayProxy(): MapProviderOverlay {
		return {
			getScene() {
				return new THREE.Scene();
			},
			requestRedraw() {},

			lonLatToVector3(lon: number, lat: number) {
				return new THREE.Vector3(0);
			},
			lonLatToContainerPixel(lon, lat) {
				return [0, 0];
			}
		};
	}

	setAnchor(lon: number, lat: number, heading: number) {
		this.anchor = {
			lon,
			lat,
			heading
		};
	}

	getDiv(): HTMLElement {
		return document.createElement('div');
	}

	setInputMode(gestureHandling: 'greedy' | 'none', keyboardShortcuts: boolean) {}
	setHeading(heading: number) {}
	setTilt(tilt: number) {}
	setZoom(zoom: number) {}
	setCenter(lon: number, lat: number) {}

	getScale(): number {
		return 1;
	}

	getCenter(): [number, number] {
		return [0, 0];
	}

	getZoom(): number {
		return 0;
	}

	getHeading(): number {
		return 0;
	}

	getTilt(): number {
		return 0;
	}

	getMapType(): string {
		return '';
	}

	getStyles(): MapStyle[] {
		return [];
	}

	getBounds(): {
		north: number;
		south: number;
		east: number;
		west: number;
	} {
		return {
			north: 0,
			south: 0,
			east: 0,
			west: 0
		};
	}

	setStyle(key: string) {}

	onClick(fn: (ev: MouseMapEvent) => void) {
		this.listeners.click.push(fn);

		return () => {
			this.offClick(fn);
		};
	}

	onDown(fn: (ev: MouseMapEvent) => void) {
		this.listeners.down.push(fn);

		return () => {
			this.offDown(fn);
		};
	}

	onUp(fn: (ev: MouseMapEvent) => void) {
		this.listeners.up.push(fn);

		return () => {
			this.offUp(fn);
		};
	}

	onMove(fn: (ev: MouseMapEvent) => void) {
		this.listeners.move.push(fn);

		return () => {
			this.offMove(fn);
		};
	}

	onZoom(fn: (ev: ZoomMapEvent) => void) {
		this.listeners.zoom.push(fn);

		return () => {
			this.offZoom(fn);
		};
	}

	onBoundsChange(fn: (ev: BoundsMapEvent) => void) {
		this.listeners.bounds.push(fn);

		return () => {
			this.offBoundsChange(fn);
		};
	}

	onDraw(fn: () => void) {
		this.listeners.draw.push(fn);

		return () => {
			this.offDraw(fn);
		};
	}

	offClick(fn: (ev: MouseMapEvent) => void) {
		this.listeners.click = this.listeners.click.filter((f) => f !== fn);
	}

	offDown(fn: (ev: MouseMapEvent) => void) {
		this.listeners.down = this.listeners.down.filter((f) => f !== fn);
	}

	offUp(fn: (ev: MouseMapEvent) => void) {
		this.listeners.up = this.listeners.up.filter((f) => f !== fn);
	}

	offMove(fn: (ev: MouseMapEvent) => void) {
		this.listeners.move = this.listeners.move.filter((f) => f !== fn);
	}

	offZoom(fn: (ev: ZoomMapEvent) => void) {
		this.listeners.zoom = this.listeners.zoom.filter((f) => f !== fn);
	}

	offBoundsChange(fn: (ev: BoundsMapEvent) => void) {
		this.listeners.bounds = this.listeners.bounds.filter((f) => f !== fn);
	}

	offDraw(fn: () => void) {
		this.listeners.draw = this.listeners.draw.filter((f) => f !== fn);
	}

	destroy() {}
}
