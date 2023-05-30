<script lang="ts">
	import { watchResize } from '$lib/util/observer';
	import { onDestroy, onMount } from 'svelte';

	import * as THREE from 'three';

	export let scene = new THREE.Scene();
	export let camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.001, 10);

	export let renderer = new THREE.WebGLRenderer();

	let el: HTMLDivElement;
	let kill = false;

	function setupScene() {
		scene = new THREE.Scene();
		camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.00001, 100);

		scene.add(camera);
		// scene.background = new THREE.Color(0xf3f4f6);

		resize();
		el.appendChild(renderer.domElement);
	}

	onMount(() => {
		setupScene();

		animate();
	});

	onDestroy(() => {
		scene.clear();

		kill = true;
	});

	function resize() {
		let container = el.parentElement;
		if (!container) return;
		let size = container.getBoundingClientRect();
		camera.left = -size.width / 2;
		camera.right = size.width / 2;
		camera.top = size.height / 2;
		camera.bottom = -size.height / 2;
		camera.updateMatrix();
		camera.updateProjectionMatrix();
		renderer.setSize(size.width, size.height);
	}

	function animate() {
		if (!kill) requestAnimationFrame(animate);
		renderer.render(scene, camera);
	}
</script>

<div class="h-full" use:watchResize={resize} bind:this={el} />
