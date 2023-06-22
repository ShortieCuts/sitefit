import { getProjects } from '$lib/client/api';
import type { ProjectTreeNode } from '$lib/types/project';
import { readable, type Readable } from 'svelte/store';

let cachedReadable: Readable<ProjectTreeNode> | null = null;

let realTree = { id: '', name: '', type: 'folder', children: [] } as ProjectTreeNode;

let refreshStore = () => {};

export async function refreshData() {
	let projects = await getProjects({
		admin: true
	});

	realTree = projects.data;

	refreshStore();
}

export function getProjectsAdminStore() {
	if (!cachedReadable) {
		cachedReadable = readable<ProjectTreeNode>(realTree, (set) => {
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
