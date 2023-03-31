<script lang="ts">
	import { browser } from '$app/environment';
	import { faArrowPointer, faComment, faHand } from '@fortawesome/free-solid-svg-icons';
	import { getSvelteContext } from 'src/store/editor';
	import { onMount } from 'svelte';

	import Fa from 'svelte-fa';

	const toolbarItems = [
		{
			icon: faArrowPointer,
			key: 'select',
			shortcut: 'v'
		},
		{
			icon: faHand,
			key: 'pan',
			shortcut: 'p'
		},
		{
			icon: faComment,
			key: 'comment',
			shortcut: 'c'
		}
	];

	const { editor } = getSvelteContext();

	let { activeTool } = editor;

	function handleKeyDown(event: KeyboardEvent) {
		let currentEl = event.target as HTMLElement;

		if (event.ctrlKey || event.altKey || event.metaKey) {
			return;
		}

		if (currentEl.tagName === 'INPUT' || currentEl.tagName === 'TEXTAREA') {
			return;
		}

		const item = toolbarItems.find((item) => item.shortcut === event.key);

		if (item) {
			editor.activeTool.set(item.key);
		}
	}
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="editor-toolbar flex flex-col rounded-lg absolute top-4 left-4 space-y-2">
	{#each toolbarItems as item}
		<button
			class="text-white w-10 h-10 flex items-center justify-center rounded-lg hover:bg-blue-400 cursor-default"
			class:bg-blue-500={$activeTool === item.key}
			on:click={() => {
				editor.activeTool.set(item.key);
			}}
		>
			<Fa icon={item.icon} />
		</button>
	{/each}
</div>
