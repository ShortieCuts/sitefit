<script lang="ts">
	import { browser } from '$app/environment';
	import { translateDXF } from '$lib/util/dxf';
	import type { Object2D } from 'core';
	import { HeadlessRenderer } from '../editor/overlays/Renderer';
	import ThreeScene from './ThreeScene.svelte';
	import type * as THREE from 'three';

	export let fileId: string;

	let loading = true;

	let scene: THREE.Scene;
	let camera: THREE.OrthographicCamera;
	let renderer: HeadlessRenderer;

	let overlayEl: HTMLDivElement;
	let wrapperEl: HTMLDivElement;

	$: {
		if (scene) {
			renderer = new HeadlessRenderer(scene, overlayEl);

			loadFile(fileId);
		}
	}

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

	async function loadFile(id: string) {
		loading = true;
		try {
			let rawDXF = await fetch('/api/cad/' + id).then((res) => res.text());

			let objects = translateDXF(rawDXF);

			if (!objects) {
				return;
			}

			for (let obj of objects) {
				if (obj.style) obj.style.color = [1, 1, 1, 1];
			}

			let bounds = computeBoundsMulti(objects);
			let width = bounds.maxX - bounds.minX;
			let height = bounds.maxY - bounds.minY;

			camera.position.x = 0;
			camera.position.y = -10;
			camera.position.z = 0;

			camera.lookAt(0, 0, 0);

			camera.position.z = (bounds.minY + bounds.maxY) / 2;
			camera.position.x = (bounds.minX + bounds.maxX) / 2;

			let rect = wrapperEl.getBoundingClientRect();
			let aspectRatio = rect.width / rect.height;

			if (width < height) {
				camera.top = -height / 2;
				camera.bottom = height / 2;
				let w = height * aspectRatio;
				camera.left = -w / 2;
				camera.right = w / 2;
			} else {
				let h = width * (1 / aspectRatio);
				camera.top = h / 2;
				camera.bottom = -h / 2;
				camera.left = -width / 2;
				camera.right = width / 2;
			}

			camera.zoom = 0.9;
			camera.updateProjectionMatrix();

			renderer.render(objects);
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}
</script>

<div bind:this={wrapperEl} class="relative min-h-[200px]">
	<div class="absolute top-0 left-0 right-0 bottom-0" bind:this={overlayEl} />
	<ThreeScene bind:scene bind:camera />
</div>
