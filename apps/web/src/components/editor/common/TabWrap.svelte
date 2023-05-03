<script lang="ts">
	import { onDestroy, onMount, setContext } from 'svelte';
	import { writable } from 'svelte/store';

	const activeTab = writable(0);

	export let names: string[] = [];

	export { activeTab };

	setContext('activeTab', activeTab);

	let targetHeight = 0;

	let alive = false;

	let wrapEl: HTMLElement;

	onMount(() => {
		alive = true;

		function updateHeight() {
			if (!alive) return;
			requestAnimationFrame(updateHeight);

			let childHeight = wrapEl.children[0].clientHeight;

			if (childHeight !== targetHeight) {
				targetHeight = childHeight;
			}
		}

		updateHeight();
		0;
	});

	onDestroy(() => {
		alive = false;
	});
</script>

<div class="tab-wrap overflow-hidden">
	<div class="tab-header">
		<div class="tab-dots flex flex-row space-x-1 items-center justify-center mb-2">
			{#each names as _, i}
				<button
					class="tab-dot opacity-20 bg-black rounded-full w-2 h-2 transition-opacity border-0"
					class:opacity-80={$activeTab === i}
					on:click={() => activeTab.set(i)}
				/>
			{/each}
			<span />
		</div>
		<div class="tab-header-row flex flex-row space-x-2">
			{#each names as name, i}
				<button
					class="flex-1 border-b-2 border-opacity-20 border-black text-black text-opacity-20
[&.active]:border-blue-500
[&.active]:text-blue-500
[&.active]:border-opacity-100
[&.active]:text-opacity-100
					"
					class:active={$activeTab === i}
					on:click={() => activeTab.set(i)}
				>
					{name}
				</button>
			{/each}
		</div>
	</div>
	<div
		class="tab-body mt-2 tab-wrap-transition-container transition-all"
		style="height: {targetHeight}px; transition: height .2s;"
		bind:this={wrapEl}
	>
		<slot />
	</div>
</div>

<style lang="scss">
	:global(.tab-wrap-transition-container) {
		// display: grid;
		// grid-template-rows: 1fr;
		// grid-template-columns: 1fr;
	}

	:global(.tab-wrap-transition-container > *) {
		// grid-row: 1;
		// grid-column: 1;
	}
</style>
