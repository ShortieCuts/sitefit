<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import ProjectNode from './ProjectNode.svelte';
	import { isMobile } from 'src/store/responsive';
	import { getProjectsAdminStore } from 'src/store/projectsAdmin';

	let toggleState = writable(new Map<string, boolean>());

	setContext('toggle', toggleState);

	let newEditId = writable('');

	setContext('newEditId', newEditId);

	const projectStore = getProjectsAdminStore();
</script>

<div
	class="overflow-y-auto max-h-full h-full flex flex-col flex-shrink-0"
	class:bg-white={$isMobile}
	class:pointer-events-auto={$isMobile}
>
	{#each $projectStore.children as node}
		<ProjectNode {node} />
	{/each}
</div>
