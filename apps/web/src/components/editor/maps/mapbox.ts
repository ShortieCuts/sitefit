import mapboxgl from 'mapbox-gl'; // or "const mapboxgl = require('mapbox-gl');"

import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken =
	'pk.eyJ1IjoiYXNraW5ncXVlc3Rpb25zIiwiYSI6ImNrMmdiZGUydzBlMTIzbXBoYmtlOHZmNzUifQ.2MOqEq-x-o6SMYQnf4qKXQ';

import * as THREE from 'three';
import type { MapProviderOverlay, Overlay } from '../overlays/Overlay';
import {
	MapProvider,
	type MapMultiPolyInstance,
	type MapStyle,
	type MapMultiPolyValue
} from './generic';

type MapboxMapStyle = 'mapbox-satellite' | 'mapbox-simple' | 'mapbox-dark';

function getMapId(style: MapboxMapStyle) {
	if (style == 'mapbox-satellite')
		return 'mapbox://styles/askingquestions/clj2y4n3r033001pd1qbkc8u8';
	if (style == 'mapbox-simple') return 'mapbox://styles/askingquestions/clj2y84me030601qg3hjvhgdd';
	if (style == 'mapbox-dark') return 'mapbox://styles/askingquestions/clj2y8yn700tk01qq1alm00mq';
	if (style == 'mapbox-plain') return 'mapbox://styles/askingquestions/clj7qexix00g601qneuc5514s';
	return 'mapbox://styles/askingquestions/clj2y4n3r033001pd1qbkc8u8';
}
let existingPromise: Promise<typeof google.maps.Map> | null = null;

async function createMapWithStyle(
	parent: HTMLElement,
	style: MapboxMapStyle
): Promise<mapboxgl.Map> {
	let div = document.createElement('div');
	div.style.position = 'absolute';
	div.style.top = '0px';
	div.style.left = '0px';
	div.style.width = '100%';
	div.style.height = '100%';
	parent.appendChild(div);

	let map = new mapboxgl.Map({
		container: div,
		style: getMapId(style),
		boxZoom: false,
		center: {
			lat: 0,
			lng: 0
		},
		maxZoom: 30,
		zoom: 1,
		bearing: 0
	});
	return map;
}

export class MapboxMapsProvider extends MapProvider {
	map: mapboxgl.Map;
	style: MapboxMapStyle = 'mapbox-satellite';
	parent: HTMLElement;
	scaleFactor: number = 1;

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

	// referenceOverlay: ThreeJSOverlayView | null = null;
	// overlayView: google.maps.OverlayView | null = null;

	scene: THREE.Scene = new THREE.Scene();
	camera: THREE.Camera = new THREE.Camera();
	renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();

	static async createMap(parent: HTMLElement, makeOverlays: (map: MapProvider) => Overlay[]) {
		let map = await createMapWithStyle(parent, 'mapbox-satellite');

		return new MapboxMapsProvider(parent, map, makeOverlays);
	}

	constructor(
		parent: HTMLElement,
		map: mapboxgl.Map,
		makeOverlays: (map: MapProvider) => Overlay[]
	) {
		super();

		this.onMakeOverlays(makeOverlays);

		this.parent = parent;
		this.map = map;

		this.mapProviderOverlay = {
			getScene: () => {
				return this.scene;
			},
			lonLatToVector3: (lon, lat) => {
				if (isNaN(lon) || isNaN(lat)) return [0, 0];
				// if (!this.referenceOverlay) return new THREE.Vector3(0, 0, 0);
				let anchorPos = mapboxgl.MercatorCoordinate.fromLngLat(
					{ lng: this.anchor.lon, lat: this.anchor.lat },
					0
				);
				let pos = mapboxgl.MercatorCoordinate.fromLngLat({ lng: lon, lat }, 0);
				let scale = pos.meterInMercatorCoordinateUnits();
				return new THREE.Vector3((pos.x - anchorPos.x) / scale, 0, (pos.y - anchorPos.y) / scale);
				// return this.referenceOverlay.latLngAltitudeToVector3({
				// 	lat,
				// 	lng: lon
				// });
			},
			lonLatToContainerPixel: (lon, lat) => {
				if (isNaN(lon) || isNaN(lat)) return [0, 0];
				let screen = this.map.project(new mapboxgl.LngLat(lon, lat));
				return [screen.x, screen.y];
				// if (!this.overlayView) return [0, 0];
				// let proj = this.overlayView.getProjection();
				// if (!proj) return [0, 0];
				// let res = proj.fromLatLngToContainerPixel(new google.maps.LatLng(lat, lon));
				// if (!res) return [0, 0];
				// return [res.x, res.y];
			},
			requestRedraw: () => {
				// this.referenceOverlay?.requestRedraw();
				this.map.triggerRepaint();
			}
		};

		this.setupMap();
	}

	setupMap() {
		const map = this.map;

		if (this.cacheViewState.lat != 0 || this.cacheViewState.lng != 0) {
			this.setCenter(this.cacheViewState.lng, this.cacheViewState.lat);
			this.setZoom(this.cacheViewState.zoom);
		}
		map.on('render', () => {
			for (let overlay of this.overlays) {
				for (let draw of overlay.draws) {
					draw();
				}
			}
			this.listeners.draw.forEach((cb) => cb());
		});

		let middleDown = false;

		map.on('mousedown', (ev) => {
			if (ev.originalEvent.button == 1) {
				middleDown = true;
			}

			this.listeners.down.forEach((cb) =>
				cb({
					lon: ev.lngLat.lng,
					lat: ev.lngLat.lat,
					domEvent: ev.originalEvent as MouseEvent
				})
			);
		});

		map.on('mousemove', (ev) => {
			if (middleDown) {
				this.map.panBy(
					new mapboxgl.Point(-ev.originalEvent.movementX, -ev.originalEvent.movementY),
					{
						duration: 0
					}
				);
			}
			this.listeners.move.forEach((cb) =>
				cb({
					lon: ev.lngLat.lng,
					lat: ev.lngLat.lat,
					domEvent: ev.originalEvent as MouseEvent
				})
			);
		});

		map.on('click', (ev) => {
			this.listeners.click.forEach((cb) =>
				cb({
					lon: ev.lngLat.lng,
					lat: ev.lngLat.lat,
					domEvent: ev.originalEvent as MouseEvent
				})
			);
		});

		map.on('mouseup', (ev) => {
			if (ev.originalEvent.button == 1) {
				middleDown = false;
			}

			this.listeners.up.forEach((cb) =>
				cb({
					lon: ev.lngLat.lng,
					lat: ev.lngLat.lat,
					domEvent: ev.originalEvent as MouseEvent
				})
			);
		});

		map.on('zoom', () => {
			if (!map) return;
			let zoom = map.getZoom() ?? 0;
			this.listeners.zoom.forEach((cb) =>
				cb({
					zoom
				})
			);
		});

		map.on('move', () => {
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
					north: ne.lat,
					south: sw.lat,
					east: ne.lng,
					west: sw.lng
				})
			);

			this.computeScaling();
		});

		this.setupOverlays();
	}

	getOverlayProxy() {
		return this.mapProviderOverlay;
	}

	sourceCounter = 0;
	sources: MapMultiPolyInstance[] = [];
	refreshSources() {
		let sourceData = {
			type: 'geojson',
			data: {
				properties: {},
				type: 'FeatureCollection',
				features: [] as any[]
			}
		};

		for (let source of this.sources) {
			let data = source.getValue();
			if (data) {
				sourceData.data.features.push({
					type: 'Feature',
					geometry: {
						type: 'MultiPolygon',
						coordinates: data
					}
				});
			}
		}
		let sour = this.map.getSource('source');
		if (sour) {
			(sour as any).setData(sourceData.data);
		} else {
			this.map.addSource('source', sourceData as mapboxgl.AnySourceData);
		}

		if (!this.map.getLayer('source-fill')) {
			this.map.addLayer({
				id: 'source-fill',
				type: 'fill',
				source: 'source',
				paint: {
					'fill-color': '#ffeb3b',
					'fill-opacity': 0.01
				}
			});
		}

		if (!this.map.getLayer('source-line')) {
			this.map.addLayer({
				id: 'source-line',
				type: 'line',
				source: 'source',
				paint: {
					'line-color': '#ffeb3b',
					'line-width': 3
				}
			});
		}
	}
	addMultiPoly(val: MapMultiPolyValue): MapMultiPolyInstance {
		let key = `source`;

		let privateVal = val;

		let source = {
			key,
			destroy: () => {
				this.sources = this.sources.filter((x) => x.key != key);
				this.refreshSources();
			},
			setValue: (val: MapMultiPolyValue) => {
				privateVal = val;
				this.refreshSources();
			},
			getValue() {
				return privateVal;
			}
		} as MapMultiPolyInstance;

		this.sources.push(source);

		this.refreshSources();

		return source;
	}

	setupOverlays() {
		let scene = new THREE.Scene();
		let deg = -this.anchor.heading;
		let rad = (deg / 180) * Math.PI;

		scene.rotateY(rad);

		this.scene = scene;

		this.overlays = this.overlayFactory(this);

		this.map.on('style.load', () => {
			this.setCenter(this.cacheViewState.lng, this.cacheViewState.lat);
			this.map.addLayer(
				{
					id: '3d-model',
					type: 'custom',
					renderingMode: '3d',

					onAdd: (map, gl) => {
						this.camera = new THREE.Camera();

						// use the Mapbox GL JS map canvas for three.js
						this.renderer = new THREE.WebGLRenderer({
							canvas: map.getCanvas(),
							context: gl,
							antialias: true
						});

						this.renderer.autoClear = false;
					},
					render: (gl, matrix) => {
						let mercatorAnchor = mapboxgl.MercatorCoordinate.fromLngLat(
							{
								lng: this.anchor.lon,
								lat: this.anchor.lat
							},
							0
						);

						let scale = mercatorAnchor.meterInMercatorCoordinateUnits();

						const l = new THREE.Matrix4()
							.makeTranslation(mercatorAnchor.x, mercatorAnchor.y, mercatorAnchor.z ?? 0)
							.scale(new THREE.Vector3(scale, -scale, scale))
							.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));

						const m = new THREE.Matrix4().fromArray(matrix);

						this.camera.projectionMatrix = m.multiply(l);
						this.renderer.resetState();
						this.renderer.render(this.scene, this.camera);
						this.map.triggerRepaint();
					}
				},
				'waterway-label'
			);
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

		let scale = Math.abs(ne.lat - sw.lat) * 800;

		if (isNaN(scale)) {
			return;
		}

		this.scaleFactor = scale;
	}

	getScale(): number {
		return this.scaleFactor;
	}

	getDiv(): HTMLElement {
		return this.map.getContainer();
	}

	setInputMode(gestureHandling: 'greedy' | 'none', keyboardShortcuts: boolean) {
		if (gestureHandling == 'greedy') {
			this.map.dragPan.enable();
			this.map.dragRotate.enable();
			this.map.doubleClickZoom.disable();
			this.map.touchZoomRotate.enable();
			// this.map.scrollZoom.enable();
			this.map.keyboard.enable();
		} else {
			this.map.dragPan.disable();
			this.map.dragRotate.disable();
			this.map.doubleClickZoom.disable();
			this.map.touchZoomRotate.disable();
			// this.map.scrollZoom.disable();
			this.map.keyboard.disable();
		}
	}

	setHeading(heading: number) {
		this.map.setBearing(heading);
	}

	setTilt(tilt: number) {
		this.map.setPitch(tilt);
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

		return [center.lng, center.lat];
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
			north: ne.lat,
			south: sw.lat,
			east: ne.lng,
			west: sw.lng
		};
	}

	getHeading(): number {
		return this.map.getBearing();
	}

	getTilt(): number {
		return this.map.getPitch();
	}

	getMapType(): string {
		return this.style;
	}

	getStyles(): MapStyle[] {
		return [
			{
				key: 'mapbox-satellite',
				thumbnail: '/img/maps/mapbox-satellite.png',
				name: 'Satellite'
			},
			{
				key: 'mapbox-simple',
				thumbnail: '/img/maps/mapbox-simple.png',
				name: 'Simple'
			},
			{
				key: 'mapbox-dark',
				thumbnail: '/img/maps/mapbox-dark.png',
				name: 'Dark'
			}
		];
	}

	setStyle(key: string) {
		if (this.style === key) return;
		this.style = key as MapboxMapStyle;
		this.map.setStyle(getMapId(this.style));
	}

	setAnchor(lon: number, lat: number, heading: number) {
		if (this.anchor.heading !== heading) {
			this.anchor = {
				lat,
				lon,
				heading
			};
		} else {
			this.anchor = {
				lat,
				lon,
				heading
			};
		}
	}

	destroy(): void {
		for (let overlay of this.overlays) {
			overlay.destroy();
		}
		if (this.scene) {
			this.scene.clear();
			this.scene.removeFromParent();
			this.scene = null;
		}
		this.map.remove();
		this.overlays = [];
		this.getDiv().remove();
	}
}
