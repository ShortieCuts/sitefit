<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import ProjectNode from './ProjectNode.svelte';
	import { getProjectsStore, refreshData } from 'src/store/projects';
	import ContextMenu from '../editor/common/ContextMenu.svelte';
	import Fa from 'svelte-fa';
	import {
		faFolderPlus,
		faMapLocation,
		faPlus,
		faRefresh
	} from '@fortawesome/free-solid-svg-icons';
	import {
		createProject,
		createProjectFolder,
		updateProjectFile,
		updateProjectFolder
	} from '$lib/client/api';
	import Draggable from '../editor/common/Draggable.svelte';
	import type { ProjectTreeNode } from '$lib/types/project';
	import { isMobile } from 'src/store/responsive';

	let toggleState = writable(new Map<string, boolean>());

	setContext('toggle', toggleState);

	let newEditId = writable('');

	setContext('newEditId', newEditId);

	const projectStore = getProjectsStore();

	let containerEl: HTMLElement;

	function findChild(id: string, children: ProjectTreeNode[]): ProjectTreeNode | null {
		for (let child of children) {
			if (child.id === id) {
				return child;
			}

			let found = findChild(id, child.children);
			if (found) {
				return found;
			}
		}

		return null;
	}
</script>

<div
	class="overflow-y-auto max-h-full h-full flex flex-col flex-shrink-0"
	class:bg-white={$isMobile}
	class:pointer-events-auto={$isMobile}
>
	<div class="flex flex-row px-6 py-2 space-x-4">
		<button
			class="btn"
			on:click={async (e) => {
				let res = await createProject({
					name: 'New Project',
					description: ''
				});

				let projectId = res.data.projectId;

				await refreshData();
				setTimeout(() => {
					newEditId.set(projectId.toString());
				}, 10);
			}}><Fa icon={faMapLocation} /> New Project</button
		>
		<button
			class="btn"
			on:click={async (e) => {
				let res = await createProjectFolder({
					parentId: ''
				});

				let folderId = res.data.folderId;

				await refreshData();
				setTimeout(() => {
					newEditId.set(folderId.toString());
				}, 10);
			}}><Fa icon={faFolderPlus} /> New folder</button
		>
	</div>
	{#each $projectStore.children as node}
		<ProjectNode {node} />
	{/each}
	<div bind:this={containerEl} class="contents">
		<Draggable
			canSelect={false}
			allowReorder={false}
			draggableKey="files"
			payload=""
			commit={async (from, to, bias) => {
				if (!from) return;

				let node = findChild(from, $projectStore.children);
				if (!node) return;

				if (node.type == 'folder') {
					await updateProjectFolder(node.id, {
						parentId: ''
					});
				} else {
					await updateProjectFile(node.id, {
						parentId: ''
					});
				}
				await refreshData();
			}}
		>
			<div class="flex-1 min-h-[30px]" />
		</Draggable>
	</div>

	<ContextMenu el={containerEl}>
		<button
			on:click={async (e) => {
				let res = await createProject({
					name: 'New Project',
					description: ''
				});

				let projectId = res.data.projectId;

				await refreshData();
				setTimeout(() => {
					newEditId.set(projectId.toString());
				}, 10);
			}}><Fa icon={faMapLocation} /> New Project</button
		>
		<button
			on:click={async (e) => {
				let res = await createProjectFolder({
					parentId: ''
				});

				let folderId = res.data.folderId;

				await refreshData();
				setTimeout(() => {
					newEditId.set(folderId.toString());
				}, 10);
			}}><Fa icon={faFolderPlus} /> New folder</button
		>
		<button
			on:click={(e) => {
				refreshData();
			}}><Fa icon={faRefresh} /> Refresh</button
		>
	</ContextMenu>
</div>
