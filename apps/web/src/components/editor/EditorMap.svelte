<script lang="ts">
	import { browser } from '$app/environment';
	import { normalizeWheel } from '$lib/client/normalizeWheel';
	import { Loader } from '@googlemaps/js-api-loader';
	import { ThreeJSOverlayView } from '@googlemaps/three';
	import { getSvelteContext } from 'src/store/editor';
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
	import { faTextHeight } from '@fortawesome/free-solid-svg-icons';
	import { translateDXF } from '$lib/util/dxf';
	import { ObjectType, type Object2D } from 'core';
	import { SuperZoomLayer } from '$lib/map/super-zoom-layer';
	import { ZoomRangeModifierService } from '$lib/map/zoom-range-modifier-service';
	import { SuperZoomMapType } from '$lib/map/super-zoom-map-type';
	const MIN_ZOOM = 1;
	const MAX_ZOOM = 45;

	const { editor, broker } = getSvelteContext();
	const { geo, heading } = broker.watchCornerstone();

	const {
		activeTool,
		selectToolCursor,
		hoveringObject,
		selection,
		translating,
		scaling,
		rotating
	} = editor;
	const mapStyle = broker.writableGlobalProperty('mapStyle', 'google-satellite');

	let containerEl: HTMLElement | null = null;
	let map: google.maps.Map | null = null;

	let leftMouseDown = writable(false);
	let middleMouseDown = writable(false);
	let isScrolling = writable(false);
	let svelteOverlaysEl: HTMLElement;
	let overlays: Overlay[] = [];
	const overlayTypes: (typeof Overlay)[] = [SelectionOverlay, RendererOverlay, GuidesOverlay];
	let referenceOverlay: ThreeJSOverlayView | null = null;
	let overlayView: google.maps.OverlayView | null = null;

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
		if (map) {
			map.setOptions({
				gestureHandling: canDrag ? 'greedy' : 'none',
				keyboardShortcuts: canDrag,
				draggableCursor: $activeTool == 'pan' ? 'grab' : 'default',
				maxZoom: MAX_ZOOM,
				minZoom: MIN_ZOOM
			});
			map.setMapTypeId(getMapTypeId());
		}
	}

	let filesDraggable = getDraggable('files');

	let previewCad = '';
	let previewCadOffsets = { x: 0, y: 0 };

	function rebuildOverlays(map: google.maps.Map) {
		if (!referenceOverlay || !overlayView) return;

		for (const overlay of overlays) {
			overlay.destroy();
		}

		overlays = [];

		for (let i = 0; i < overlayTypes.length; i++) {
			const overlay = new overlayTypes[i](map, referenceOverlay, overlayView, editor, broker);
			overlays.push(overlay);
		}

		overlays.forEach((overlay) => overlay.init());
		overlays.forEach((overlay) => overlay.refresh());

		broker.markAllDirty();
	}

	function getMapId() {
		if ($mapStyle == 'google-satellite') return 'c0f380f46a9601c5';
		if ($mapStyle == 'google-simple') return '44130cd24e816b48';
		if ($mapStyle == 'google-dark') return '3a922666b5448450';
		return 'c0f380f46a9601c5';
	}
	function getMapTypeId() {
		// return 'test';
		if ($mapStyle == 'google-satellite') return google.maps.MapTypeId.HYBRID;
		if ($mapStyle == 'google-simple') return google.maps.MapTypeId.ROADMAP;
		if ($mapStyle == 'google-dark') return google.maps.MapTypeId.ROADMAP;
		return google.maps.MapTypeId.HYBRID;
	}

	let floatingAnchor = {
		lat: 0,
		lng: 0
	};

	$: {
		$mapStyle;

		if (map) {
			map.setOptions({
				mapTypeId: getMapTypeId(),
				mapId: getMapId(),

				tilt: 0,
				maxZoom: MAX_ZOOM,
				minZoom: MIN_ZOOM
			});

			map.setMapTypeId(getMapTypeId());
		}
	}

	// $: {
	// 	$heading;
	// 	$geo;

	// 	if (map && referenceOverlay) {
	// 		map.setHeading($heading);

	// 		map.setCenter({
	// 			lat: $geo[1],
	// 			lng: $geo[0]
	// 		});

	// 		if ($geo[1] != 0 || $geo[0] != 0) {
	// 			map.setZoom(25);
	// 		} else {
	// 			map.setZoom(1);
	// 		}

	// 		referenceOverlay.setAnchor({
	// 			lat: $geo[1],
	// 			lng: $geo[0]
	// 		});

	// 		let deg = -$heading;
	// 		let rad = (deg / 180) * Math.PI;

	// 		referenceOverlay.scene.rotateY(rad);

	// 		map.setTilt(0);
	// 	}
	// }

	onMount(() => {
		if (browser) {
			const loader = new Loader({
				apiKey: 'AIzaSyDhS6djMo2An6CdMlEY1zMQUkRGorXI7SU',
				version: 'weekly'
			});

			loader.load().then(async () => {
				if (!containerEl) return;

				const { Map, MaxZoomService } = (await google.maps.importLibrary(
					'maps'
				)) as google.maps.MapsLibrary;

				map = new Map(containerEl, {
					center: {
						lat: $geo[1],
						lng: $geo[0]
					},
					zoom: $geo[1] != 0 || $geo[0] != 0 ? 18 : 3,
					heading: $heading,
					disableDefaultUI: true,

					mapId: getMapId(),
					mapTypeId: getMapTypeId(),

					streetViewControl: false,
					draggableCursor: 'default',
					gestureHandling: canDrag ? 'greedy' : 'none',
					keyboardShortcuts: canDrag,
					scrollwheel: true,
					isFractionalZoomEnabled: true,
					maxZoom: MAX_ZOOM,
					minZoom: MIN_ZOOM
				});

				flyToLatestCad();

				// map.mapTypes.set(
				// 	'test',
				// 	new SuperZoomMapType({
				// 		tileSize: new google.maps.Size(256, 256),
				// 		maxZoom: 40,
				// 		name: 'Satellite',
				// 		getTileUrl: (tileCoord: google.maps.Point, zoom: number): string => {
				// 			if (zoom > 40) {
				// 				return '';
				// 			}
				// 			let zoomDiff: number = zoom - 40;
				// 			let normTile: any = { x: tileCoord.x, y: tileCoord.y };
				// 			if (zoomDiff > 0) {
				// 				let dScale: number = Math.pow(2, zoomDiff);
				// 				normTile.x = Math.floor(normTile.x / dScale);
				// 				normTile.y = Math.floor(normTile.y / dScale);
				// 			} else {
				// 				zoomDiff = 0;
				// 			}
				// 			return (
				// 				'https://khms1.googleapis.com/kh?v=949&hl=en-US&&x=' +
				// 				normTile.x +
				// 				'&y=' +
				// 				normTile.y +
				// 				'&z=' +
				// 				(zoom - zoomDiff)
				// 			);
				// 		}
				// 	})
				// );

				let scene = new THREE.Scene();
				let deg = -$heading;
				let rad = (deg / 180) * Math.PI;

				scene.rotateY(rad);

				overlayView = new google.maps.OverlayView();
				overlayView.setMap(map);

				overlayView.draw = () => {
					for (let overlay of overlays) {
						for (let draw of overlay.draws) {
							draw();
						}
					}

					updateSvelteOverlays();
				};

				referenceOverlay = new ThreeJSOverlayView({
					map,
					scene,
					upAxis: 'Y',
					anchor: map.getCenter()
				});

				editor.overlay.set(referenceOverlay);
				editor.map.set(map);

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

				function handleMapTap(ev: google.maps.MapMouseEvent) {
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

				map.addListener('mousedown', (ev: google.maps.MapMouseEvent) => {
					if ($isMobile) return;
					handleMapTap(ev);
				});

				map.addListener('click', (ev: google.maps.MapMouseEvent) => {
					if (!$isMobile) return;
					handleMapTap(ev);
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
					console.log('bounds', ne.lat(), sw.lat());

					let scale = Math.abs(ne.lat() - sw.lat()) * 800;
					if (isNaN(scale)) return;
					editor.screenScale.set(scale);
				}

				map.addListener('zoom_changed', () => {
					if (!map) return;
					// computeScaling();
					editor.zoom.set(map.getZoom() ?? 0);
				});

				map.addListener('bounds_changed', () => {
					if (!map) return;
					let center = map.getCenter();
					if (!center) return;
					editor.longitude.set(center.lng());
					editor.latitude.set(center.lat());

					computeScaling();

					let floatingDlon = center.lng() - $geo[0];
					let floatingDlat = center.lat() - $geo[1];
					let closeLng = center.lng();
					let closeLat = center.lat();
					let floatingDist = Math.sqrt(floatingDlon * floatingDlon + floatingDlat * floatingDlat);
					if (floatingDist > 0.05 && broker.project.objects.length <= 1) {
						(async () => {
							await broker.getOrCreateCornerstone();
							$geo = [closeLng, closeLat];
						})();
					}

					let topLeft = map.getBounds()?.getNorthEast();
					let bottomRight = map.getBounds()?.getSouthWest();
					let bounds = {
						minX: Infinity,
						minY: Infinity,
						maxX: -Infinity,
						maxY: -Infinity
					};

					let relativeTopLeft = referenceOverlay?.latLngAltitudeToVector3({
						lat: topLeft?.lat() ?? 0,
						lng: topLeft?.lng() ?? 0,
						altitude: 0
					});

					let relativeBottomRight = referenceOverlay?.latLngAltitudeToVector3({
						lat: bottomRight?.lat() ?? 0,
						lng: bottomRight?.lng() ?? 0,
						altitude: 0
					});

					if (relativeTopLeft && relativeBottomRight) {
						bounds.minX = Math.min(relativeTopLeft.x, relativeBottomRight.x);
						bounds.minY = Math.min(relativeTopLeft.z, relativeBottomRight.z);
						bounds.maxX = Math.max(relativeTopLeft.x, relativeBottomRight.x);
						bounds.maxY = Math.max(relativeTopLeft.z, relativeBottomRight.z);
					}

					if (isNaN(bounds.minX) || isNaN(bounds.minY) || isNaN(bounds.maxX) || isNaN(bounds.maxY))
						return;
					editor.viewBounds.set(bounds);
				});

				setTimeout(() => {
					computeScaling();
				}, 1000);

				computeScaling();

				rebuildOverlays(map);
			});
		}
	});

	editor.longitude.subscribe((val) => {
		if (map) {
			let center = map.getCenter();
			if (!center) return;
			if (center.lng() != val) {
				map.setCenter({ lat: center.lat(), lng: val });
				map.setZoom(18);
			}
		}
	});

	editor.latitude.subscribe((val) => {
		if (map) {
			let center = map.getCenter();
			if (!center) return;
			if (center.lat() != val) {
				map.setCenter({ lat: val, lng: center.lng() });
				map.setZoom(18);
			}
		}
	});

	geo.subscribe(() => {
		if (map) {
			if (referenceOverlay) {
				referenceOverlay.setAnchor({
					lat: $geo[1],
					lng: $geo[0]
				});
			}

			let center = map.getCenter();
			if (!center) return;
			if (center.lng() == 0 && center.lat() == 0) {
				map.setCenter({ lat: $geo[1], lng: $geo[0] });
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

	function handleMouseWheel(e: any) {
		if (!e.target.closest('.map-container') || e.target.closest('.map-container') != containerEl)
			return;

		if (e.ctrlKey) {
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
			let bounds = map.getBounds() ?? new google.maps.LatLngBounds();
			let degrees = bounds.getNorthEast().lng() - bounds.getSouthWest().lng();
			let out = normalizeWheel(e);

			let angle = -(map.getHeading() ?? 0) * (Math.PI / 180);

			let rightVector = [Math.cos(angle + Math.PI / 2), Math.sin(angle + Math.PI / 2)];
			let upVector = [Math.cos(angle), Math.sin(angle)];

			let real = [
				rightVector[0] * out.spinX + upVector[0] * out.spinY,
				rightVector[1] * out.spinX + upVector[1] * out.spinY
			];

			map?.setCenter({
				lat: (center?.lat() ?? 0) + real[0] * (degrees / 30) * -1,
				lng: (center?.lng() ?? 0) + real[1] * (degrees / 30)
			});
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

		if (!svelteOverlaysEl || !overlayView) return;
		let proj = overlayView.getProjection();

		for (let child of svelteOverlaysEl.children) {
			let childEl = child as HTMLElement;
			if ('longitude' in childEl.dataset) {
				let longitude = parseFloat(childEl.dataset.longitude ?? '0');
				let latitude = parseFloat(childEl.dataset.latitude ?? '0');

				let vec = referenceOverlay?.latLngAltitudeToVector3({
					lat: latitude,
					lng: longitude,
					altitude: 0
				});

				let deg = -$heading;
				let rad = (deg / 180) * Math.PI;

				let x = vec?.x ?? 0;
				let y = vec?.z ?? 0;

				let cos = Math.cos(rad);
				let sin = Math.sin(rad);

				let x2 = x * cos - y * sin;
				let y2 = x * sin + y * cos;

				let pos = proj.fromLatLngToContainerPixel(new google.maps.LatLng(latitude, longitude));
				if (pos) {
					childEl.style.left = `${pos.x}px`;
					childEl.style.top = `${pos.y}px`;
					childEl.style.position = `absolute`;
				}
			}

			if ('relativeX' in childEl.dataset) {
				let refreshEl = () => {
					let relativeX = parseFloat(childEl.dataset.relativeX ?? '0');
					let relativeY = parseFloat(childEl.dataset.relativeY ?? '0');
					let p = editor.positionToLonLat(relativeX, relativeY);

					let pos = proj.fromLatLngToContainerPixel(new google.maps.LatLng(p[1], p[0]));
					if (pos) {
						childEl.style.left = `${pos.x}px`;
						childEl.style.top = `${pos.y}px`;
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

<svelte:window on:mousewheel|capture={handleMouseWheel} />

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

<div
	bind:this={svelteOverlaysEl}
	class="map-container-svelte-overlays absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden"
>
	<slot />
</div>

<style lang="scss">
	:global(.map-container *) {
		cursor: var(--cursor) !important;
	}
</style>
