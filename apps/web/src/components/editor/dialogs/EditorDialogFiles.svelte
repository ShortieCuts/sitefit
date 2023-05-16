<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import EditorCadNode from '../common/EditorCadNode.svelte';
	import { getCadsStore, refreshData } from 'src/store/cads';
	import ContextMenu from '../common/ContextMenu.svelte';
	import Fa from 'svelte-fa';
	import { faArrowLeft, faFolderPlus, faPlus, faRefresh } from '@fortawesome/free-solid-svg-icons';
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

	const { editor } = getSvelteContext();

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

<DialogSlideLeft name="Insert CAD">
	<FilesView />
</DialogSlideLeft>
