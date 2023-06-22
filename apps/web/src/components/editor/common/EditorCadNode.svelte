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
	import { get, writable, type Writable } from 'svelte/store';
	import type { EditorLayerNode } from './EditorLayerNode';
	import { getSvelteContext, type ProjectAccessLevel } from 'src/store/editor';
	import type { CadTreeNode } from '$lib/types/cad';
	import ContextMenu from './ContextMenu.svelte';
	import EditableLabel from './EditableLabel.svelte';
	import {
		createCadFolder,
		getCads,
		processCadUploads,
		updateCadFile,
		updateCadFolder
	} from '$lib/client/api';
	import { refreshData } from 'src/store/cads';
	import Draggable from './Draggable.svelte';
	import { isMobile } from 'src/store/responsive';
	import TabWrap from './TabWrap.svelte';
	import TabWrapTab from './TabWrapTab.svelte';
	import { portal } from '$lib/util/actions';
	import { fly, slide } from 'svelte/transition';
	import { compareAccess } from '$lib/util/access';
	import ModelViewer from 'src/components/common/ModelViewer.svelte';
	import EllipsisButton from './EllipsisButton.svelte';

	const { editor, broker } = getSvelteContext();
	let sessionAccess: Writable<ProjectAccessLevel> = writable('READ');

	if (broker) {
		sessionAccess = broker.sessionAccess;
	}

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

	let selected = false;

	let fileDragging = false;

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

	async function deleteNode() {
		let tree = await getCads({});
		if (!tree.data) return;
		let trashFolder = tree.data.children.find((x) => x.name == 'Trash');

		if (!trashFolder) {
			let newFolder = await createCadFolder({
				parentId: tree.data.id
			});
			await updateCadFolder(newFolder.data.folderId, {
				name: 'Trash'
			});
			if (!newFolder.data) {
				console.error('Error making new folder');
				return;
			}

			trashFolder = { id: newFolder.data.folderId, name: 'Trash', type: 'folder', children: [] };
		}

		if (node.type == 'folder') {
			await updateCadFolder(node.id, {
				parentId: trashFolder.id.toString()
			});
		} else {
			await updateCadFile(node.id, {
				parentId: trashFolder.id.toString()
			});
		}
		await refreshData();
	}
</script>

<div
	class="flex flex-col"
	style={node.type == 'folder' && node.name == 'Trash'
		? 'position: absolute; bottom: 0px; width: 100%; background-color: #f9fafb; z-index: 2; max-height: 60%; overflow-y: auto;'
		: ''}
>
	<Draggable
		allowReorder={false}
		draggableKey="files"
		payload={node.id}
		bind:selected
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
			on:dragenter={(e) => {
				if (node.type == 'folder') {
					e.preventDefault();
					e.stopPropagation();
					fileDragging = true;
				}
			}}
			on:dragover={(e) => {
				if (node.type == 'folder') {
					e.preventDefault();
					e.stopPropagation();
					fileDragging = true;
				}
			}}
			on:drop={async (e) => {
				if (node.type == 'folder') {
					e.preventDefault();
					e.stopPropagation();
					fileDragging = false;

					if (e.dataTransfer) {
						const files = e.dataTransfer.files;

						await processCadUploads(editor, files, parseInt(node.id));

						await refreshData();
					}
				}
			}}
			on:dragleave={(e) => {
				if (node.type == 'folder') {
					e.preventDefault();
					e.stopPropagation();
					fileDragging = false;
				}
			}}
			class="layer-item cursor-default ellipsis-wrapper flex flex-row p-2 hover:bg-gray-100 items-center border border-transparent w-full"
			class:bg-blue-500={fileDragging}
			on:click={() => {
				if (node.children && node.children.length > 0) {
					$toggleState.set(node.id, true);
					$toggleState = $toggleState;
				}
			}}
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
			<span class="w-6 h-6 flex items-center justify-center">
				{#if node.type == 'folder' && node.name == 'Trash'}
					<Fa icon={faTrash} />
				{:else}
					<Fa icon={icons[node.type] ?? faQuestion} />
				{/if}
			</span>
			<span class="ml-2 h-6 w-full flex items-center">
				<EditableLabel
					fullWidth
					class="w-full h-full flex items-center line-height-low"
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
			<EllipsisButton />
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
		{:else if compareAccess('WRITE', $sessionAccess)}
			<button
				on:click={() => {
					let position = editor.lonLatToPosition(get(editor.longitude), get(editor.latitude));
					console.log('Make from context');
					broker.placeCad(node.id, position);
					editor.activateDialog('');
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
		<button
			on:click={async () => {
				deleteNode();
			}}><Fa icon={faTrash} /> Delete</button
		>
	</ContextMenu>
</div>
{#if selected && !(!$isMobile && node.type == 'folder')}
	<div
		transition:fly={{ y: 400, duration: 200 }}
		use:portal={$isMobile ? 'root' : 'drawer'}
		class="bg-gray-100 py-4 border-t-2 border-gray-200 {$isMobile
			? 'fixed'
			: 'absolute'} bottom-0 left-0 w-full z-50"
	>
		{#if node.type == 'folder'}
			{#if $isMobile}
				<TabWrap names={['Actions']}>
					<TabWrapTab class="flex flex-col space-y-2" tab={0}>
						<button
							class="flex flex-row items-center justify-start py-2 px-4"
							on:click={makeSubFolder}><Fa class="pr-4" icon={faFolderPlus} /> New folder</button
						>
						<button
							class="flex flex-row items-center justify-start py-2 px-4"
							on:click={(e) => {
								setTimeout(() => {
									editingName = true;
								});
							}}><Fa class="pr-4" icon={faPenToSquare} /> Rename</button
						>
					</TabWrapTab>
				</TabWrap>
			{/if}
		{:else}
			<TabWrap
				names={$isMobile
					? node.type == 'cad'
						? ['Actions', 'Preview', 'Details']
						: ['Actions']
					: ['Preview']}
			>
				{#if $isMobile}
					<TabWrapTab class="flex flex-col space-y-2" tab={0}>
						{#if compareAccess('WRITE', $sessionAccess)}
							<button
								class="flex flex-row items-center justify-start py-2 px-4"
								on:click={() => {
									let position = editor.lonLatToPosition(
										get(editor.longitude),
										get(editor.latitude)
									);

									broker.placeCad(node.id, position);
									editor.activateDialog('');
								}}><Fa class="pr-4" icon={faPlus} /> Place on map</button
							>
						{/if}
						<button
							class="flex flex-row items-center justify-start py-2 px-4"
							on:click={(e) => {
								setTimeout(() => {
									editingName = true;
								});
							}}><Fa class="pr-4" icon={faPenToSquare} /> Rename</button
						>
						<button
							class="flex flex-row items-center justify-start py-2 px-4"
							on:click={async () => {
								deleteNode();
							}}
						>
							<Fa class="pr-4" icon={faTrash} /> Delete</button
						>
					</TabWrapTab>
				{/if}
				<TabWrapTab class="bg-white" tab={$isMobile ? 1 : 0}>
					<ModelViewer fileId={node.id} />
					{#if node.file && !$isMobile}
						<p class="px-4 pb-2">
							<b>Date Uploaded</b>:
							{new Date(node.file.createdAt).toLocaleDateString()}
						</p>
						<p class="px-4">
							<b>Original Filename</b>:
							{node.file.filename}
						</p>
					{/if}
				</TabWrapTab>
				{#if $isMobile && node.type == 'cad'}
					<TabWrapTab class="" tab={$isMobile ? 2 : 1}>
						{#if node.file}
							<p class="px-4 pb-2">
								<b>Date Uploaded</b>:
								{new Date(node.file.createdAt).toLocaleDateString()}
							</p>
							<p class="px-4">
								<b>Original Filename</b>:
								{node.file.filename}
							</p>
						{:else}
							N/A
						{/if}
					</TabWrapTab>
				{/if}
			</TabWrap>
		{/if}
	</div>
{/if}

<style>
	.selected {
		@apply bg-blue-200 border border-blue-500;
	}
	:global(.line-height-low) {
		line-height: 1;
	}
</style>
