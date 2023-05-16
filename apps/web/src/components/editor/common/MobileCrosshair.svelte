<script lang="ts">
	import { fade } from 'svelte/transition';
</script>

<div
	transition:fade={{ duration: 200 }}
	class="fixed top-0 left-0 right-0 bottom-0 flex items-center justify-center z-[1] pointer-events-none"
>
	<div class="absolute w-full border-b-2 border-black" />
	<div class="absolute h-full border-r-2 border-black" />
</div>
