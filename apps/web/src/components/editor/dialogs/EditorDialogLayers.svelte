<script lang="ts">
	import DialogSlideUp from 'src/components/common/DialogSlideUp.svelte';
	import ResponsiveGroup from 'src/components/common/ResponsiveGroup.svelte';
	import { getSvelteContext } from 'src/store/editor';
	import {
		Path,
		type Object2D,
		type ProjectMapStyle,
		Arc,
		Circle,
		Group,
		Cornerstone,
		Text
	} from 'core';
	import type { EditorLayerNode } from '../common/EditorLayerNode';
	import EditorLayersNode from '../common/EditorLayersNode.svelte';
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';

	const { editor, broker } = getSvelteContext();
	const { selection } = editor;
	const mapStyle = broker.writableGlobalProperty<ProjectMapStyle>('mapStyle', 'google-satellite');

	let objectTree: EditorLayerNode[] = [];
	let toggleState = writable(new Map<string, boolean>());

	setContext('toggle', toggleState);

	function buildObjectTree() {
		let children = new Map<string, EditorLayerNode[]>();
		objectTree = [];
		const objects = broker.project.objects;

		for (const obj of objects) {
			let icon = 'object';
			if (obj instanceof Path) {
				icon = 'path';
			} else if (obj instanceof Text) {
				icon = 'text';
			} else if (obj instanceof Arc) {
				icon = 'arc';
			} else if (obj instanceof Circle) {
				icon = 'circle';
			} else if (obj instanceof Cornerstone) {
				icon = 'cornerstone';
			} else if (obj instanceof Group) {
				if (obj.iconKind == 'cad') {
					icon = 'cad';
				} else if (obj.iconKind == 'folder') {
					icon = 'folder';
				} else if (obj.iconKind == 'layer') {
					icon = 'layer';
				} else {
					icon = 'group';
				}
			}
			let rep = {
				icon: icon,
				id: obj.id,
				name: obj.name,
				visible: obj.visible,
				order: obj.order,
				children: [],
				globalIndex: 0
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

				rep.children.sort(sortItems);
			}
		}

		for (const rep of objectTree) {
			resolveChildren(rep);
		}
	}

	function sortItems(a: EditorLayerNode, b: EditorLayerNode) {
		const SORT_TO_VERY_TOP = (obj: EditorLayerNode) => {
			return obj.icon == 'cornerstone';
		};

		const SORT_TO_TOP = (obj: EditorLayerNode) => {
			return obj.icon == 'text';
		};

		if (SORT_TO_VERY_TOP(a) && !SORT_TO_VERY_TOP(b)) return -1;
		if (!SORT_TO_VERY_TOP(a) && SORT_TO_VERY_TOP(b)) return 1;
		if (SORT_TO_TOP(a) && !SORT_TO_TOP(b)) return -1;
		if (!SORT_TO_TOP(a) && SORT_TO_TOP(b)) return 1;

		if (a.order === b.order) {
			return a.id.localeCompare(b.id);
		}
		return b.order - a.order;
	}

	const { objectTreeWatcher } = broker;
	let indexArray: EditorLayerNode[] = [];
	$: {
		let dummy = $objectTreeWatcher;
		buildObjectTree();

		objectTree.sort(sortItems);

		let globalIndexCounter = 0;

		indexArray = [];

		function recursiveWalk(node: EditorLayerNode) {
			node.globalIndex = globalIndexCounter++;
			indexArray.push(node);
			for (const child of node.children) {
				recursiveWalk(child);
			}
		}

		for (const node of objectTree) {
			recursiveWalk(node);
		}

		setContext('globalArray', indexArray);
	}

	$: {
		let sels = $selection;
		let alreadyWalked = new Set<string>();
		function walkTreeUp(id: string, visit: (id: string) => void) {
			if (alreadyWalked.has(id)) {
				return;
			}
			alreadyWalked.add(id);
			visit(id);

			let obj = broker.project.objectsMap.get(id);
			if (obj?.parent) {
				walkTreeUp(obj.parent, visit);
			}
		}
		for (let id of sels) {
			let obj = broker.project.objectsMap.get(id);
			if (!obj) {
				continue;
			}
			if (obj.parent) walkTreeUp(obj.parent, (nodeId: string) => {});
		}

		toggleState.update((map) => {
			for (let id of alreadyWalked.keys()) {
				map.set(id, true);
			}
			return map;
		});
	}
</script>

<svelte:window
	on:keydown={(e) => {
		let direction = 0;
		if (e.key == 'ArrowDown') {
			direction = 1;
		} else if (e.key == 'ArrowUp') {
			direction = -1;
		}

		if (direction != 0) {
			let nextIndex = 0;
			for (let i = 0; i < indexArray.length; i++) {
				if (indexArray[i].id == $selection[0]) {
					nextIndex = i + direction;
					break;
				}
			}

			if (nextIndex < indexArray.length) {
				editor.select(indexArray[nextIndex].id);
			}
		}
	}}
/>

<div class="overflow-y-auto max-h-full">
	{#each objectTree as node}
		<EditorLayersNode {node} />
	{/each}
</div>
