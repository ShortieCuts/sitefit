<script lang="ts">
	import {
		faArrowsDownToLine,
		faArrowsUpToLine,
		faObjectGroup,
		faObjectUngroup
	} from '@fortawesome/free-solid-svg-icons';
	import { ObjectType } from 'core';
	import { getSvelteContext } from 'src/store/editor';

	import Fa from 'svelte-fa';
	import KeyBind from './KeyBind.svelte';
	import { get } from 'svelte/store';
	const { editor, broker } = getSvelteContext();
	const { selection } = editor;

	let canGroup = false;
	let canUngroup = false;

	$: {
		$selection;

		canGroup = $selection.length > 1;
		canUngroup = false;

		for (let id of $selection) {
			let obj = broker.project.objectsMap.get(id);
			if (obj && obj.type == ObjectType.Group) {
				canUngroup = true;
			}
		}
	}
</script>

<div class="my-2 w-full border-b border-gray-200" />
{#if canGroup}
	<button
		on:click={() => {
			editor.groupSelection();
		}}
		><Fa icon={faObjectGroup} /> Group
		<KeyBind to="group" />
	</button>
{/if}

{#if canUngroup}
	<button
		on:click={() => {
			editor.ungroupSelection();
		}}
		><Fa icon={faObjectUngroup} /> Ungroup
		<KeyBind to="ungroup" />
	</button>
{/if}
{#if canGroup || canUngroup}
	<div class="my-2 w-full border-b border-gray-200" />
{/if}
<button
	on:click={() => {
		broker.adjustObjectOrder(get(selection), Infinity);
	}}
	><Fa icon={faArrowsUpToLine} /> Send to front
	<KeyBind to="sendfront" />
</button>
<button
	on:click={() => {
		broker.adjustObjectOrder(get(selection), -Infinity);
	}}
	><Fa icon={faArrowsDownToLine} /> Send to back
	<KeyBind to="sendback" />
</button>
<div class="my-2 w-full border-b border-gray-200" />
