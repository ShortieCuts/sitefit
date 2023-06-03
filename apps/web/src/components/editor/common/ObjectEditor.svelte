<script lang="ts">
	import Flatten from '@flatten-js/core';
	import { ObjectType, type Object2D, Path } from 'core';
	import { getSvelteContext } from 'src/store/editor';
	import { draggable, draggableWatch } from '$lib/util/draggable';
	import { get, writable, type Writable } from 'svelte/store';

	const { editor, broker } = getSvelteContext();

	const { editingObject } = editor;
	const { objectTreeWatcher, transactionWatcher } = broker;
	let realEditingObject: null | Object2D = null;
	let rerender = 0;
	$: {
		$objectTreeWatcher;

		if ($objectTreeWatcher && $editingObject) {
			realEditingObject = broker.project.objectsMap.get($editingObject) ?? null;
		} else {
			realEditingObject = null;
		}
	}

	let isEditingPath: boolean = false;
	let realPath: Path | null = null;
	let realPathShape: [number, number][] | null = null;

	function refreshPoints() {
		if (realPath) {
			realPathShape = [];
			let matrix = realPath.getMatrix();
			for (let [i, point] of realPath.segments.entries()) {
				let transformed = matrix.transform(point);
				realPathShape?.push([transformed[0], transformed[1]]);
			}
		}
	}

	let unsub = () => {};
	let markingDirty = false;
	$: {
		isEditingPath = realEditingObject?.type == ObjectType.Path ?? false;
		realPath = isEditingPath ? (realEditingObject as Path) : null;

		if (realPath && realPath.flatShape) {
			let debounceFirst = true;
			unsub = broker.writableObjectProperty(realPath.id, 'segments', []).subscribe((v) => {
				refreshPoints();
				if (realPathShape)
					for (let [i, point] of realPathShape.entries()) {
						let el = document.querySelector(`[data-point-index="${i}"]`);
						if (el && el instanceof HTMLElement) {
							el.dataset.relativeX = `${point[0]}`;
							el.dataset.relativeY = `${point[1]}`;
						}
					}
			});
		} else {
			realPathShape = null;
			unsub();
		}
	}

	let cacheSegments: any = null;
</script>

{#if realPathShape}
	{#each realPathShape as point, i}
		<div
			class="path-editor-point rounded-full border border-blue-700 bg-white p-1 pointer-events-auto"
			style="transform: translate(-50%, -50%);"
			data-relative-x={point[0]}
			data-relative-y={point[1]}
			data-point-index={i}
			use:draggableWatch={{
				onStart() {
					let el = document.querySelector(`[data-point-index="${i}"]`);
					if (el && el instanceof HTMLElement) {
						el.style.display = 'none';
					}

					cacheSegments = realPath?.segments.map((x) => [...x]) ?? null;
				},
				onEnd() {
					let el = document.querySelector(`[data-point-index="${i}"]`);
					if (el && el instanceof HTMLElement) {
						el.style.display = 'block';
					}

					if (realPath) {
						let transaction = broker.project.createTransaction();
						let cloned = structuredClone(realPath.segments);
						realPath.segments = cacheSegments;
						transaction.update(realPath.id, 'segments', cloned);
						broker.commitTransaction(transaction);

						cacheSegments = null;
					}
				},
				onMove() {
					let index = i;
					if (realPath) {
						let mat = realPath.getMatrix();
						let div = 1 / (mat.a * mat.d - mat.b * mat.c);

						let inverse = new Flatten.Matrix(
							div * mat.d,
							div * -mat.b,
							div * -mat.c,
							div * mat.a,
							0,

							0
						);
						let value = editor.getDesiredPosition();

						value = [value[0] - mat.tx, value[1] - mat.ty];
						value = inverse.transform([value[0], value[1]]);

						realPath.segments[index][0] = value[0];
						realPath.segments[index][1] = value[1];

						realPath.computeShape();
						broker.needsRender.set(true);
						markingDirty = true;
						broker.markObjectDirty(realPath.id);
						markingDirty = false;
					}
				}
			}}
		/>
	{/each}
{/if}
