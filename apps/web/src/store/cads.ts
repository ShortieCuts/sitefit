import { getCads } from '$lib/client/api';
import type { CadTreeNode } from '$lib/types/cad';
import { readable, type Readable } from 'svelte/store';

let cachedReadable: Readable<CadTreeNode> | null = null;

let realTree = { id: '', name: '', type: 'folder', children: [] } as CadTreeNode;

let refreshStore = () => {};

export async function refreshData() {
	let cads = await getCads({});

	realTree = cads.data;

	refreshStore();
}

export function getCadsStore() {
	if (!cachedReadable) {
		cachedReadable = readable<CadTreeNode>(realTree, (set) => {
			refreshStore = () => {
				set(realTree);
			};
			let unsubscribe = () => {
				refreshStore = () => {};
			};
			refreshData();
			return unsubscribe;
		});
	}

	return cachedReadable;
}
