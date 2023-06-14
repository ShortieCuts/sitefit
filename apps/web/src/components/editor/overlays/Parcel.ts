import { loadTile, type ParcelProvider, type Tile } from 'src/store/parcels';
import polygonClipping from 'polygon-clipping';
import { get } from 'svelte/store';
import type { EditorContext } from 'src/store/editor';

const TILE_SIZE = 256;
function project(latLng: google.maps.LatLng) {
	let siny = Math.sin((latLng.lat() * Math.PI) / 180);

	// Truncating to 0.9999 effectively limits latitude to 89.189. This is
	// about a third of a tile past the edge of the world tile.
	siny = Math.min(Math.max(siny, -0.9999), 0.9999);

	return new google.maps.Point(
		TILE_SIZE * (0.5 + latLng.lng() / 360),
		TILE_SIZE * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
	);
}

export class ParcelOverlay {
	map: google.maps.Map | null = null;
	provider: ParcelProvider;
	robustParcels: any = {};
	loadedTiles: Map<string, Tile | null> = new Map();
	destroyed = false;
	constructor(map: google.maps.Map, provider: ParcelProvider) {
		this.provider = provider;
		this.map = map;
	}

	destroy() {
		this.destroyed = true;
		let map = this.map;
		if (!map) return;
		for (let key in this.robustParcels) {
			if (this.robustParcels[key].data) map.data.remove(this.robustParcels[key].data);
		}
	}

	async loadTile(latLng: google.maps.LatLng) {
		if (this.destroyed) return;
		let robustParcels = this.robustParcels;
		let map = this.map;
		if (!map) return;

		let zoomFloored = Math.floor(map.getZoom() ?? 0);
		zoomFloored = 16;

		const scale = 1 << zoomFloored;

		const worldCoordinate = project(latLng);

		const pixelCoordinate = new google.maps.Point(
			Math.floor(worldCoordinate.x * scale),
			Math.floor(worldCoordinate.y * scale)
		);

		const tileCoordinate = new google.maps.Point(
			Math.floor((worldCoordinate.x * scale) / TILE_SIZE),
			Math.floor((worldCoordinate.y * scale) / TILE_SIZE)
		);
		let tileKey = `${tileCoordinate.x},${tileCoordinate.y},${zoomFloored}`;
		if (this.loadedTiles.has(tileKey)) {
			return;
		}
		this.loadedTiles.set(tileKey, null);
		let t = await loadTile(tileCoordinate.x, tileCoordinate.y, zoomFloored, this.provider);
		if (this.destroyed) return;
		this.loadedTiles.set(tileKey, t);
		const featureStyleOptions: google.maps.FeatureStyleOptions = {
			strokeColor: '#ffeb3b',
			strokeOpacity: 1.0,
			strokeWeight: 3.0,
			fillColor: '#ffeb3b',
			fillOpacity: 0.01
		};
		map.data.setStyle(featureStyleOptions);

		for (let poly of t.geoJson) {
			if (!robustParcels[poly.properties.robust_id]) {
				let multiPoly = [];
				if (poly.geometry.type == 'MultiPolygon') {
					multiPoly = poly.geometry.coordinates;
				} else {
					multiPoly = [poly.geometry.coordinates];
				}
				robustParcels[poly.properties.robust_id] = {
					data: undefined,
					poly: multiPoly,
					geo: {}
				};
			}

			let key = `${tileCoordinate.x},${tileCoordinate.y},${zoomFloored}`;

			let d = robustParcels[poly.properties.robust_id];
			if (d.geo[key]) {
				continue;
			}

			d.geo[key] = poly.geometry.coordinates.map((c) => {
				return c.map((p) => {
					return p;
				});
			});

			// Merge geometries
			let multiPoly = [];
			if (poly.geometry.type == 'MultiPolygon') {
				multiPoly = poly.geometry.coordinates;
			} else {
				multiPoly = [poly.geometry.coordinates];
			}

			let output = polygonClipping.union(...d.poly, ...multiPoly);

			d.poly = output;

			let geoOutput = output.map((a) => {
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
			if (!d.data) {
				d.data = map.data.add({ geometry: mp });
			} else {
				d.data.setGeometry(mp);
			}
		}
	}

	async loadViewport() {
		let map = this.map;
		if (!map) return;

		let zoomFloored = Math.floor(map.getZoom() ?? 0);
		if (zoomFloored >= 17) {
			if (!map) return;
			let center = map.getCenter();
			if (!center) return;

			let bounds = map.getBounds();
			if (!bounds) return;

			let ne = bounds.getNorthEast();
			let sw = bounds.getSouthWest();
			let lerpSteps = 4;
			for (let x = 0; x <= lerpSteps; x++) {
				for (let y = 0; y <= lerpSteps; y++) {
					let latLng = new google.maps.LatLng(
						lerp(sw.lat(), ne.lat(), x / lerpSteps),
						lerp(sw.lng(), ne.lng(), y / lerpSteps)
					);
					await this.loadTile(latLng);
				}
			}

			// this.loadTile(center);
		}
	}
}

function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t;
}
