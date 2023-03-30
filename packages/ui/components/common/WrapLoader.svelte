<!--
	Wraps an element and provides a simple togglable loading animation
-->
<script lang="ts">
	import { faSpinner } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';

	let clazz = '';

	export { clazz as class };

	/**
	 * Should the loader be displayed
	 */
	export let loading = true;
</script>

<div class="wrap-loader {clazz}" class:wrap-loader--loading={loading}>
	<slot />
	{#if loading}
		<span class="mini-loading-logo">
			<Fa class="animate-spin" icon={faSpinner} />
		</span>
	{/if}
</div>

<style lang="scss">
	.wrap-loader--loading {
		position: relative;

		:global(.mini-loading-logo) {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
		}

		& > :global(*:not(.mini-loading-logo)) {
			pointer-events: none !important;
			user-select: none !important;
			opacity: 0.5 !important;
			filter: blur(2px) brightness(0.5) !important;
		}
	}
</style>
