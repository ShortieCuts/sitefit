<script lang="ts">
	import { cubicOut } from '$lib/util/easing';
	import { fly, slide } from 'svelte/transition';
</script>

<div
	transition:fly={{ y: 240, duration: 300, opacity: 1, easing: cubicOut }}
	class="editor-mobile-drawer fixed bottom-4 left-0 right-0 pointer-events-none flex flex-col items-center justify-center z-40 space-y-4 px-4"
>
	<slot />
</div>

<style lang="scss">
	:global(.editor-mobile-drawer > div) {
		@apply bg-white rounded-lg flex flex-col pointer-events-auto shadow-lg overflow-hidden  w-full;
	}

	:global(.editor-mobile-drawer > div > button) {
		@apply flex flex-1 justify-start items-center h-10 text-xl p-4 first:border-transparent border-t border-gray-200;
	}

	:global(.editor-mobile-drawer > div > button:hover) {
		@apply bg-gray-100;
	}

	:global(.editor-mobile-drawer > div > button > svg) {
		@apply mr-4;
	}
</style>
