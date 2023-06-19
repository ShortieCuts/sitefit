<script lang="ts">
	import { browser } from '$app/environment';
	import { normalizeWheel } from '$lib/client/normalizeWheel';
	import { Loader } from '@googlemaps/js-api-loader';
	import { ThreeJSOverlayView } from '@googlemaps/three';
	import { EditorContext, getSvelteContext } from 'src/store/editor';
	import { isMobile } from 'src/store/responsive';
	import { onDestroy, onMount } from 'svelte';
	import { get, writable } from 'svelte/store';
	import type { Overlay } from './overlays/Overlay';
	import { RendererOverlay } from './overlays/Renderer';
	import { SelectionOverlay } from './overlays/Selection';
	import { Cursors } from './cursors';
	import * as THREE from 'three';
	import Flatten from '@flatten-js/core';
	import { GuidesOverlay } from './overlays/Guides';
	import { calculateGuides } from './tools/select';
	import { getDraggable } from 'src/store/draggable';
	import { faCompactDisc, faCompass, faTextHeight } from '@fortawesome/free-solid-svg-icons';
	import { translateDXF } from '$lib/util/dxf';
	import { ObjectType, type Object2D } from 'core';
	import { SuperZoomLayer } from '$lib/map/super-zoom-layer';
	import { ZoomRangeModifierService } from '$lib/map/zoom-range-modifier-service';
	import { SuperZoomMapType } from '$lib/map/super-zoom-map-type';
	import Fa from 'svelte-fa';
	import { fade, fly } from 'svelte/transition';
	import { loadTile, type Parcel, type ParcelProvider } from 'src/store/parcels';
	import { ParcelOverlay } from './overlays/Parcel';
	import type { MapProvider, MouseMapEvent } from './maps/generic';
	import { GoogleMapsProvider } from './maps/google';
	import { MapboxMapsProvider } from './maps/mapbox';
	import { MAP_STYLES } from './maps/mapStyles';

	const MIN_ZOOM = 1;
	const MAX_ZOOM = 45;
	const ENABLE_TRACKPAD_PAN = false;

	const { editor, broker } = getSvelteContext();
	const { geo, heading } = broker.watchCornerstone();
	const zoomLevel = writable(0);

	const {
		activeTool,
		activeDialog,
		selectToolCursor,
		hoveringObject,
		selection,
		translating,
		scaling,
		rotating,
		parcelProvider
	} = editor;
	const mapStyle = broker.writableGlobalProperty('mapStyle', 'google-satellite');

	let containerEl: HTMLElement;

	const mapProviders = {
		google: GoogleMapsProvider,
		mapbox: MapboxMapsProvider
	};
	let map: MapProvider | null = null;

	let buildingMap = false;

	async function buildMap() {
		if (buildingMap) return;

		buildingMap = true;
		try {
			console.log('Building map');
			let cachedLonLat = {
				lng: 0,
				lat: 0,
				zoom: 0
			};
			if (map) {
				let scaleFactorDiff = 1;
				if (map instanceof MapboxMapsProvider || map instanceof GoogleMapsProvider) {
					cachedLonLat = { ...map.cacheViewState };
				}
				if (map instanceof GoogleMapsProvider) {
					if ($mapStyle.startsWith('mapbox')) {
						scaleFactorDiff = -1;
					} else {
						scaleFactorDiff = 0;
					}
				} else if (map instanceof MapboxMapsProvider) {
					if ($mapStyle.startsWith('google')) {
						scaleFactorDiff = 1;
					} else {
						scaleFactorDiff = 0;
					}
				}
				cachedLonLat.zoom += scaleFactorDiff;
				map.destroy();
				map = null;
			}

			let makeOverlays = (map: MapProvider) => {
				overlays = [];
				for (let overlayType of overlayTypes) {
					overlays.push(new overlayType(map, map.getOverlayProxy(), editor, broker));
				}

				return [...overlays];
			};

			if ($mapStyle.startsWith('mapbox')) {
				map = await mapProviders.mapbox.createMap(containerEl, makeOverlays);
			} else if ($mapStyle.startsWith('google')) {
				map = await mapProviders.google.createMap(containerEl, makeOverlays);
			}
			if (!map) return;
			let geoData = $geo;
			map.setAnchor(geoData[0], geoData[1], $heading);
			map.setStyle($mapStyle);

			editor.map.set(map);
			editor.overlay.set(map.getOverlayProxy());
			broker.markAllDirty();
			broker.needsRender.set(true);

			if (!map) return;

			map.setZoom($zoomLevel);

			flyToLatestCad();

			if (cachedLonLat.lat !== 0 || cachedLonLat.lng !== 0) {
				map.setCenter(cachedLonLat.lng, cachedLonLat.lat);
				map.setZoom(cachedLonLat.zoom);

				if (map instanceof GoogleMapsProvider || map instanceof MapboxMapsProvider) {
					map.cacheViewState = { ...cachedLonLat };
				}
			}
			console.log('Map', map);

			map.onDraw(() => {
				updateSvelteOverlays();
			});

			map.onMove((ev) => {
				if (!map) return;

				let mevent = ev.domEvent as MouseEvent;
				if (mevent.shiftKey && mevent.button == 0 && mevent.buttons == 1) {
					map?.setTilt(0);
				}

				let deg = -$heading;
				let rad = (deg / 180) * Math.PI;

				editor.currentMousePosition.set([ev.lat, ev.lon]);
				editor.currentMousePositionScreen.set([mevent.clientX, mevent.clientY]);
				const referenceOverlay = map.getOverlayProxy();
				let vec = referenceOverlay.lonLatToVector3(ev.lon, ev.lat);

				editor.currentMousePositionRelative.set(broker.normalizeVector([vec?.x ?? 0, vec?.z ?? 0]));

				if (referenceOverlay) {
					let vectorPos = referenceOverlay.lonLatToVector3(ev.lon, ev.lat);
					let normalized = broker.normalizeVector([vectorPos.x, vectorPos.z]);
					let deltaX = 0;
					let deltaY = 0;

					if (
						get(editor.activeTool) == 'pen' ||
						get(editor.activeTool) == 'measurement' ||
						get(editor.activeTool) == 'area' ||
						get(editor.activeTool) == 'smart' ||
						get(editor.editingObject)
					) {
						if (!(ev.domEvent as MouseEvent).ctrlKey) {
							let guides = calculateGuides(
								editor,
								broker,
								Flatten.point(normalized[0], normalized[1])
							);
							if (guides.lines.length > 0 || guides.points.length > 0) {
								editor.guides.set({
									lines: guides.lines.map((l) => [
										[l.start.x, l.start.y],
										[l.end.x, l.end.y]
									]),
									points: guides.points.map((p) => [p.x, p.y])
								});
								deltaX = guides.translation[0];
								deltaY = guides.translation[1];
							} else {
								editor.guides.set({
									lines: [],
									points: []
								});
							}
						}
					}
					editor.desiredPosition = [normalized[0] + deltaX, normalized[1] + deltaY];
				}

				let e = ev.domEvent as MouseEvent;

				if (editor.currentToolHandlers) {
					editor.currentToolHandlers.onMove(e, editor, broker);
				}

				if (get(filesDraggable.dragging)) {
					let draggingCad = get(filesDraggable.payload);

					if (previewCad != draggingCad) {
						previewCad = draggingCad;
						(async () => {
							let rawDXF = await fetch('/api/cad/' + previewCad).then((res) => res.text());

							if (!get(filesDraggable.dragging)) {
								return;
							}

							let objects = translateDXF(rawDXF);

							if (!objects) {
								return;
							}

							let bounds = computeBoundsMulti(objects);

							previewCadOffsets = {
								x: (bounds.maxX + bounds.minX) / 2,
								y: (bounds.maxY + bounds.minY) / 2
							};

							editor.previewObjects.set(objects);
							for (let object of objects) {
								(object as any).$originalPosition = [
									object.transform.position[0],
									object.transform.position[1]
								];
							}

							for (let object of objects) {
								let anyObj = object as any;
								object.transform.position[0] =
									anyObj.$originalPosition[0] + editor.desiredPosition[0] - previewCadOffsets.x;
								object.transform.position[1] =
									anyObj.$originalPosition[1] + editor.desiredPosition[1] - previewCadOffsets.y;
							}

							editor.needsPreviewRender.set(true);
						})();
					}

					let objects = get(editor.previewObjects);
					for (let object of objects) {
						let anyObj = object as any;
						object.transform.position[0] =
							anyObj.$originalPosition[0] + editor.desiredPosition[0] - previewCadOffsets.x;
						object.transform.position[1] =
							anyObj.$originalPosition[1] + editor.desiredPosition[1] - previewCadOffsets.y;
					}

					editor.needsPreviewRender.set(true);
				} else {
					if (previewCad) {
						previewCad = '';
						editor.previewObjects.set([]);
					}
				}
			});

			function handleMapTap(ev: MouseMapEvent) {
				if (!map) return;

				const referenceOverlay = map.getOverlayProxy();

				let deg = -$heading;
				let rad = (deg / 180) * Math.PI;

				editor.currentMousePosition.set([ev.lat, ev.lon]);

				let vec = referenceOverlay.lonLatToVector3(ev.lon, ev.lat);

				editor.currentMousePositionRelative.set(broker.normalizeVector([vec?.x ?? 0, vec?.z ?? 0]));

				let e = ev.domEvent as MouseEvent;

				if (e.button === 0) {
					if (editor.currentToolHandlers) {
						editor.currentToolHandlers.onDown(e, editor, broker);
					}
				} else if (e.button == 2) {
					if (
						editor.currentToolHandlers &&
						($activeTool == 'area' || $activeTool == 'measurement')
					) {
						// editor.currentToolHandlers.onDown(e, editor, broker);
						editor.currentToolHandlers.commit(editor, broker);
						e.preventDefault();
					}
				}
			}

			map.onDown((ev: MouseMapEvent) => {
				if ($isMobile) return;
				handleMapTap(ev);
				if (get(editor.activeTool) != 'comment') {
					editor.stagingComment.set(null);
				}
			});

			map.onClick((ev: MouseMapEvent) => {
				if (get(editor.activeDialog) == 'parcels') {
					editor.selectedParcelLonLat.set([ev.lon, ev.lat]);
				}

				if (!$isMobile) return;

				handleMapTap(ev);
			});

			map.onUp((ev: MouseMapEvent) => {
				if (!map) return;

				const referenceOverlay = map.getOverlayProxy();

				editor.currentMousePosition.set([ev.lat, ev.lon]);

				let vec = referenceOverlay.lonLatToVector3(ev.lon, ev.lat);

				let deg = -$heading;
				let rad = (deg / 180) * Math.PI;

				editor.currentMousePositionRelative.set(broker.normalizeVector([vec?.x ?? 0, vec?.z ?? 0]));

				let e = ev.domEvent as MouseEvent;
				if (e.button === 0) {
					if (editor.currentToolHandlers) {
						editor.currentToolHandlers.onUp(e, editor, broker);
					}
				}
			});

			map.onZoom(() => {
				if (!map) return;

				editor.zoom.set(map.getZoom());
				zoomLevel.set(map.getZoom());
			});

			let updateTimer = 0;
			let lastFrame = Date.now();
			let frameEvent = () => {
				requestAnimationFrame(frameEvent);
				if (!map) return;
				let now = Date.now();
				let delta = now - lastFrame;
				lastFrame = now;
				if (updateTimer > 0) {
					updateTimer -= delta;
					if ($isMobile) {
						if (!map) return;
						let center = map.getCenter();
						if (!center) return;
						let latLng = map.getCenter();

						let deg = -$heading;
						let rad = (deg / 180) * Math.PI;

						editor.currentMousePosition.set([latLng[1], latLng[0]]);
						const referenceOverlay = map.getOverlayProxy();
						let vec = referenceOverlay.lonLatToVector3(latLng[0], latLng[1]);

						editor.currentMousePositionRelative.set(
							broker.normalizeVector([vec?.x ?? 0, vec?.z ?? 0])
						);

						if (editor.currentToolHandlers) {
							editor.currentToolHandlers.onMove(new MouseEvent('move'), editor, broker);
						}

						editor.desiredPosition = broker.normalizeVector([vec?.x ?? 0, vec?.z ?? 0]);
					}
					return;
				}
			};
			requestAnimationFrame(frameEvent);
			let firstTile = true;
			let robustParcels = {} as any;

			map.onBoundsChange(() => {
				if (!map) return;
				editor.screenScale.set(map.getScale());

				const referenceOverlay = map.getOverlayProxy();

				let center = map.getCenter();

				editor.longitude.set(center[0]);
				editor.latitude.set(center[1]);

				updateTimer = 5000;

				if (parcelOverlay) {
					parcelOverlay.loadViewport();
				}

				let floatingDlon = center[0] - $geo[0];
				let floatingDlat = center[1] - $geo[1];
				let closeLng = center[0];
				let closeLat = center[1];
				let floatingDist = Math.sqrt(floatingDlon * floatingDlon + floatingDlat * floatingDlat);
				if (floatingDist > 0.05 && broker.project.objects.length <= 1) {
					(async () => {
						await broker.getOrCreateCornerstone();
						$geo = [closeLng, closeLat];
					})();
				}

				let mapBounds = map.getBounds();
				let bounds = {
					minX: Infinity,
					minY: Infinity,
					maxX: -Infinity,
					maxY: -Infinity
				};

				let relativeTopLeft = referenceOverlay.lonLatToVector3(mapBounds.west, mapBounds.north);

				let relativeBottomRight = referenceOverlay.lonLatToVector3(mapBounds.east, mapBounds.south);

				if (relativeTopLeft && relativeBottomRight) {
					bounds.minX = Math.min(relativeTopLeft.x, relativeBottomRight.x);
					bounds.minY = Math.min(relativeTopLeft.z, relativeBottomRight.z);
					bounds.maxX = Math.max(relativeTopLeft.x, relativeBottomRight.x);
					bounds.maxY = Math.max(relativeTopLeft.z, relativeBottomRight.z);
				}

				if (isNaN(bounds.minX) || isNaN(bounds.minY) || isNaN(bounds.maxX) || isNaN(bounds.maxY))
					return;
				editor.viewBounds.set(bounds);

				if (map.getTilt() != 0) {
					mapRotationNonZero.set(true);
				} else {
					if (map.getHeading() != $heading) {
						mapRotationNonZero.set(true);
					} else {
						mapRotationNonZero.set(false);
					}
				}

				mapRotation.set(map.getHeading());
			});
		} finally {
			buildingMap = false;
		}
	}

	let leftMouseDown = writable(false);
	let middleMouseDown = writable(false);
	let isScrolling = writable(false);
	let svelteOverlaysEl: HTMLElement;
	let overlays: Overlay[] = [];
	let parcelOverlay: ParcelOverlay | null = null;
	const overlayTypes: (typeof Overlay)[] = [SelectionOverlay, RendererOverlay, GuidesOverlay];

	let origin = { lat: 0, lng: 0 };

	$: hoverSelected = $hoveringObject && $selection.includes($hoveringObject);
	$: transformHover = $selectToolCursor != Cursors.default;
	$: transforming = $translating || $scaling || $rotating;
	$: {
		console.log($activeTool, transforming, transformHover, hoverSelected);
	}
	$: canDrag =
		$isMobile ||
		($activeTool == 'pan' && !hoverSelected && !transformHover && !transforming) ||
		$isScrolling
			? true
			: $middleMouseDown;

	$: {
		canDrag;
		$activeTool;
		map?.setInputMode(canDrag ? 'greedy' : 'none', canDrag);
	}

	let activeProvider: ParcelProvider = $parcelProvider;

	// $: {
	// 	if ($activeDialog == 'parcels' && map && $zoomLevel >= 17) {
	// 		if (!parcelOverlay || $parcelProvider != activeProvider) {
	// 			if (parcelOverlay) parcelOverlay.destroy();

	// 			parcelOverlay = new ParcelOverlay(map, $parcelProvider);
	// 			parcelOverlay.loadViewport();
	// 			activeProvider = $parcelProvider;
	// 		}
	// 	} else {
	// 		if (parcelOverlay) {
	// 			parcelOverlay.destroy();
	// 			parcelOverlay = null;
	// 		}
	// 	}
	// }

	let filesDraggable = getDraggable('files');

	let previewCad = '';
	let previewCadOffsets = { x: 0, y: 0 };

	let floatingAnchor = {
		lat: 0,
		lng: 0
	};

	function checkMap() {
		if (!browser) return false;

		if (map) {
			let sameType = true;
			if (map instanceof GoogleMapsProvider) {
				if (!$mapStyle.startsWith('google')) {
					sameType = false;
				}
			} else if (map instanceof MapboxMapsProvider) {
				if (!$mapStyle.startsWith('mapbox')) {
					sameType = false;
				}
			}

			if (!sameType) {
				buildMap();
			} else {
				map.setStyle($mapStyle);
			}
		} else {
			if (get(broker.synced)) {
				buildMap();
			}
		}
	}

	let unsubs: (() => void)[] = [];

	unsubs.push(
		broker.synced.subscribe((synced) => {
			if (synced) {
				checkMap();
			}
		})
	);

	unsubs.push(
		mapStyle.subscribe((style) => {
			checkMap();
		})
	);

	onMount(() => {
		checkMap();
	});

	let mapRotationNonZero = writable(false);
	let mapRotation = writable(0);
	let styleSelectorOpen = false;

	editor.longitude.subscribe((val) => {
		if (map) {
			let center = map.getCenter();
			if (!center) return;
			if (center[0] != val) {
				map.setCenter(val, center[1]);
				map.setZoom(18);
			}
		}
	});

	editor.latitude.subscribe((val) => {
		if (map) {
			let center = map.getCenter();
			if (!center) return;
			if (center[1] != val) {
				map.setCenter(center[0], val);
				map.setZoom(18);
			}
		}
	});

	geo.subscribe(() => {
		if (map) {
			const referenceOverlay = map.getOverlayProxy();
			if (referenceOverlay) {
				map.setAnchor($geo[0], $geo[1], $heading);
			}

			let center = map.getCenter();
			if (!center) return;
			if (center[0] == 0 && center[1] == 0) {
				map.setCenter($geo[0], $geo[1]);
				map.setZoom(18);
			}
		}
	});

	function flyToLatestCad() {
		editor.flyHome();
	}

	broker.synced.subscribe((newVal) => {
		if (map) {
			if (newVal) {
				// Zoom to latest cad
				flyToLatestCad();
			}
		}
	});

	onDestroy(() => {
		map?.destroy();
		unsubs.forEach((u) => u());
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

	function handleMouseWheel(e: any) {
		console.log(e);
		if (!e.target.closest('.map-container') || e.target.closest('.map-container') != containerEl)
			return;

		if (e.ctrlKey || e.metaKey || (get(activeTool) == 'select' && !ENABLE_TRACKPAD_PAN)) {
			e.preventDefault();
			if (map && !canDrag) {
				$isScrolling = true;

				setTimeout(() => {
					$isScrolling = false;
				}, 100);
			}
		} else {
			if (get(activeTool) == 'pan') {
				return;
			}
			if (!map) return;
			let center = map.getCenter();
			let bounds = map.getBounds();
			let degrees = bounds.east - bounds.west;
			let out = normalizeWheel(e);

			let angle = -(map.getHeading() ?? 0) * (Math.PI / 180);

			let rightVector = [Math.cos(angle + Math.PI / 2), Math.sin(angle + Math.PI / 2)];
			let upVector = [Math.cos(angle), Math.sin(angle)];

			let real = [
				rightVector[0] * out.spinX + upVector[0] * out.spinY,
				rightVector[1] * out.spinX + upVector[1] * out.spinY
			];

			map.setCenter(
				center[0] + real[1] * (degrees / 30),
				center[1] + real[0] * (degrees / 30) * -1
			);
		}
	}

	let currentCursor: string = Cursors.default;

	$: {
		currentCursor = Cursors.default;

		if ($middleMouseDown) {
			currentCursor = Cursors.grabbing;
		} else {
			if ($activeTool == 'select') {
				currentCursor = $selectToolCursor;
			} else if ($activeTool == 'pan') {
				currentCursor = $selectToolCursor;
				if (currentCursor == Cursors.default) {
					currentCursor = $leftMouseDown ? Cursors.grabbing : Cursors.grab;
				}
			} else if ($activeTool == 'pen' || $activeTool == 'smart') {
				currentCursor = Cursors.pen;
			} else if ($activeTool == 'comment') {
				currentCursor = Cursors.comment;
			} else if ($activeTool == 'text') {
				currentCursor = Cursors.text;
			} else if ($activeTool == 'measurement' || $activeTool == 'area') {
				currentCursor = Cursors.measurement;
			}
		}
	}

	let topLeftCursors = [Cursors.default, Cursors.pen, Cursors.comment];
	let oldObservers = new Map<HTMLElement, MutationObserver>();
	function updateSvelteOverlays() {
		for (let old of oldObservers.values()) {
			old.disconnect();
		}

		if (!svelteOverlaysEl || !map) return;
		let overlayProxy = map.getOverlayProxy();

		for (let child of svelteOverlaysEl.children) {
			let childEl = child as HTMLElement;
			if ('longitude' in childEl.dataset) {
				let longitude = parseFloat(childEl.dataset.longitude ?? '0');
				let latitude = parseFloat(childEl.dataset.latitude ?? '0');

				let vec = overlayProxy.lonLatToVector3(latitude, longitude);

				let deg = -$heading;
				let rad = (deg / 180) * Math.PI;

				let x = vec?.x ?? 0;
				let y = vec?.z ?? 0;

				let cos = Math.cos(rad);
				let sin = Math.sin(rad);

				let x2 = x * cos - y * sin;
				let y2 = x * sin + y * cos;

				let pos = overlayProxy.lonLatToContainerPixel(longitude, latitude);
				if (pos) {
					childEl.style.left = `${pos[0]}px`;
					childEl.style.top = `${pos[1]}px`;
					childEl.style.position = `absolute`;
				}
			}

			if ('relativeX' in childEl.dataset) {
				let refreshEl = () => {
					let relativeX = parseFloat(childEl.dataset.relativeX ?? '0');
					let relativeY = parseFloat(childEl.dataset.relativeY ?? '0');
					let p = editor.positionToLonLat(relativeX, relativeY);

					let pos = overlayProxy.lonLatToContainerPixel(p[0], p[1]);
					if (pos) {
						childEl.style.left = `${pos[0]}px`;
						childEl.style.top = `${pos[1]}px`;
						childEl.style.position = `absolute`;
					}
				};
				refreshEl();

				let observer = new MutationObserver((list, ob) => {
					refreshEl();
				});

				observer.observe(childEl, {
					attributes: true,
					attributeFilter: ['data-relative-x', 'data-relative-y']
				});

				oldObservers.set(childEl, observer);
			}
		}
	}

	let observer: MutationObserver | null = null;
	onMount(() => {
		observer = new MutationObserver((list, ob) => {
			updateSvelteOverlays();
		});

		observer.observe(svelteOverlaysEl, {
			childList: true,
			subtree: true
		});
	});

	onDestroy(() => {
		if (observer) {
			observer.disconnect();
			observer = null;
		}
	});

	let insideMap = false;
	let lastDraggableCad: string | null = null;
	function handleMouseEnter(e: MouseEvent) {
		let dragging = get(filesDraggable.payload);

		insideMap = true;
	}

	function handleMouseLeave(e: MouseEvent) {
		let dragging = get(filesDraggable.payload);

		insideMap = false;

		editor.previewObjects.set([]);
		editor.needsPreviewRender.set(true);
		previewCad = '';
	}

	filesDraggable.dragging.subscribe((newVal) => {
		if (newVal) {
			lastDraggableCad = get(filesDraggable.payload);
		}
		if (!newVal) {
			editor.previewObjects.set([]);
			editor.needsPreviewRender.set(true);

			if (insideMap && lastDraggableCad) {
				let currentMouseLatLon = get(editor.currentMousePosition);
				let position = editor.lonLatToPosition(currentMouseLatLon[1], currentMouseLatLon[0]);
				// console.log(position, insideMap, lastDraggableCad);
				broker.placeCad(lastDraggableCad, position);
				lastDraggableCad = null;
			}
		}
	});

	function computeBoundsMulti(objects: Object2D[]) {
		let box = {
			minX: Infinity,
			minY: Infinity,
			maxX: -Infinity,
			maxY: -Infinity
		};

		for (let obj of objects) {
			let bounds = obj.getBounds();
			box.maxX = Math.max(box.maxX, bounds.maxX);
			box.maxY = Math.max(box.maxY, bounds.maxY);
			box.minX = Math.min(box.minX, bounds.minX);
			box.minY = Math.min(box.minY, bounds.minY);
		}

		return box;
	}
</script>

<svelte:window on:wheel|capture={handleMouseWheel} />

<div
	class="map-container h-full z-0"
	style="--cursor: url('{currentCursor}') {topLeftCursors.includes(currentCursor)
		? '0'
		: '12'} {topLeftCursors.includes(currentCursor) ? '0' : '12'}, auto"
	bind:this={containerEl}
	on:mousedown={handleMouseDown}
	on:mouseup={handleMouseUp}
	on:mouseenter={handleMouseEnter}
	on:mouseleave={handleMouseLeave}
/>

{#if $mapRotationNonZero && !$isMobile}
	<button
		class="absolute top-4 right-4 text-4xl text-white rounded-full"
		style="transform: rotate(-{$mapRotation + 45}deg)"
		on:click={() => {
			map?.setTilt(0);
			map?.setHeading($heading);
		}}
	>
		<Fa icon={faCompass} />
	</button>
{/if}
<div
	bind:this={svelteOverlaysEl}
	class="map-container-svelte-overlays absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden"
>
	<slot />
</div>

{#if !$isMobile}
	<div class="absolute bottom-4 left-4">
		<div
			class="flex flex-row items-center justify-center py-2 px-2 select-none rounded-xl"
			class:bg-white={styleSelectorOpen}
		>
			{#each MAP_STYLES as style}
				{#if styleSelectorOpen || $mapStyle == style.key}
					<button
						class="flex flex-col items-center first:ml-0 ml-2 relative"
						on:click={() => {
							if (styleSelectorOpen) {
								$mapStyle = style.key;
								styleSelectorOpen = false;
							} else {
								styleSelectorOpen = true;
							}
						}}
					>
						<img
							src={style.image}
							alt={style.name}
							class="rounded-xl hover:shadow-md hover:brightness-105 border-white [&.active]:border-blue-500"
							class:active={styleSelectorOpen && $mapStyle == style.key}
							class:w-20={!styleSelectorOpen}
							class:border-2={!styleSelectorOpen}
							class:border-4={styleSelectorOpen}
						/>
						{#if styleSelectorOpen}
							<b class="mt-2 text-sm">{style.name}</b>
						{/if}
						{#if !styleSelectorOpen}
							<span
								class="absolute bottom-2 text-sm font-bold top-1 mt-1"
								style="line-height: 1"
								class:text-black={$mapStyle.endsWith('simple')}
								class:text-white={$mapStyle.endsWith('satellite') || $mapStyle.endsWith('dark')}
							>
								Map Type
							</span>
						{/if}
					</button>
				{/if}
			{/each}
		</div>
	</div>
{/if}

<style lang="scss">
	:global(.map-container *) {
		cursor: var(--cursor) !important;
	}
</style>
