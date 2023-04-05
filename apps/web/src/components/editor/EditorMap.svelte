<script lang="ts">
	import { browser } from '$app/environment';
	import { normalizeWheel } from '$lib/client/normalizeWheel';
	import { Loader } from '@googlemaps/js-api-loader';
	import { ThreeJSOverlayView } from '@googlemaps/three';
	import { getSvelteContext } from 'src/store/editor';
	import { isMobile } from 'src/store/responsive';
	import { onDestroy, onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import type { Overlay } from './overlays/Overlay';
	import { RendererOverlay } from './overlays/Renderer';
	import { SelectionOverlay } from './overlays/Selection';

	const { editor, broker } = getSvelteContext();

	const { activeTool } = editor;
	const mapStyle = broker.writableGlobalProperty('mapStyle', 'google-satellite');

	let containerEl: HTMLElement | null = null;
	let map: google.maps.Map | null = null;

	let middleMouseDown = writable(false);
	let isScrolling = writable(false);

	let overlays: Overlay[] = [];
	const overlayTypes: (typeof Overlay)[] = [SelectionOverlay, RendererOverlay];
	let referenceOverlay: ThreeJSOverlayView | null = null;

	let origin = { lat: -34.397, lng: 150.644 };

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

	function rebuildOverlays(map: google.maps.Map) {
		if (!referenceOverlay) return;

		for (const overlay of overlays) {
			overlay.destroy();
		}

		overlays = [];

		for (let i = 0; i < overlayTypes.length; i++) {
			const overlay = new overlayTypes[i](map, referenceOverlay, editor, broker);
			overlays.push(overlay);
		}

		overlays.forEach((overlay) => overlay.init());
	}

	function getMapId() {
		if ($mapStyle == 'google-satellite') return 'c0f380f46a9601c5';
		if ($mapStyle == 'google-simple') return '44130cd24e816b48';
		return 'c0f380f46a9601c5';
	}
	function getMapTypeId() {
		if ($mapStyle == 'google-satellite') return google.maps.MapTypeId.HYBRID;
		if ($mapStyle == 'google-simple') return google.maps.MapTypeId.ROADMAP;
		return google.maps.MapTypeId.HYBRID;
	}

	$: {
		$mapStyle;
		console.log('map style changed', $mapStyle, getMapId());

		if (map) {
			map.setOptions({
				mapTypeId: getMapTypeId(),
				mapId: getMapId(),
				tilt: 0
			});
		}
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
					center: origin,
					zoom: 18,
					disableDefaultUI: true,
					mapId: getMapId(),
					mapTypeId: getMapTypeId(),
					streetViewControl: false,
					draggableCursor: 'default',
					draggable: canDrag,
					gestureHandling: 'greedy',
					scrollwheel: true,
					isFractionalZoomEnabled: true,

					keyboardShortcuts: false
				});

				referenceOverlay = new ThreeJSOverlayView({
					map,
					upAxis: 'Y',
					anchor: map.getCenter()
				});

				editor.overlay.set(referenceOverlay);

				map.setTilt(0);

				map.addListener('mousemove', (ev: google.maps.MapMouseEvent) => {
					const { latLng } = ev;

					editor.currentMousePosition.set([latLng?.lat() ?? 0, latLng?.lng() ?? 0]);

					let vec = referenceOverlay?.latLngAltitudeToVector3({
						lat: latLng?.lat() ?? 0,
						lng: latLng?.lng() ?? 0,
						altitude: 0
					});

					editor.currentMousePositionRelative.set([vec?.x ?? 0, vec?.z ?? 0]);

					if (referenceOverlay) {
						let vectorPos = referenceOverlay.latLngAltitudeToVector3({
							lat: latLng?.lat() ?? 0,
							lng: latLng?.lng() ?? 0,
							altitude: 0
						});
						editor.desiredPosition = [vectorPos.x, vectorPos.z];
					}

					let e = ev.domEvent as MouseEvent;

					if (editor.currentToolHandlers) {
						editor.currentToolHandlers.onMove(e, editor, broker);
					}
				});

				map.addListener('mousedown', (ev: google.maps.MapMouseEvent) => {
					const { latLng } = ev;

					editor.currentMousePosition.set([latLng?.lat() ?? 0, latLng?.lng() ?? 0]);

					let vec = referenceOverlay?.latLngAltitudeToVector3({
						lat: latLng?.lat() ?? 0,
						lng: latLng?.lng() ?? 0,
						altitude: 0
					});

					editor.currentMousePositionRelative.set([vec?.x ?? 0, vec?.z ?? 0]);

					let e = ev.domEvent as MouseEvent;

					if (e.button === 0) {
						if (editor.currentToolHandlers) {
							editor.currentToolHandlers.onDown(e, editor, broker);
						}
					}
				});

				map.addListener('mouseup', (ev: google.maps.MapMouseEvent) => {
					const { latLng } = ev;

					editor.currentMousePosition.set([latLng?.lat() ?? 0, latLng?.lng() ?? 0]);

					let vec = referenceOverlay?.latLngAltitudeToVector3({
						lat: latLng?.lat() ?? 0,
						lng: latLng?.lng() ?? 0,
						altitude: 0
					});

					editor.currentMousePositionRelative.set([vec?.x ?? 0, vec?.z ?? 0]);

					let e = ev.domEvent as MouseEvent;
					if (e.button === 0) {
						if (editor.currentToolHandlers) {
							editor.currentToolHandlers.onUp(e, editor, broker);
						}
					}
				});

				rebuildOverlays(map);
			});
		}
	});

	onDestroy(() => {
		for (const overlay of overlays) {
			overlay.destroy();
		}
	});

	function handleMouseDown(e: MouseEvent) {
		if (e.button === 1) $middleMouseDown = true;
	}

	function handleMouseUp(e: MouseEvent) {
		if (e.button === 1) $middleMouseDown = false;
	}

	function handleMouseMove(e: MouseEvent) {}

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
	on:mousemove={handleMouseMove}
/>
