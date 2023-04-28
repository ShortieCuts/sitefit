<script lang="ts">
	import { reactiveSize } from '$lib/util/actions';

	export let tab = 0;

	import { getContext } from 'svelte';
	import { writable, type Writable } from 'svelte/store';
	import { fly, slide } from 'svelte/transition';

	const activeTab = getContext<Writable<number>>('activeTab');

	let delta = 0;

	let lastTab = $activeTab;
	let currentTab = $activeTab;

	$: {
		let newTab = $activeTab;

		delta = newTab - lastTab;

		lastTab = newTab;

		// Delay for the props to update
		setTimeout(() => {
			currentTab = newTab;
		}, 1);
	}

	let width = writable(0);
</script>

{#if currentTab === tab}
	<div
		use:reactiveSize={{ width }}
		class="tab-wrap-content {$$props.class}"
		transition:fly={{ y: 0, x: Math.sign(delta) * $width, duration: 200, opacity: 1 }}
	>
		<slot />
	</div>
{/if}
