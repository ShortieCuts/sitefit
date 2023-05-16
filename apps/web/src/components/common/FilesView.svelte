<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import EditorCadNode from '../editor/common/EditorCadNode.svelte';
	import { getCadsStore, refreshData } from 'src/store/cads';
	import ContextMenu from '../editor/common/ContextMenu.svelte';
	import Fa from 'svelte-fa';
	import { faArrowLeft, faFolderPlus, faPlus, faRefresh } from '@fortawesome/free-solid-svg-icons';
	import { createCadFolder, updateCadFile, updateCadFolder } from '$lib/client/api';
	import Draggable from '../editor/common/Draggable.svelte';
	import type { CadTreeNode } from '$lib/types/cad';
	import { isMobile } from 'src/store/responsive';
	import TabWrap from '../editor/common/TabWrap.svelte';
	import TabWrapTab from '../editor/common/TabWrapTab.svelte';
	import { portal } from '$lib/util/actions';
	import { getSvelteContext } from 'src/store/editor';
	import DialogSlideLeft from 'src/components/common/DialogSlideLeft.svelte';

	// const { editor } = getSvelteContext();

	let toggleState = writable(new Map<string, boolean>());

	setContext('toggle', toggleState);

	let newEditId = writable('');

	setContext('newEditId', newEditId);

	const cadStore = getCadsStore();

	let containerEl: HTMLElement;

	function findChild(id: string, children: CadTreeNode[]): CadTreeNode | null {
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
	class:pointer-events-auto={$isMobile}
>
	{#each $cadStore.children as node}
		<EditorCadNode {node} />
	{/each}
	<div bind:this={containerEl} class="contents">
		<Draggable
			canSelect={false}
			allowReorder={false}
			draggableKey="files"
			payload=""
			commit={async (from, to, bias) => {
				if (!from) return;

				let node = findChild(from, $cadStore.children);
				if (!node) return;

				if (node.type == 'folder') {
					await updateCadFolder(node.id, {
						parentId: ''
					});
				} else {
					await updateCadFile(node.id, {
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
				let res = await createCadFolder({
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
