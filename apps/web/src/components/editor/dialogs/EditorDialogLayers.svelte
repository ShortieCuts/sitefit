<script lang="ts">
	import DialogSlideUp from 'src/components/common/DialogSlideUp.svelte';
	import ResponsiveGroup from 'src/components/common/ResponsiveGroup.svelte';
	import { getSvelteContext } from 'src/store/editor';
	import type { ProjectMapStyle } from 'core';
	import type { EditorLayerNode } from '../common/EditorLayerNode';
	import EditorLayersNode from '../common/EditorLayersNode.svelte';
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';

	const { broker } = getSvelteContext();
	const mapStyle = broker.writableGlobalProperty<ProjectMapStyle>('mapStyle', 'google-satellite');

	let objectTree: EditorLayerNode[] = [];
	let toggleState = writable(new Map<string, boolean>());

	setContext('toggle', toggleState);

	function buildObjectTree() {
		let children = new Map<string, EditorLayerNode[]>();
		objectTree = [];
		const objects = broker.project.objects;

		for (const obj of objects) {
			let rep = {
				icon: 'object',
				id: obj.id,
				name: obj.name,
				visible: obj.visible,
				children: []
			} as EditorLayerNode;

			if (obj.parent) {
				if (!children.has(obj.parent)) {
					children.set(obj.parent, []);
				}
				children.get(obj.parent)!.push(rep);
			} else {
				objectTree.push(rep);
			}
		}

		function resolveChildren(rep: EditorLayerNode) {
			if (children.has(rep.id)) {
				rep.children = children.get(rep.id)!;
				for (const child of rep.children) {
					resolveChildren(child);
				}
			}
		}

		for (const rep of objectTree) {
			resolveChildren(rep);
		}
	}

	const { objectTreeWatcher } = broker;
	$: {
		let dummy = $objectTreeWatcher;
		buildObjectTree();

		console.log('objectTree', objectTree);
	}

	console.log('objectTree', objectTree);
</script>

<div class="overflow-y-auto max-h-full">
	{#each objectTree as node}
		<EditorLayersNode {node} />
	{/each}
</div>
