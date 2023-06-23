<script lang="ts">
	import { browser } from '$app/environment';
	import { Loader } from '@googlemaps/js-api-loader';

	import { onDestroy, onMount } from 'svelte';

	let containerEl: HTMLElement | null = null;
	export let map: google.maps.Map | null = null;
	export let location: [number, number, number] = [0, 0, 0];

	let myLocation = [...location];

	onMount(() => {
		if (browser) {
			const loader = new Loader({
				apiKey: 'AIzaSyDhS6djMo2An6CdMlEY1zMQUkRGorXI7SU',
				version: 'weekly'
			});

			loader.load().then(async () => {
				if (!containerEl) return;

				const { Map } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;
				map = new Map(containerEl, {
					center: {
						lat: location[1],
						lng: location[0]
					},
					mapId: 'c0f380f46a9601c5',
					zoom: location[1] == 0 && location[0] == 0 ? 1 : 18,
					disableDefaultUI: true,
					scaleControl: false,
					zoomControl: false,
					fullscreenControl: false,
					mapTypeControl: false,

					heading: location[2],
					tilt: 0,

					mapTypeId: google.maps.MapTypeId.HYBRID,
					streetViewControl: false,
					draggableCursor: 'default',
					gestureHandling: 'greedy',
					keyboardShortcuts: false,
					scrollwheel: true,
					isFractionalZoomEnabled: true
				});
				map.addListener('center_changed', () => {
					const center = map?.getCenter();
					location = [center?.lng() ?? 0, center?.lat() ?? 0, location[2]];
					myLocation = [...location];
				});
				map.addListener('heading_changed', () => {
					location = [location[0], location[1], map?.getHeading() ?? 0];
					myLocation = [...location];
				});

				map.addListener('tilt_changed', () => {
					if (map?.getTilt() != 0) {
						map?.setTilt(0);
					}
				});
			});
		}
	});

	$: {
		if (map) {
			if (
				myLocation[0] != location[0] ||
				myLocation[1] != location[1] ||
				myLocation[2] != location[2]
			) {
				try {
					map.setCenter({
						lat: location[1],
						lng: location[0]
					});

					map.setHeading(location[2]);
				} catch (e) {
					console.error(e);
				}
			}
		}
	}
</script>

<div class="map-container h-full" bind:this={containerEl} />

<style lang="scss">
	:global(.map-container *) {
		cursor: var(--cursor) !important;
	}
</style>
