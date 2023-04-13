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
	import { Cursors } from './cursors';
	import * as THREE from 'three';

	const { editor, broker } = getSvelteContext();
	const { geo, heading } = broker.watchCornerstone();

	const { activeTool, selectToolCursor } = editor;
	const mapStyle = broker.writableGlobalProperty('mapStyle', 'google-satellite');

	let containerEl: HTMLElement | null = null;
	let map: google.maps.Map | null = null;

	let leftMouseDown = writable(false);
	let middleMouseDown = writable(false);
	let isScrolling = writable(false);

	let overlays: Overlay[] = [];
	const overlayTypes: (typeof Overlay)[] = [SelectionOverlay, RendererOverlay];
	let referenceOverlay: ThreeJSOverlayView | null = null;

	let origin = { lat: 0, lng: 0 };

	$: canDrag = $isMobile || $activeTool == 'pan' || $isScrolling ? true : $middleMouseDown;

	$: {
		canDrag;
		$activeTool;
		if (map)
			map.setOptions({
				gestureHandling: canDrag ? 'greedy' : 'none',
				keyboardShortcuts: canDrag,
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

		if (map) {
			map.setOptions({
				mapTypeId: getMapTypeId(),
				mapId: getMapId(),
				tilt: 0
			});
		}
	}

	$: {
		$heading;
		$geo;
		if (map && referenceOverlay) {
			map.setHeading($heading);

			map.setCenter({
				lat: $geo[1],
				lng: $geo[0]
			});

			if ($geo[1] != 0 || $geo[0] != 0) {
				map.setZoom(18);
			} else {
				map.setZoom(1);
			}

			referenceOverlay.setAnchor({
				lat: $geo[1],
				lng: $geo[0]
			});

			let deg = -$heading;
			let rad = (deg / 180) * Math.PI;

			referenceOverlay.scene.rotateY(rad);
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
					center: {
						lat: $geo[1],
						lng: $geo[0]
					},
					zoom: $geo[1] != 0 || $geo[0] != 0 ? 18 : 1,
					heading: $heading,
					disableDefaultUI: true,

					mapId: getMapId(),
					mapTypeId: getMapTypeId(),
					streetViewControl: false,
					draggableCursor: 'default',
					gestureHandling: canDrag ? 'greedy' : 'none',
					keyboardShortcuts: canDrag,
					scrollwheel: true,
					isFractionalZoomEnabled: true
				});

				(window as any).editorMap = map;

				let scene = new THREE.Scene();
				let deg = -$heading;
				let rad = (deg / 180) * Math.PI;

				scene.rotateY(rad);

				referenceOverlay = new ThreeJSOverlayView({
					map,
					scene,
					upAxis: 'Y',
					anchor: map.getCenter()
				});

				editor.overlay.set(referenceOverlay);

				map.setTilt(0);

				map.addListener('mousemove', (ev: google.maps.MapMouseEvent) => {
					const { latLng } = ev;
					let mevent = ev.domEvent as MouseEvent;
					if (mevent.shiftKey && mevent.button == 0 && mevent.buttons == 1) {
						map?.setTilt(0);
					}

					let deg = -$heading;
					let rad = (deg / 180) * Math.PI;

					editor.currentMousePosition.set([latLng?.lat() ?? 0, latLng?.lng() ?? 0]);

					let vec = referenceOverlay?.latLngAltitudeToVector3({
						lat: latLng?.lat() ?? 0,
						lng: latLng?.lng() ?? 0,
						altitude: 0
					});

					editor.currentMousePositionRelative.set(
						broker.normalizeVector([vec?.x ?? 0, vec?.z ?? 0])
					);

					if (referenceOverlay) {
						let vectorPos = referenceOverlay.latLngAltitudeToVector3({
							lat: latLng?.lat() ?? 0,
							lng: latLng?.lng() ?? 0,
							altitude: 0
						});
						editor.desiredPosition = broker.normalizeVector([vectorPos.x, vectorPos.z]);
					}

					let e = ev.domEvent as MouseEvent;

					if (editor.currentToolHandlers) {
						editor.currentToolHandlers.onMove(e, editor, broker);
					}
				});

				map.addListener('mousedown', (ev: google.maps.MapMouseEvent) => {
					const { latLng } = ev;

					let deg = -$heading;
					let rad = (deg / 180) * Math.PI;

					editor.currentMousePosition.set([latLng?.lat() ?? 0, latLng?.lng() ?? 0]);

					let vec = referenceOverlay?.latLngAltitudeToVector3({
						lat: latLng?.lat() ?? 0,
						lng: latLng?.lng() ?? 0,
						altitude: 0
					});

					editor.currentMousePositionRelative.set(
						broker.normalizeVector([vec?.x ?? 0, vec?.z ?? 0])
					);

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

					let deg = -$heading;
					let rad = (deg / 180) * Math.PI;

					editor.currentMousePositionRelative.set(
						broker.normalizeVector([vec?.x ?? 0, vec?.z ?? 0])
					);

					let e = ev.domEvent as MouseEvent;
					if (e.button === 0) {
						if (editor.currentToolHandlers) {
							editor.currentToolHandlers.onUp(e, editor, broker);
						}
					}
				});

				// calculate constant scaling factor for in-map elements to stay the same size on screen
				function computeScaling() {
					if (!map) return;

					let bounds = map.getBounds();

					if (!bounds) return;

					let ne = bounds.getNorthEast();
					let sw = bounds.getSouthWest();

					let scale = Math.abs(ne.lat() - sw.lat()) * 800;
					editor.screenScale.set(scale);
				}

				map.addListener('zoom_changed', () => {
					computeScaling();
				});

				setTimeout(() => {
					computeScaling();
				}, 1000);

				computeScaling();

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
		if (e.button === 0) $leftMouseDown = true;
		if (e.button === 1) $middleMouseDown = true;
	}

	function handleMouseUp(e: MouseEvent) {
		if (e.button === 0) $leftMouseDown = false;
		if (e.button === 1) $middleMouseDown = false;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!canDrag && e.shiftKey) {
			e.preventDefault();
			e.stopPropagation();
		}
	}

	function handleMouseWheel(e: WheelEvent) {
		if (map && !canDrag) {
			$isScrolling = true;

			setTimeout(() => {
				$isScrolling = false;
			}, 100);
		}
	}

	let currentCursor: string = Cursors.default;

	// $: {
	// 	if (typeof window !== 'undefined') {
	// 		if (!canDrag) {
	// 			window.addEventListener('mousemove', handleMouseMove, { capture: true });
	// 		} else {
	// 			window.removeEventListener('mousemove', handleMouseMove, { capture: true });
	// 		}
	// 	}
	// }

	$: {
		currentCursor = Cursors.default;

		if ($middleMouseDown) {
			currentCursor = Cursors.grabbing;
		} else {
			if ($activeTool == 'select') {
				currentCursor = $selectToolCursor;
			} else if ($activeTool == 'pan') {
				currentCursor = $leftMouseDown ? Cursors.grabbing : Cursors.grab;
			} else if ($activeTool == 'pen') {
				currentCursor = Cursors.pen;
			} else if ($activeTool == 'comment') {
				currentCursor = Cursors.comment;
			}
		}
	}

	let topLeftCursors = [Cursors.default, Cursors.pen, Cursors.comment];
</script>

<svelte:window on:mousewheel|capture={handleMouseWheel} />

<div
	class="map-container h-full z-0"
	style="--cursor: url('{currentCursor}') {topLeftCursors.includes(currentCursor)
		? '0'
		: '12'} {topLeftCursors.includes(currentCursor) ? '0' : '12'}, auto"
	bind:this={containerEl}
	on:mousedown={handleMouseDown}
	on:mouseup={handleMouseUp}
/>

<style lang="scss">
	:global(.map-container *) {
		cursor: var(--cursor) !important;
	}
</style>
