<script lang="ts">
	import { isMobile } from 'src/store/responsive';
	import { onDestroy, onMount } from 'svelte';
	import Popover from 'svelte-smooth-popover/Popover.svelte';

	export let el: HTMLElement;

	let open = false;

	let position = { x: 0, y: 0 };

	const handleClick = (e: MouseEvent) => {
		if (e.button === 2) {
			open = true;
			position = { x: e.clientX, y: e.clientY };
			e.preventDefault();
			e.stopPropagation();
		}
	};

	let touchTimer: NodeJS.Timeout;

	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length === 1) {
			touchTimer = setTimeout(() => {
				open = true;
				position = { x: e.touches[0].clientX, y: e.touches[0].clientY };
			}, 500);
		}
	}

	function handleTouchEnd(e: TouchEvent) {
		if (e.touches.length === 0) {
			clearTimeout(touchTimer);
		}
	}

	$: if (el && typeof window !== 'undefined') {
		el.addEventListener('click', handleClick);
		el.addEventListener('contextmenu', handleClick);
		el.addEventListener('touchstart', handleTouchStart);
	}

	onDestroy(() => {
		if (el) {
			el.removeEventListener('click', handleClick);
			el.removeEventListener('contextmenu', handleClick);
			el.removeEventListener('touchstart', handleTouchStart);
		}
	});

	$: if (el) {
		if (open) {
			el.classList.add('has-context-menu-open');
		} else {
			el.classList.remove('has-context-menu-open');
		}
	}
</script>

<svelte:window
	on:click={(e) => {
		if ($isMobile) {
		} else {
			setTimeout(() => (open = false), 10);
		}
	}}
	on:contextmenu|capture={(e) => {
		if ($isMobile) {
			e.preventDefault();
			e.stopPropagation();
		} else {
			open = false;
		}
	}}
	on:touchstart={(e) => {
		if (e.target.closest('.context-menu')) {
			setTimeout(() => (open = false), 10);
			return;
		} else {
			open = false;
		}
	}}
	on:touchend={handleTouchEnd}
/>

<div class="fixed" style="top: {position.y}px; left: {position.x}px;">
	<Popover
		{open}
		caretBg="#f3f4f6"
		offset={0}
		caretCurveAmount={1}
		caretWidth={20}
		alignAnchor="top-right"
		align="bottom-right"
	>
		<div
			class="context-menu select-none bg-white shadow-md py-2 context-menu w-40 rounded-md border border-gray-200"
		>
			<slot />
		</div>
	</Popover>
</div>

<style lang="scss">
	:global(.context-menu > button) {
		@apply flex flex-row items-center px-4 py-1 text-sm hover:bg-gray-200 w-full;
	}
	:global(.context-menu > button > svg) {
		@apply mr-2;
	}

	:global(.hover\:bg-gray-100.has-context-menu-open) {
		@apply bg-gray-100;
	}
</style>
