<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import EditorCadNode from '../editor/common/EditorCadNode.svelte';
	import { getCadsStore, refreshData } from 'src/store/cads';
	import ContextMenu from '../editor/common/ContextMenu.svelte';
	import Fa from 'svelte-fa';
	import {
		faArrowLeft,
		faFolderPlus,
		faPlus,
		faRefresh,
		faUpload
	} from '@fortawesome/free-solid-svg-icons';
	import {
		createCadFolder,
		processCadUploads,
		updateCadFile,
		updateCadFolder
	} from '$lib/client/api';
	import Draggable from '../editor/common/Draggable.svelte';
	import type { CadTreeNode } from '$lib/types/cad';
	import { isMobile } from 'src/store/responsive';
	import TabWrap from '../editor/common/TabWrap.svelte';
	import TabWrapTab from '../editor/common/TabWrapTab.svelte';
	import { createPortal, portal } from '$lib/util/actions';
	import { getSvelteContext } from 'src/store/editor';
	import DialogSlideLeft from 'src/components/common/DialogSlideLeft.svelte';

	const { editor } = getSvelteContext();

	let toggleState = writable(new Map<string, boolean>());

	setContext('toggle', toggleState);

	let newEditId = writable('');

	setContext('newEditId', newEditId);

	let selectedId = writable('');
	setContext('selectedId', selectedId);

	const cadStore = getCadsStore();

	let containerEl: HTMLElement;
	let fileDragging = false;

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
	class:bg-gray-100={fileDragging}
	class:outline={fileDragging}
	class:outline-1={fileDragging}
	class:outline-blue-500={fileDragging}
	class:-outline-offset-1={fileDragging}
	class:pointer-events-auto={$isMobile}
	on:dragenter={(e) => {
		e.preventDefault();
		e.stopPropagation();
		fileDragging = true;
	}}
	on:dragover={(e) => {
		e.preventDefault();
		e.stopPropagation();
		fileDragging = true;
	}}
	on:drop={async (e) => {
		if (!editor) return;
		e.preventDefault();
		e.stopPropagation();
		fileDragging = false;

		if (e.dataTransfer) {
			const files = e.dataTransfer.files;

			await processCadUploads(editor, files, null);

			await refreshData();
		}
	}}
	on:dragleave={(e) => {
		e.preventDefault();
		e.stopPropagation();
		fileDragging = false;
	}}
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
				let fileInput = document.querySelector('#import-file');
				if (fileInput && fileInput instanceof HTMLInputElement) {
					fileInput.click();
				}
			}}><Fa icon={faUpload} /> Upload DWG</button
		>
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

	<div class="absolute bottom-0 w-full" use:createPortal={'drawer'} />
</div>
