<script lang="ts">
	import {
		faCaretDown,
		faCaretRight,
		faLayerGroup,
		faObjectGroup,
		faQuestion
	} from '@fortawesome/free-solid-svg-icons';
	import { getContext } from 'svelte';
	import Fa from 'svelte-fa';
	import type { Writable } from 'svelte/store';
	import type { EditorLayerNode } from './EditorLayerNode';

	const icons: {
		[key: string]: any;
	} = {
		group: faLayerGroup,
		object: faObjectGroup,
		layer: faLayerGroup
	};

	export let node: EditorLayerNode;

	const toggleState: Writable<Map<string, boolean>> = getContext('toggle');

	$: isOpen = $toggleState.get(node.id) ?? false;

	function toggle() {
		$toggleState.set(node.id, !($toggleState.get(node.id) ?? false));
		$toggleState = $toggleState;
	}
</script>

<div class="flex flex-col">
	<button class="flex flex-row p-2 hover:bg-gray-100 items-center">
		{#if node.children && node.children.length > 0}
			<button
				class="w-6 h-6 hover:bg-gray-200 flex items-center justify-center rounded-md text-gray-400"
				on:click={toggle}
			>
				<Fa icon={isOpen ? faCaretDown : faCaretRight} /></button
			>
		{:else}
			<div class="w-6 h-6" />
		{/if}
		<span class="w-6 h-6 flex items-center justify-center"
			><Fa icon={icons[node.icon] ?? faQuestion} /></span
		>
		<span class="ml-2 h-6 flex items-center">{node.name}</span>
	</button>

	{#if node.children && ($toggleState.get(node.id) ?? false)}
		<div class="flex flex-col ml-4">
			{#each node.children as child}
				<svelte:self node={child} />
			{/each}
		</div>
	{/if}
</div>
