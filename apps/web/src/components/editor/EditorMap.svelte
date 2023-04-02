<script lang="ts">
	import { browser } from '$app/environment';
	import { normalizeWheel } from '$lib/client/normalizeWheel';
	import { Loader } from '@googlemaps/js-api-loader';
	import { getSvelteContext } from 'src/store/editor';
	import { isMobile } from 'src/store/responsive';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { initMap } from './overlays/Renderer';

	const { editor } = getSvelteContext();

	const { activeTool } = editor;

	let containerEl: HTMLElement | null = null;
	let map: google.maps.Map | null = null;

	let middleMouseDown = writable(false);
	let isScrolling = writable(false);

	$: canDrag = $isMobile || $activeTool == 'pan' || $isScrolling ? true : $middleMouseDown;

	$: {
		canDrag;
		$activeTool;
		if (map)
			map.setOptions({
				draggable: canDrag,
				draggableCursor: $activeTool == 'pan' ? 'grab' : 'default'
			});
	}

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
					center: { lat: -34.397, lng: 150.644 },
					zoom: 18,
					disableDefaultUI: true,
					mapId: '44130cd24e816b48',
					streetViewControl: false,
					draggableCursor: 'default',
					draggable: canDrag,
					gestureHandling: 'greedy',
					scrollwheel: true,
					isFractionalZoomEnabled: true,
					keyboardShortcuts: false
				});

				initMap(map);
			});
		}
	});

	function handleMouseDown(e: MouseEvent) {
		if (e.button === 1) $middleMouseDown = true;
	}

	function handleMouseUp(e: MouseEvent) {
		if (e.button === 1) $middleMouseDown = false;
	}

	function handleMouseWheel(e: WheelEvent) {
		if (map && !canDrag) {
			$isScrolling = true;

			setTimeout(() => {
				$isScrolling = false;
			}, 100);
		}
	}
</script>

<svelte:window on:mousewheel|capture={handleMouseWheel} />
<div
	class="h-full z-0"
	bind:this={containerEl}
	on:mousedown={handleMouseDown}
	on:mouseup={handleMouseUp}
/>
