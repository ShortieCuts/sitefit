<script lang="ts">
	import {
		faCaretDown,
		faCaretRight,
		faDrawPolygon,
		faFolder,
		faFolderPlus,
		faLayerGroup,
		faObjectGroup,
		faPenToSquare,
		faPlane,
		faPlus,
		faQuestion,
		faTrash
	} from '@fortawesome/free-solid-svg-icons';
	import { getContext } from 'svelte';
	import Fa from 'svelte-fa';
	import { get, type Writable } from 'svelte/store';
	import type { EditorLayerNode } from './EditorLayerNode';
	import { getSvelteContext } from 'src/store/editor';
	import type { CadTreeNode } from '$lib/types/cad';
	import ContextMenu from './ContextMenu.svelte';
	import EditableLabel from './EditableLabel.svelte';
	import { createCadFolder, updateCadFile, updateCadFolder } from '$lib/client/api';
	import { refreshData } from 'src/store/cads';
	import Draggable from './Draggable.svelte';

	const { editor, broker } = getSvelteContext();

	const icons: {
		[key: string]: any;
	} = {
		folder: faFolder,
		cad: faDrawPolygon
	};

	export let node: CadTreeNode;

	const toggleState: Writable<Map<string, boolean>> = getContext('toggle');

	$: isOpen = $toggleState.get(node.id) ?? false;

	function toggle() {
		$toggleState.set(node.id, !($toggleState.get(node.id) ?? false));
		$toggleState = $toggleState;
	}

	let nodeElement: HTMLElement;

	let editingName = false;

	const newEditId = getContext('newEditId') as Writable<string>;

	let checkEdit = () => {
		if ($newEditId === node.id) {
			editingName = true;
			$newEditId = '';
		}
	};
	$: {
		$newEditId;

		checkEdit();
	}

	async function makeSubFolder() {
		let res = await createCadFolder({
			parentId: node.id
		});

		let folderId = res.data.folderId;

		await refreshData();
		setTimeout(() => {
			newEditId.set(folderId.toString());
		}, 10);
	}

	function checkForChild(id: string, children: CadTreeNode[]) {
		for (let child of children) {
			if (child.id === id) {
				return true;
			}

			if (child.children && child.children.length > 0) {
				if (checkForChild(id, child.children)) {
					return true;
				}
			}
		}

		return false;
	}
</script>

<div class="flex flex-col">
	<Draggable
		allowReorder={false}
		draggableKey="files"
		payload={node.id}
		commit={async (from, to, bias) => {
			if (node.type == 'folder') {
				// Check if we're moving to a child
				if (checkForChild(to, node.children)) {
					return;
				}

				await updateCadFolder(node.id, {
					parentId: to
				});
			} else {
				await updateCadFile(node.id, {
					parentId: to
				});
			}
			await refreshData();
		}}
	>
		<button
			bind:this={nodeElement}
			class="layer-item cursor-default flex flex-row p-2 hover:bg-gray-100 items-center border border-transparent w-full"
		>
			{#if node.children && node.children.length > 0}
				<button
					class="cursor-default w-6 h-6 hover:bg-gray-200 flex items-center justify-center rounded-md text-gray-400"
					on:click|stopPropagation={toggle}
				>
					<Fa icon={isOpen ? faCaretDown : faCaretRight} /></button
				>
			{:else}
				<div class="w-6 h-6" />
			{/if}
			<span class="w-6 h-6 flex items-center justify-center"
				><Fa icon={icons[node.type] ?? faQuestion} /></span
			>
			<span class="ml-2 h-6 w-full flex items-center">
				<EditableLabel
					fullWidth
					class="w-full h-full"
					value={node.name ?? node.type}
					bind:editing={editingName}
					on:change={(e) => {
						if (node.type == 'folder') {
							updateCadFolder(node.id, {
								name: e.detail
							});
						} else {
							updateCadFile(node.id, {
								name: e.detail
							});
						}
					}}
				/>
			</span>
		</button>
	</Draggable>

	{#if node.children && ($toggleState.get(node.id) ?? false)}
		<div class="flex flex-col ml-4">
			{#each node.children as child}
				<svelte:self node={child} />
			{/each}
		</div>
	{/if}
	<ContextMenu el={nodeElement}>
		{#if node.type == 'folder'}
			<button on:click={makeSubFolder}><Fa icon={faFolderPlus} /> New folder</button>
		{:else}
			<button
				on:click={() => {
					console.log(get(editor.longitude), get(editor.latitude));
					let position = editor.lonLatToPosition(get(editor.longitude), get(editor.latitude));
					console.log('center', position);
					broker.placeCad(node.id, position);
				}}><Fa icon={faPlus} /> Place on map</button
			>
		{/if}
		<button
			on:click={(e) => {
				setTimeout(() => {
					editingName = true;
				});
			}}><Fa icon={faPenToSquare} /> Rename</button
		>
		<button><Fa icon={faTrash} /> Delete</button>
	</ContextMenu>
</div>

<style>
	.selected {
		@apply bg-blue-200 border border-blue-500;
	}
</style>
