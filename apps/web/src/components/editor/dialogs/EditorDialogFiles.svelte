<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import EditorCadNode from '../common/EditorCadNode.svelte';
	import { getCadsStore, refreshData } from 'src/store/cads';
	import ContextMenu from '../common/ContextMenu.svelte';
	import Fa from 'svelte-fa';
	import {
		faArrowLeft,
		faFolderPlus,
		faPlus,
		faRefresh,
		faUpload
	} from '@fortawesome/free-solid-svg-icons';
	import { createCadFolder, updateCadFile, updateCadFolder } from '$lib/client/api';
	import Draggable from '../common/Draggable.svelte';
	import type { CadTreeNode } from '$lib/types/cad';
	import { isMobile } from 'src/store/responsive';
	import TabWrap from '../common/TabWrap.svelte';
	import TabWrapTab from '../common/TabWrapTab.svelte';
	import { portal } from '$lib/util/actions';
	import { getSvelteContext } from 'src/store/editor';
	import DialogSlideLeft from 'src/components/common/DialogSlideLeft.svelte';
	import FilesView from 'src/components/common/FilesView.svelte';
	import { slide } from 'svelte/transition';

	const { editor } = getSvelteContext();

	const { uploadInProgress, uploads } = editor;

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

<DialogSlideLeft fullHeight name="Insert CAD">
	<div class="flex-1 relative">
		<FilesView />
	</div>
	{#if $uploadInProgress}
		<div
			transition:slide
			class="bg-gray-50 rounded-md shadow-md p-4 w-[400px] flex flex-col border-t-2 border-t-white"
		>
			<div class="text-4xl flex flex-col items-center justify-center p-8">
				<Fa class="blink" icon={faUpload} />
				<h2 class="mt-4 text-lg">Uploading CAD{$uploads.length > 1 ? 's' : ''}</h2>
			</div>
			{#each $uploads as upload}
				<div class="flex flex-col items-center min-h-12 border-b border-gray-100 py-4">
					<div class="flex-1">
						{upload.name}
					</div>
					<div class="text-gray-400 uppercase text-sm px-2">
						{upload.status}
					</div>
					<div>
						<div class="h-2 w-24 relative bg-gray-100 overflow-hidden rounded">
							<div
								class="rounded absolute top-0 left-0 bottom-0 bg-blue-500 transition-all duration-[2s] ease-in-out"
								style="width: {upload.progress}%;"
							/>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</DialogSlideLeft>
