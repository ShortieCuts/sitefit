<script lang="ts">
	import { fade } from 'svelte/transition';
	import RichSearch from '../common/RichSearch.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getSvelteContext } from 'src/store/editor';

	const { editor } = getSvelteContext();

	onMount(() => {
		if (browser) {
			let input = document.querySelector("input[type='search']");
			if (input && input instanceof HTMLInputElement) input.focus();
		}
	});

	function handleBackdropClick(event: MouseEvent) {
		console.log(event.target);
		if (
			event.target &&
			event.target instanceof HTMLElement &&
			event.target.closest('.search-bar') == null
		) {
			editor.activateDialog('');
		}
	}
</script>

<div
	class="fixed cursor-pointer pointer-events-auto top-0 left-0 w-full h-full bg-black bg-opacity-75 flex justify-center pt-4 full-search-bar px-4"
	transition:fade={{ duration: 200 }}
	on:click={handleBackdropClick}
	on:keydown={() => {}}
>
	<RichSearch
		on:placeChanged={() => {
			editor.activateDialog('');
		}}
	/>
</div>

<style lang="scss">
	:global(.full-search-bar .search-bar) {
		width: 100%;
		max-width: 600px;
	}
</style>
