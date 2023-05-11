<script lang="ts">
	import {
		faAnchor,
		faBezierCurve,
		faCaretDown,
		faCaretRight,
		faCircle,
		faDraftingCompass,
		faFile,
		faFolder,
		faFolderPlus,
		faLayerGroup,
		faMapPin,
		faObjectGroup,
		faPenToSquare,
		faQuestion,
		faTrash,
		faVectorSquare
	} from '@fortawesome/free-solid-svg-icons';
	import { getContext } from 'svelte';
	import Fa from 'svelte-fa';
	import type { Writable } from 'svelte/store';
	import type { EditorLayerNode } from './EditorLayerNode';
	import { getSvelteContext } from 'src/store/editor';
	import Draggable from './Draggable.svelte';
	import ContextMenu from './ContextMenu.svelte';
	import EditableLabel from './EditableLabel.svelte';
	import { browser } from '$app/environment';
	import { compareAccess } from '$lib/util/access';

	const { editor, broker } = getSvelteContext();
	const { sessionAccess } = broker;

	const icons: {
		[key: string]: any;
	} = {
		group: faObjectGroup,
		object: faVectorSquare,
		layer: faLayerGroup,
		cornerstone: faDraftingCompass,
		folder: faFolder,
		cad: faFile,
		path: faVectorSquare,
		circle: faCircle,
		arc: faBezierCurve
	};

	export let node: EditorLayerNode;

	let nodeElement: HTMLElement;

	let editingName = false;

	const toggleState: Writable<Map<string, boolean>> = getContext('toggle');

	$: isOpen = $toggleState.get(node.id) ?? false;

	function toggle(e: MouseEvent) {
		e.preventDefault();
		$toggleState.set(node.id, !($toggleState.get(node.id) ?? false));
		$toggleState = $toggleState;
	}

	const { selection, effectiveSelection } = editor;

	function select(e: MouseEvent) {
		if (!selected) {
			if (e.ctrlKey) {
				editor.addSelection(node.id);
			} else {
				editor.select(node.id);
			}
		}
	}

	$: selected = $selection.includes(node.id);
	$: selectedPartial = $effectiveSelection.includes(node.id);

	$: {
		if ($selection.length > 0 && $selection[0] == node.id) {
			if (browser) {
				if (nodeElement) {
					let rect = nodeElement.getBoundingClientRect();
					if (rect.top < 0 || rect.bottom > window.innerHeight)
						nodeElement.scrollIntoView({
							block: 'center'
						});
				}
			}
		}
	}

	$: name = broker.writableObjectProperty(node.id, 'name', undefined);

	function isChildOf(child: string, parent: string) {
		let current: string | null = child;
		while (current !== null) {
			if (current === parent) {
				return true;
			}

			current = broker.project.objectsMap.get(current)?.parent ?? null;
		}

		return false;
	}
</script>

<div class="flex flex-col">
	<Draggable
		canSelect={false}
		draggableKey="layers"
		payload={node.id}
		commit={(from, to, bias) => {
			console.log(from, to, bias);
			let transaction = broker.project.createTransaction();
			if (bias != 0) {
				let parentId = broker.project.objectsMap.get(to)?.parent ?? null;
				console.log(parentId, bias);
				let list = broker.project.objects.filter((o) => {
					if (typeof parentId === 'string') {
						return o.parent === parentId;
					} else {
						return o.parent === null || typeof o.parent === 'undefined';
					}
				});
				let count = 0;
				for (const id of $selection) {
					if (isChildOf(to, id)) {
						continue;
					}
					count++;
				}

				list.sort((a, b) => a.order - b.order);

				// Make space for the dragged items between the items they are being dragged to

				let index = list.findIndex((o) => o.id === to) + (bias == 1 ? 1 : 0);

				// Push all items after the index item down

				for (let i = 0; i < list.length; i++) {
					if (i < index) {
						transaction.update(list[i].id, 'order', i);
					} else {
						transaction.update(list[i].id, 'order', i + count);
					}
				}

				let innerCount = 0;
				for (const id of $selection) {
					if (isChildOf(to, id)) {
						continue;
					}
					transaction.update(id, 'parent', parentId);
					transaction.update(id, 'order', index + innerCount);
					innerCount++;
				}
			} else {
				for (const id of $selection) {
					if (isChildOf(to, id)) {
						continue;
					}
					transaction.update(id, 'parent', to);
				}
			}
			broker.commitTransaction(transaction);
		}}
	>
		<button
			bind:this={nodeElement}
			class="layer-item cursor-default flex flex-row p-2 hover:bg-gray-100 items-center border border-transparent"
			class:selected
			class:selected-partial={selectedPartial}
			on:mousedown={select}
		>
			{#if node.children && node.children.length > 0}
				<button
					class="cursor-default w-6 h-6 hover:bg-gray-200 flex items-center justify-center rounded-md text-gray-400"
					on:click|stopPropagation={toggle}
					on:mousedown|stopPropagation={() => {}}
				>
					<Fa icon={isOpen ? faCaretDown : faCaretRight} /></button
				>
			{:else}
				<div class="w-6 h-6" />
			{/if}
			<span class="w-6 h-6 flex items-center justify-center"
				><Fa icon={icons[node.icon] ?? faQuestion} /></span
			>
			<span class="ml-2 h-6 w-full flex items-center">
				<EditableLabel
					readonly={!compareAccess('WRITE', $sessionAccess)}
					fullWidth
					class="w-full h-full"
					value={$name}
					bind:editing={editingName}
					on:change={(e) => {
						$name = e.detail;
					}}
				/>
			</span>
		</button>
	</Draggable>

	<ContextMenu el={nodeElement}>
		<button
			on:click={(e) => {
				editor.flyToSelection(true);
			}}><Fa icon={faMapPin} /> Locate</button
		>
		{#if compareAccess('WRITE', $sessionAccess)}
			<button
				on:click={(e) => {
					setTimeout(() => {
						editingName = true;
					});
				}}><Fa icon={faPenToSquare} /> Rename</button
			>
			<button
				on:click={(e) => {
					editor.deleteSelection(broker);
				}}><Fa icon={faTrash} /> Delete</button
			>
		{/if}
	</ContextMenu>

	{#if node.children && ($toggleState.get(node.id) ?? false)}
		<div class="flex flex-col ml-4">
			{#each node.children as child}
				<svelte:self node={child} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.selected {
		@apply bg-blue-200 border border-blue-500;
	}

	.selected-partial:not(.selected) {
		@apply bg-blue-100 border border-blue-300;
	}
</style>
