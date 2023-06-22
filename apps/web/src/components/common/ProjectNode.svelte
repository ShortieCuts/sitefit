<script lang="ts">
	import {
		faCaretDown,
		faCaretRight,
		faCheck,
		faCopy,
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
		faTrash,
		faTrashCan
	} from '@fortawesome/free-solid-svg-icons';
	import { getContext } from 'svelte';
	import Fa from 'svelte-fa';
	import type { Writable } from 'svelte/store';

	import { getSvelteContext } from 'src/store/editor';
	import type { ProjectTreeNode } from '$lib/types/project';
	import ContextMenu from '../editor/common/ContextMenu.svelte';
	import EditableLabel from '../editor/common/EditableLabel.svelte';
	import {
		copyProject,
		createProject,
		createProjectFolder,
		getProjects,
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
	import UserChip from '../auth/UserChip.svelte';

	const icons: {
		[key: string]: any;
	} = {
		folder: faFolder,
		project: faMapLocationDot
	};

	const { editor } = getSvelteContext();

	let isActive = false;

	export let node: ProjectTreeNode & { owner?: string };

	$: {
		if (node && node.type == 'project' && editor && editor.broker.projectId == node.id) {
			isActive = true;
		} else {
			isActive = false;
		}
	}

	const toggleState: Writable<Map<string, boolean>> = getContext('toggle');

	$: isOpen = $toggleState.get(node.id) ?? false;

	function toggle() {
		$toggleState.set(node.id, !($toggleState.get(node.id) ?? false));
		$toggleState = $toggleState;
	}

	async function duplicateProject(id: string) {
		let res = await copyProject(id, {
			name: node.name + ' (Copy)'
		});
		if (res.data) {
			await refreshData();
			setTimeout(() => {
				newEditId.set(res.data.id.toString());
			}, 10);
		} else {
			editor?.alert('Error duplicating project');
		}
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
			name: 'New Site',
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

	async function deleteNode() {
		let tree = await getProjects({});
		if (!tree.data) return;
		let trashFolder = tree.data.children.find((x) => x.name == 'Trash');

		if (!trashFolder) {
			let newFolder = await createProjectFolder({
				parentId: tree.data.id
			});
			await updateProjectFolder(newFolder.data.folderId, {
				name: 'Trash'
			});
			if (!newFolder.data) {
				console.error('Error making new folder');
				return;
			}

			trashFolder = { id: newFolder.data.folderId, name: 'Trash', type: 'folder', children: [] };
		}

		if (node.type == 'folder') {
			await updateProjectFolder(node.id, {
				parentId: trashFolder.id.toString()
			});
		} else {
			await updateProjectFile(node.id, {
				parentId: trashFolder.id.toString()
			});
		}
		await refreshData();
	}
</script>

{#key node.id}
	<div
		class="flex flex-col"
		style={node.type == 'folder' && node.name == 'Trash'
			? 'position: absolute; bottom: 0px; width: 100%; background-color: #f9fafb; z-index: 2'
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
				<div class="flex flex-row mr-12 w-40">
					{#if node.owner}
						<UserChip showName small horizontal userId={node.owner} />
					{/if}
				</div>
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
				<button on:click={makeSubProject}><Fa icon={faSquarePlus} /> New site</button>
			{:else}
				<button
					on:click={() => {
						location.href = `/project/${node.id}`;
					}}><Fa icon={faExternalLink} /> Open project</button
				>
				<button
					class="flex flex-row items-center justify-start py-2 px-4"
					on:click={() => {
						duplicateProject(node.id);
					}}><Fa class="" icon={faCopy} />Duplicate</button
				>
			{/if}
			<button
				on:click={(e) => {
					setTimeout(() => {
						editingName = true;
					});
				}}><Fa icon={faPenToSquare} /> Rename</button
			>
			<button on:click={() => deleteNode()}> <Fa icon={faTrash} /> Delete</button>
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
							on:click={() => {
								duplicateProject(node.id);
							}}><Fa class="pr-4" icon={faCopy} /> Duplicate</button
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
							><Fa class="pr-4" icon={faTrash} on:click={() => deleteNode()} /> Delete</button
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
{/key}

<style>
	.selected {
		@apply bg-blue-200 border border-blue-500;
	}
</style>
