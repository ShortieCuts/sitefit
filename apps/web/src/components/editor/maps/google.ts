import { Loader } from '@googlemaps/js-api-loader';
import {
	MapProvider,
	type MapMultiPolyInstance,
	type MapStyle,
	type MouseMapEvent,
	type MapMultiPolyValue
} from './generic';
import { ThreeJSOverlayView } from '@googlemaps/three';
import * as THREE from 'three';
import type { MapProviderOverlay, Overlay } from '../overlays/Overlay';

type GoogleMapStyle = 'google-satellite' | 'google-simple' | 'google-dark';

function getMapId(style: GoogleMapStyle) {
	if (style == 'google-satellite') return 'c0f380f46a9601c5';
	if (style == 'google-simple') return '44130cd24e816b48';
	if (style == 'google-dark') return '3a922666b5448450';
	return 'c0f380f46a9601c5';
}

function getMapTypeId(style: GoogleMapStyle) {
	if (style == 'google-satellite') return google.maps.MapTypeId.HYBRID;
	if (style == 'google-simple') return google.maps.MapTypeId.ROADMAP;
	if (style == 'google-dark') return google.maps.MapTypeId.ROADMAP;
	return google.maps.MapTypeId.HYBRID;
}

let existingPromise: Promise<typeof google.maps.Map> | null = null;

export async function loadGoogleMaps() {
	if (existingPromise) return existingPromise;

	existingPromise = new Promise(async (resolve) => {
		const loader = new Loader({
			apiKey: 'AIzaSyDhS6djMo2An6CdMlEY1zMQUkRGorXI7SU',
			version: 'weekly'
		});

		await loader.load();

		if (!parent) return;

		const { Map } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;

		resolve(Map);
	});

	return existingPromise;
}

async function createMapWithStyle(
	parent: HTMLElement,
	style: GoogleMapStyle
): Promise<google.maps.Map> {
	const Map = await loadGoogleMaps();
	let div = document.createElement('div');
	div.style.position = 'absolute';
	div.style.top = '0px';
	div.style.left = '0px';
	div.style.width = '100%';
	div.style.height = '100%';
	parent.appendChild(div);
	console.log('creating google map with style', style, div);

	let map = new Map(div, {
		center: {
			lat: 0,
			lng: 0
		},
		zoom: 1,
		heading: 0,
		disableDefaultUI: true,

		mapId: getMapId(style),
		mapTypeId: getMapTypeId(style),

		streetViewControl: false,
		draggableCursor: 'default',
		gestureHandling: 'greedy',
		keyboardShortcuts: false,
		scrollwheel: true,
		isFractionalZoomEnabled: true,
		maxZoom: 50,
		minZoom: 1
	});
	return map;
}

export class GoogleMapsProvider extends MapProvider {
	map: google.maps.Map;
	style: GoogleMapStyle = 'google-satellite';
	parent: HTMLElement;
	scaleFactor: number = 1;
	isSetup = false;

	cacheViewState: {
		lat: number;
		lng: number;
		zoom: number;
	} = {
		lat: 0,
		lng: 0,
		zoom: 0
	};

	mapProviderOverlay: MapProviderOverlay;

	referenceOverlay: ThreeJSOverlayView | null = null;
	overlayView: google.maps.OverlayView | null = null;

	scene: THREE.Scene = new THREE.Scene();

	static async createMap(parent: HTMLElement, makeOverlays: (map: MapProvider) => Overlay[]) {
		let map = await createMapWithStyle(parent, 'google-satellite');

		return new GoogleMapsProvider(parent, map, makeOverlays);
	}

	constructor(
		parent: HTMLElement,
		map: google.maps.Map,
		makeOverlays: (map: MapProvider) => Overlay[]
	) {
		super();
		this.onMakeOverlays(makeOverlays);

		this.parent = parent;
		this.map = map;
		console.log('creating google map');

		this.mapProviderOverlay = {
			getScene: () => {
				return this.scene;
			},
			lonLatToVector3: (lon, lat) => {
				if (!this.referenceOverlay) return new THREE.Vector3(0, 0, 0);
				return this.referenceOverlay.latLngAltitudeToVector3({
					lat,
					lng: lon
				});
			},
			lonLatToContainerPixel: (lon, lat) => {
				if (!this.overlayView) return [0, 0];
				let proj = this.overlayView.getProjection();
				if (!proj) return [0, 0];
				let res = proj.fromLatLngToContainerPixel(new google.maps.LatLng(lat, lon));
				if (!res) return [0, 0];
				return [res.x, res.y];
			},
			requestRedraw: () => {
				this.referenceOverlay?.requestRedraw();
			}
		};

		this.setupMap();
	}

	addMultiPoly(val: MapMultiPolyValue): MapMultiPolyInstance {
		let geoOutput = val.map((a) => {
			return a.map((c) => {
				return c.map((p) => {
					return { lat: p[1], lng: p[0] };
				});
			});
		});
		let mp = new google.maps.Data.MultiPolygon(
			geoOutput.map((g) => {
				return new google.maps.Data.Polygon(g);
			})
		);

		let inst = this.map.data.add({ geometry: mp });
		const featureStyleOptions: google.maps.FeatureStyleOptions = {
			strokeColor: '#ffeb3b',
			strokeOpacity: 1.0,
			strokeWeight: 3.0,
			fillColor: '#ffeb3b',
			fillOpacity: 0.01
		};
		this.map.data.setStyle(featureStyleOptions);

		return {
			key: '',
			destroy: () => {
				this.map.data.remove(inst);
			},
			setValue: (val: MapMultiPolyValue) => {
				let geoOutput = val.map((a) => {
					return a.map((c) => {
						return c.map((p) => {
							return { lat: p[1], lng: p[0] };
						});
					});
				});
				let mp = new google.maps.Data.MultiPolygon(
					geoOutput.map((g) => {
						return new google.maps.Data.Polygon(g);
					})
				);
				inst.setGeometry(mp);
			},
			getValue() {
				return val;
			}
		};
	}

	setupMap() {
		const map = this.map;

		if (this.cacheViewState.lat != 0 || this.cacheViewState.lng != 0) {
			this.setCenter(this.cacheViewState.lng, this.cacheViewState.lat);
			this.setZoom(this.cacheViewState.zoom);
		}
		map.addListener('mousedown', (ev: google.maps.MapMouseEvent) => {
			this.listeners.down.forEach((cb) =>
				cb({
					lon: ev.latLng?.lng() ?? 0,
					lat: ev.latLng?.lat() ?? 0,
					domEvent: ev.domEvent as MouseEvent
				})
			);
		});

		map.addListener('mousemove', (ev: google.maps.MapMouseEvent) => {
			this.listeners.move.forEach((cb) =>
				cb({
					lon: ev.latLng?.lng() ?? 0,
					lat: ev.latLng?.lat() ?? 0,
					domEvent: ev.domEvent as MouseEvent
				})
			);
		});

		map.addListener('click', (ev: google.maps.MapMouseEvent) => {
			this.listeners.click.forEach((cb) =>
				cb({
					lon: ev.latLng?.lng() ?? 0,
					lat: ev.latLng?.lat() ?? 0,
					domEvent: ev.domEvent as MouseEvent
				})
			);
		});
		map.data.addListener('click', (ev: google.maps.MapMouseEvent) => {
			this.listeners.click.forEach((cb) =>
				cb({
					lon: ev.latLng?.lng() ?? 0,
					lat: ev.latLng?.lat() ?? 0,
					domEvent: ev.domEvent as MouseEvent
				})
			);
		});

		map.addListener('mouseup', (ev: google.maps.MapMouseEvent) => {
			this.listeners.up.forEach((cb) =>
				cb({
					lon: ev.latLng?.lng() ?? 0,
					lat: ev.latLng?.lat() ?? 0,
					domEvent: ev.domEvent as MouseEvent
				})
			);
		});

		map.addListener('zoom_changed', () => {
			if (!map) return;
			let zoom = map.getZoom() ?? 0;
			this.listeners.zoom.forEach((cb) =>
				cb({
					zoom
				})
			);
		});

		map.addListener('bounds_changed', () => {
			let bounds = map.getBounds();
			this.cacheViewState = {
				lat: this.getCenter()[1],
				lng: this.getCenter()[0],
				zoom: this.getZoom()
			};

			if (!bounds) {
				return;
			}

			let ne = bounds.getNorthEast();
			let sw = bounds.getSouthWest();

			this.listeners.bounds.forEach((cb) =>
				cb({
					north: ne.lat(),
					south: sw.lat(),
					east: ne.lng(),
					west: sw.lng()
				})
			);

			this.computeScaling();
		});

		this.setupOverlays();
	}

	getOverlayProxy() {
		return this.mapProviderOverlay;
	}

	setupOverlays() {
		if (this.isSetup) return;
		this.isSetup = true;

		let scene = new THREE.Scene();
		let deg = -this.anchor.heading;
		let rad = (deg / 180) * Math.PI;

		scene.rotateY(rad);

		this.scene = scene;

		this.overlays = this.overlayFactory(this);

		this.overlayView = new google.maps.OverlayView();
		this.overlayView.setMap(this.map);

		this.overlayView.onRemove = () => {};

		this.overlayView.draw = () => {
			for (let overlay of this.overlays) {
				for (let draw of overlay.draws) {
					draw();
				}
			}

			this.listeners.draw.forEach((cb) => cb());
		};

		this.referenceOverlay = new ThreeJSOverlayView({
			map: this.map,
			scene,
			upAxis: 'Y',
			anchor: {
				lat: this.anchor.lat,
				lng: this.anchor.lon
			}
		});

		for (let overlay of this.overlays) {
			overlay.init();
		}
		for (let overlay of this.overlays) {
			overlay.refresh();
		}
	}

	computeScaling() {
		let bounds = this.map.getBounds();

		if (!bounds) {
			return;
		}

		let ne = bounds.getNorthEast();
		let sw = bounds.getSouthWest();

		let scale = Math.abs(ne.lat() - sw.lat()) * 800;

		if (isNaN(scale)) {
			return;
		}

		this.scaleFactor = scale;
	}

	getScale(): number {
		return this.scaleFactor;
	}

	getDiv(): HTMLElement {
		return this.map.getDiv();
	}

	setInputMode(gestureHandling: 'greedy' | 'none', keyboardShortcuts: boolean) {
		this.map.setOptions({
			gestureHandling,
			keyboardShortcuts
		});
	}

	setHeading(heading: number) {
		this.map.setHeading(heading);
	}

	setTilt(tilt: number) {
		this.map.setTilt(tilt);
	}

	setZoom(zoom: number) {
		this.cacheViewState.zoom = zoom;
		this.map.setZoom(zoom);
	}

	setCenter(lon: number, lat: number) {
		this.cacheViewState.lat = lat;
		this.cacheViewState.lng = lon;
		this.map.setCenter({ lng: lon, lat: lat });
	}

	getCenter(): [number, number] {
		const center = this.map.getCenter();

		return [center?.lng() ?? 0, center?.lat() ?? 0];
	}

	getZoom(): number {
		return this.map.getZoom() ?? 0;
	}

	getBounds(): {
		north: number;
		south: number;
		east: number;
		west: number;
	} {
		let bounds = this.map.getBounds();
		if (!bounds)
			return {
				north: 0,
				south: 0,
				east: 0,
				west: 0
			};

		let ne = bounds.getNorthEast();
		let sw = bounds.getSouthWest();
		return {
			north: ne.lat(),
			south: sw.lat(),
			east: ne.lng(),
			west: sw.lng()
		};
	}

	getHeading(): number {
		return this.map.getHeading() ?? 0;
	}

	getTilt(): number {
		return this.map.getTilt() ?? 0;
	}

	getMapType(): string {
		return this.style;
	}

	getStyles(): MapStyle[] {
		return [
			{
				key: 'google-satellite',
				thumbnail: '/img/google-sat.png',
				name: 'Satellite'
			},
			{
				key: 'google-simple',
				thumbnail: '/img/google-street.png',
				name: 'Simple'
			},
			{
				key: 'google-dark',
				thumbnail: '/img/google-dark.png',
				name: 'Dark'
			}
		];
	}

	mapRebuilding: boolean = false;
	queueMapRebuild() {
		if (this.mapRebuilding) {
			return;
		}

		this.mapRebuilding = true;
		(async () => {
			this.destroy();
			console.log('Rebuilding map...');
			this.map = await createMapWithStyle(this.parent, this.style);
			this.setupMap();
			this.mapRebuilding = false;
		})();
	}

	setStyle(key: string) {
		if (this.style === key) return;
		this.style = key as GoogleMapStyle;
		this.queueMapRebuild();
	}

	setAnchor(lon: number, lat: number, heading: number) {
		if (this.anchor.heading !== heading) {
			this.anchor = {
				lat,
				lon,
				heading
			};

			this.referenceOverlay?.setAnchor({ lat, lng: lon });
			for (let overlay of this.overlays) {
				overlay.destroy();
			}
			this.overlays = [];
			this.overlayView?.setMap(null);
			this.overlayView?.unbindAll();
			this.overlayView = null;
			this.referenceOverlay?.unbindAll();
			this.referenceOverlay?.setMap(null);
			this.referenceOverlay = null;
			this.isSetup = false;

			this.setupMap();
		} else {
			this.anchor = {
				lat,
				lon,
				heading
			};
			this.referenceOverlay?.setAnchor({ lat, lng: lon });
		}
	}

	destroy(): void {
		console.log('destroying google map');
		if (this.scene) {
			this.scene.clear();
			this.scene.removeFromParent();
			this.scene = null;
		}
		for (let overlay of this.overlays) {
			overlay.destroy();
		}
		this.overlays = [];
		this.overlayView?.setMap(null);
		this.overlayView?.unbindAll();
		this.overlayView = null;
		this.referenceOverlay?.unbindAll();
		this.referenceOverlay?.setMap(null);
		this.isSetup = false;

		this.map.unbindAll();
		console.log('Destroying element', this.getDiv());
		this.getDiv().remove();
	}
}
