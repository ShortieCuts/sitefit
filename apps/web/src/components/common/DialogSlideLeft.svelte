<script lang="ts">
	import { cubicOut } from '$lib/util/easing';
	import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
	import { getSvelteContext } from 'src/store/editor';
	import { isMobile } from 'src/store/responsive';
	import Fa from 'svelte-fa';
	import { fly } from 'svelte/transition';

	let { editor } = getSvelteContext();

	export let fullHeight = false;

	export let name = '';
</script>

{#if $isMobile}
	<div
		transition:fly={{ x: window.innerWidth, opacity: 1, duration: 300, easing: cubicOut }}
		class="bg-white overflow-auto fixed bottom-0 left-0 right-0 h-full p-4 pt-0 pointer-events-auto z-[42]"
	>
		<div class="p-6 flex items-center flex-row">
			<button
				class="text-xl"
				on:click={() => {
					editor.activateDialog('');
				}}><Fa icon={faArrowLeft} /></button
			>
			<span class="ml-4"> {name} </span>
		</div>
		<slot />
	</div>
{:else}
	<div class:pt-2={!fullHeight} class:h-full={fullHeight} class="flex flex-col">
		<slot />
	</div>
{/if}
