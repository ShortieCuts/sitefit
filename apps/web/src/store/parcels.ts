import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { get, writable } from 'svelte/store';

import parse from 'wellknown';

export type ParcelProvider = 'reportall' | 'regrid';

export type Parcel = {
	raw: any;
};

export const loadedThisSession = writable(0);
const MAX_LOADED = 100;

type GeoJSON = {
	geometry: {
		type: 'Polygon' | 'MultiPolygon';
		coordinates: number[][][];
	};
	properties: {
		robust_id: string;
	};
	type: 'Feature';
};

type GeoJSONGeometry =
	| {
			type: 'MultiPolygon';
			coordinates: number[][][][];
	  }
	| {
			type: 'Polygon';
			coordinates: number[][][];
	  };

export type Tile = {
	x: number;
	y: number;
	zoom: number;
	rawGoogleMapsData?: any;
	geoJson: GeoJSON[];
};

export type ParcelData = {
	owner: string;
	geometry: GeoJSONGeometry;
	address_street: string;
	latitude: number;
	longitude: number;
	county: string;
	id: string;
};

type TileKey = `${number},${number},${number},${ParcelProvider}`;

let cachedTiles: Map<TileKey, Tile> = new Map();

type Provider = {
	loadTile(x: number, y: number, zoom: number): Promise<Tile>;
	loadParcel(lon: number, lat: number): Promise<ParcelData | null>;
};

const Providers: Record<ParcelProvider, Provider> = {
	reportall: {
		loadTile: async (x, y, zoom) => {
			let fetched = await fetch(
				`https://reportallusa.com/api/rest_services/client=TvPfJ4QxHO/ParcelsVectorTile/MapBoxVectorTileServer/tile/${zoom}/${x}/${y}.mvt`
			).then((res) => res.arrayBuffer());
			let tile = new VectorTile(new Protobuf(fetched));

			let parcels = tile.layers.parcels;
			if (!parcels) {
				return {
					x,
					y,
					zoom,
					raw: tile,
					geoJson: []
				} as Tile;
			}
			let features = parcels.length;

			let geos: GeoJSON[] = [];
			for (let i = 0; i < features; i++) {
				let feature = parcels.feature(i);
				geos.push(feature.toGeoJSON(x, y, zoom));
			}
			return {
				x,
				y,
				zoom,
				raw: tile,
				geoJson: geos
			} as Tile;
		},
		loadParcel: async (lon, lat) => {
			let results = (await fetch(
				`https://reportallusa.com/api/parcels?client=TvPfJ4QxHO&v=4&rpp=1&spatial_intersect=POINT(${lon}%20${lat})&si_srid=4326`
			).then((res) => res.json())) as any;

			if (results.results.length === 0) {
				return null;
			} else {
				let res = results.results[0];
				return {
					id: res.parcel_id,
					address_street:
						res.mail_address1 + ' ' + (res.mail_address2 ?? '') + ' ' + (res.mail_address3 ?? ''),
					county: res.county_name,
					geometry: parse(res.geom_as_wkt),
					latitude: res.latitude,
					longitude: res.longitude,
					owner: res.owner_name
				} as ParcelData;
			}
		}
	},
	regrid: {
		loadTile: async (x, y, zoom) => {
			let fetched = await fetch(
				`https://tiles.regrid.com/api/v1/parcels/${zoom}/${x}/${y}.mvt?token=eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJyZWdyaWQuY29tIiwiaWF0IjoxNjg2NjgyMzMxLCJleHAiOjE2ODkyNzQzMzEsInUiOjI0MDY2OSwiZyI6MjMxNTMsImNhcCI6InBhOnRzOnBzOmJmOm1hOnR5OmVvOnNiIn0.VIYB-WaARmk5v2eTBnIu3wvacE-2E0Kvw0ktkxi79Vo`
			).then((res) => res.arrayBuffer());
			let tile = new VectorTile(new Protobuf(fetched));

			let parcels = tile.layers.parcels;
			if (!parcels) {
				return {
					x,
					y,
					zoom,
					raw: tile,
					geoJson: []
				} as Tile;
			}

			let features = parcels.length;

			let geos: GeoJSON[] = [];
			for (let i = 0; i < features; i++) {
				let feature = parcels.feature(i);
				let featureData = feature.toGeoJSON(x, y, zoom);
				featureData.properties.robust_id = featureData.properties.fid?.toString() ?? ' ';
				geos.push(featureData);
			}
			return {
				x,
				y,
				zoom,
				raw: tile,
				geoJson: geos
			} as Tile;
		},
		loadParcel: async (lon, lat) => {
			let results = (await fetch(
				`https://app.regrid.com/api/v1/search.json?radius=1&limit=1&lat=${lat}&lon=${lon}&token=eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJyZWdyaWQuY29tIiwiaWF0IjoxNjg2NjgyMzMxLCJleHAiOjE2ODkyNzQzMzEsInUiOjI0MDY2OSwiZyI6MjMxNTMsImNhcCI6InBhOnRzOnBzOmJmOm1hOnR5OmVvOnNiIn0.VIYB-WaARmk5v2eTBnIu3wvacE-2E0Kvw0ktkxi79Vo`
			).then((res) => res.json())) as any;

			if (results.results.length === 0) {
				return null;
			} else {
				let res = results.results[0];
				return {
					id: res.properties.fields.parcelnumb,
					address_street: res.properties.fields.mailadd,
					county: res.properties.fields.county,
					geometry: res.geometry,
					latitude: res.properties.fields.lat,
					longitude: res.properties.fields.lon,
					owner: res.properties.fields.owner
				} as ParcelData;
			}
		}
	}
};

export async function loadTile(
	x: number,
	y: number,
	zoom: number,
	provider: ParcelProvider
): Promise<Tile> {
	let key: TileKey = `${x},${y},${zoom},${provider}`;
	if (get(loadedThisSession) > MAX_LOADED) {
		return {
			x,
			y,
			zoom,
			geoJson: []
		};
	}

	if (cachedTiles.has(key)) {
		return cachedTiles.get(key)!;
	}

	loadedThisSession.update((n) => n + 1);
	let tile = await Providers[provider].loadTile(x, y, zoom);
	cachedTiles.set(key, tile);
	return tile;
}

export async function loadParcel(
	lon: number,
	lat: number,
	provider: ParcelProvider
): Promise<any | null> {
	return await Providers[provider].loadParcel(lon, lat);
}
