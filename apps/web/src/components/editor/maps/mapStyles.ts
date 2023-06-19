import type { ProjectMapStyle } from 'core';

export const MAP_STYLES: {
	key: ProjectMapStyle;
	image: string;
	name: string;
}[] = [
	{
		key: 'google-satellite',
		image: '/img/maps/google-satellite.png',
		name: 'Google Satellite'
	},
	{
		key: 'google-simple',
		image: '/img/maps/google-simple.png',
		name: 'Google Simple'
	},
	{
		key: 'google-dark',
		image: '/img/maps/google-dark.png',
		name: 'Google Dark'
	},
	{
		key: 'mapbox-satellite',
		image: '/img/maps/mapbox-satellite.png',
		name: 'Mabbox Satellite'
	},
	{
		key: 'mapbox-simple',
		image: '/img/maps/mapbox-simple.png',
		name: 'Mapbox Simple'
	},
	{
		key: 'mapbox-dark',
		image: '/img/maps/mapbox-dark.png',
		name: 'Mapbox Dark'
	}
];
