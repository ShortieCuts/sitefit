import { loadTile, type ParcelProvider, type Tile } from 'src/store/parcels';
import polygonClipping from 'polygon-clipping';
import { get } from 'svelte/store';
import type { EditorContext } from 'src/store/editor';
import type { MapProvider } from '../maps/generic';

const TILE_SIZE = 256;
function project(lonLat: [number, number]) {
	let siny = Math.sin((lonLat[1] * Math.PI) / 180);

	// Truncating to 0.9999 effectively limits latitude to 89.189. This is
	// about a third of a tile past the edge of the world tile.
	siny = Math.min(Math.max(siny, -0.9999), 0.9999);

	return [
		TILE_SIZE * (0.5 + lonLat[0] / 360),
		TILE_SIZE * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
	];
}

export class ParcelOverlay {
	map: MapProvider | null = null;
	provider: ParcelProvider;
	robustParcels: any = {};
	loadedTiles: Map<string, Tile | null> = new Map();
	destroyed = false;
	constructor(map: MapProvider, provider: ParcelProvider) {
		this.provider = provider;
		this.map = map;
	}

	destroy() {
		this.destroyed = true;
		let map = this.map;
		if (!map) return;
		for (let key in this.robustParcels) {
			if (this.robustParcels[key].data) this.robustParcels[key].data.destroy();
		}
	}

	async loadTile(lonLat: [number, number]) {
		if (this.destroyed) return;
		let robustParcels = this.robustParcels;
		let map = this.map;
		if (!map) return;

		let zoomFloored = Math.floor(map.getZoom() ?? 0);
		zoomFloored = 16;

		const scale = 1 << zoomFloored;

		const worldCoordinate = project(lonLat);

		const pixelCoordinate = new google.maps.Point(
			Math.floor(worldCoordinate[0] * scale),
			Math.floor(worldCoordinate[1] * scale)
		);

		const tileCoordinate = new google.maps.Point(
			Math.floor((worldCoordinate[0] * scale) / TILE_SIZE),
			Math.floor((worldCoordinate[1] * scale) / TILE_SIZE)
		);
		let tileKey = `${tileCoordinate.x},${tileCoordinate.y},${zoomFloored}`;
		if (this.loadedTiles.has(tileKey)) {
			return;
		}
		this.loadedTiles.set(tileKey, null);
		let t = await loadTile(tileCoordinate.x, tileCoordinate.y, zoomFloored, this.provider);
		if (this.destroyed) return;
		this.loadedTiles.set(tileKey, t);

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

			// let mp = new google.maps.Data.MultiPolygon(
			// 	geoOutput.map((g) => {
			// 		return new google.maps.Data.Polygon(g);
			// 	})
			// );
			if (!d.data) {
				let inst = map.addMultiPoly(output);
				d.data = inst;
			} else {
				d.data.setValue(output);
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

			let ne = { lat: bounds.north, lng: bounds.east };
			let sw = { lat: bounds.south, lng: bounds.west };
			let lerpSteps = 4;
			for (let x = 0; x <= lerpSteps; x++) {
				for (let y = 0; y <= lerpSteps; y++) {
					let lonLat: [number, number] = [
						lerp(sw.lng, ne.lng, y / lerpSteps),
						lerp(sw.lat, ne.lat, x / lerpSteps)
					];
					await this.loadTile(lonLat);
				}
			}

			// this.loadTile(center);
		}
	}
}

function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t;
}
