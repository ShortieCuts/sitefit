<script lang="ts">
	import {
		faCaretDown,
		faCaretRight,
		faCheck,
		faDrawPolygon,
		faExternalLink,
		faFolder,
		faFolderPlus,
		faLayerGroup,
		faMapLocationDot,
		faObjectGroup,
		faPenToSquare,
		faPlane,
		faPlus,
		faQuestion,
		faSquarePlus,
		faTrash
	} from '@fortawesome/free-solid-svg-icons';
	import { getContext } from 'svelte';
	import Fa from 'svelte-fa';
	import type { Writable } from 'svelte/store';

	import { getSvelteContext } from 'src/store/editor';
	import type { ProjectTreeNode } from '$lib/types/project';
	import ContextMenu from '../editor/common/ContextMenu.svelte';
	import EditableLabel from '../editor/common/EditableLabel.svelte';
	import {
		createProject,
		createProjectFolder,
		updateProjectFile,
		updateProjectFolder
	} from '$lib/client/api';
	import { refreshData } from 'src/store/projects';
	import Draggable from '../editor/common/Draggable.svelte';
	import { isMobile } from 'src/store/responsive';
	import { portal } from '$lib/util/actions';
	import { fly, slide } from 'svelte/transition';
	import TabWrap from '../editor/common/TabWrap.svelte';
	import TabWrapTab from '../editor/common/TabWrapTab.svelte';
	import EllipsisButton from '../editor/common/EllipsisButton.svelte';

	const icons: {
		[key: string]: any;
	} = {
		folder: faFolder,
		project: faMapLocationDot
	};

	const { editor } = getSvelteContext();

	let isActive = false;

	export let node: ProjectTreeNode;

	$: {
		if (node && node.type == 'project' && editor && editor.broker.projectId == node.id) {
			isActive = true;
		}
	}

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

	async function makeSubFolder() {
		let res = await createProjectFolder({
			parentId: node.id
		});

		let folderId = res.data.folderId;

		await refreshData();
		setTimeout(() => {
			newEditId.set(folderId.toString());
		}, 10);
	}
	async function makeSubProject() {
		let res = await createProject({
			name: 'New Project',
			description: ''
		});

		let projectId = res.data.projectId;
		await updateProjectFile(projectId, {
			parentId: node.id
		});

		await refreshData();
		setTimeout(() => {
			newEditId.set(projectId.toString());
		}, 10);
	}

	function checkForChild(id: string, children: ProjectTreeNode[]) {
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
		bind:selected
		commit={async (from, to, bias) => {
			if (node.type == 'folder') {
				// Check if we're moving to a child
				if (checkForChild(to, node.children)) {
					return;
				}

				await updateProjectFolder(node.id, {
					parentId: to
				});
			} else {
				await updateProjectFile(node.id, {
					parentId: to
				});
			}
			await refreshData();
		}}
	>
		<button
			bind:this={nodeElement}
			class="layer-item ellipsis-wrapper cursor-default flex flex-row p-2 hover:bg-gray-100 items-center border border-transparent w-full"
			class:text-blue-500={isActive}
			on:dblclick={() => {
				if (node.type == 'project') {
					window.location.href = `/project/${node.id}`;
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
							updateProjectFolder(node.id, {
								name: e.detail
							});
						} else {
							updateProjectFile(node.id, {
								name: e.detail
							});
						}
					}}
				/>
				{#if isActive}
					<span class="ml-2 mr-6 h-6 flex items-center justify-center text-xs">
						active project
					</span>
				{/if}
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
			<button on:click={makeSubProject}><Fa icon={faSquarePlus} /> New project</button>
		{:else}
			<button
				on:click={() => {
					location.href = `/project/${node.id}`;
				}}><Fa icon={faExternalLink} /> Open project</button
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
{#if $isMobile && selected}
	<div
		transition:fly={{ y: 400, duration: 200 }}
		use:portal={'root'}
		class="bg-gray-100 py-4 border-t-2 border-gray-200 fixed bottom-0 left-0 w-full z-50"
	>
		{#if node.type == 'folder'}
			<TabWrap names={['Actions', 'Details']}>
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
				<TabWrapTab class="" tab={1}>N/A</TabWrapTab>
			</TabWrap>
		{:else}
			<TabWrap names={['Actions', 'Details']}>
				<TabWrapTab class="flex flex-col space-y-2" tab={0}>
					<button
						class="flex flex-row items-center justify-start py-2 px-4"
						on:click={() => {
							location.href = `/project/${node.id}`;
						}}><Fa class="pr-4" icon={faExternalLink} /> Open project</button
					>
					<button
						class="flex flex-row items-center justify-start py-2 px-4"
						on:click={(e) => {
							setTimeout(() => {
								editingName = true;
							});
						}}><Fa class="pr-4" icon={faPenToSquare} /> Rename</button
					>
					<button class="flex flex-row items-center justify-start py-2 px-4"
						><Fa class="pr-4" icon={faTrash} /> Delete</button
					></TabWrapTab
				>
				<TabWrapTab class="" tab={1}>
					{#if node.file}
						<p class="px-4 pb-2">
							<b>Date Created</b>:
							{new Date(node.file.createdAt).toLocaleDateString()}
						</p>
						<p class="px-4">
							<b>Project Name</b>:
							{node.file.name}
						</p>
					{:else}
						N/A
					{/if}
				</TabWrapTab>
			</TabWrap>
		{/if}
	</div>
{/if}

<style>
	.selected {
		@apply bg-blue-200 border border-blue-500;
	}
</style>
