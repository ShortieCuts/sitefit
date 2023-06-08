<script lang="ts">
	import {
		faArrows,
		faArrowsLeftRight,
		faArrowsUpDown,
		faCheck,
		faComment,
		faMapPin,
		faRemove,
		faRotateLeft,
		faRotateRight,
		faTrash,
		faTurnUp
	} from '@fortawesome/free-solid-svg-icons';
	import { getSvelteContext } from 'src/store/editor';
	import Fa from 'svelte-fa';
	import MobileDrawer from '../nav/MobileDrawer.svelte';
	import { get } from 'svelte/store';
	import { type ObjectID, type Object2D, makeObject } from 'core';
	import Flatten from '@flatten-js/core';
	import MobileCrosshair from './common/MobileCrosshair.svelte';
	import { onMount } from 'svelte';

	const { editor, broker } = getSvelteContext();
	const { effectiveSelection, latitude, longitude } = editor;
	const { sessionAccess } = broker;

	$: hasSelection = $effectiveSelection.length > 0;

	const { mobileToolMode, activeTool, measureToolCount } = editor;

	let selectedSize = { width: 0, height: 0 };
	let lastLongitude = $longitude;
	let lastLatitude = $latitude;
	let realLongitude = $longitude;
	let realLatitude = $latitude;

	let currentComment = '';

	$: canWrite = $sessionAccess == 'WRITE';
	$: {
		$effectiveSelection;
		$mobileToolMode = '';

		if ($effectiveSelection.length > 0) {
			let bounds = broker.project.computeBounds($effectiveSelection[0]);
			selectedSize.width = bounds.maxX - bounds.minX;
			selectedSize.height = bounds.maxY - bounds.minY;
		} else {
			selectedSize.width = 0;
			selectedSize.height = 0;
		}
	}

	let transformStartObjects = new Map<ObjectID, Object2D>();

	function startTransform() {
		transformStartObjects.clear();
		let sels = get(editor.effectiveSelection);

		for (let id of sels) {
			let obj = broker.project.objectsMap.get(id);
			let data = obj?.serialize();
			let copyObj = makeObject(data);
			copyObj.deserialize(data);
			transformStartObjects.set(id, copyObj);
		}
	}

	function doTransform() {
		let relativeCoordsTo = editor.lonLatToPosition(realLongitude, realLatitude);
		let relativeCoordsFrom = editor.lonLatToPosition(lastLongitude, lastLatitude);

		let deltaX = relativeCoordsTo[0] - relativeCoordsFrom[0];
		let deltaY = relativeCoordsTo[1] - relativeCoordsFrom[1];
		let map = get(editor.map);
		let { heading } = broker.watchCornerstone();
		if (!map) return;
		let angle = (get(heading) ?? 0) * (Math.PI / 180);

		let rightVector = [Math.cos(angle + Math.PI / 2), Math.sin(angle + Math.PI / 2)];
		let upVector = [Math.cos(angle), Math.sin(angle)];

		let real = [
			rightVector[0] * deltaX + upVector[0] * deltaY,
			rightVector[1] * deltaX + upVector[1] * deltaY
		];

		let selection = $effectiveSelection;

		let point = Flatten.point(deltaX, deltaY);
		let rotation = Flatten.matrix(1, 0, 0, 1, 0, 0).rotate(angle);
		let transformed = point.transform(rotation);

		for (let id of selection) {
			let obj = broker.project.objectsMap.get(id);
			if (obj) {
				obj.transform.position[0] += real[1];
				obj.transform.position[1] += real[0];
				obj.computeShape();
				broker.markObjectDirty(id);
			}
		}

		broker.needsRender.set(true);
	}

	function applyTransform() {
		let transaction = broker.project.createTransaction();
		let sels = get(editor.effectiveSelection);
		for (let id of sels) {
			let obj = broker.project.objectsMap.get(id);
			let objOrig = transformStartObjects.get(id);
			if (obj && objOrig) {
				transaction.update(id, 'transform', structuredClone(obj.transform));
				obj.transform = objOrig.transform;
			}
		}
		broker.commitTransaction(transaction);
	}

	$: {
		lastLatitude = realLatitude;
		lastLongitude = realLongitude;
		realLatitude = $latitude;
		realLongitude = $longitude;

		if ($mobileToolMode === 'transform') {
			doTransform();
		}
	}

	onMount(() => {
		$activeTool = 'select';
	});
</script>

{#if canWrite}
	{#if $activeTool == 'comment'}
		<MobileCrosshair />
		<MobileDrawer>
			<div>
				<input type="text" class="w-full h-16 pl-4" autofocus bind:value={currentComment} />

				<button
					class="text-blue-500"
					on:click={() => {
						broker.createComment(get(editor.longitude), get(editor.latitude), currentComment);
						currentComment = '';
						editor.activeTool.set('');
					}}><Fa icon={faCheck} /> Insert Comment</button
				>
			</div>
			<div>
				<button
					on:click={() => {
						editor.activeTool.set('');
						currentComment = '';
					}}
					class="text-red-600"
					style="justify-content: center;">Cancel</button
				>
			</div>
		</MobileDrawer>
	{/if}
	{#if $activeTool == 'measurement'}
		<MobileCrosshair />
		<MobileDrawer>
			<div>
				{#if $measureToolCount == 0}
					<button
						class="text-blue-500"
						on:click={() => {
							editor.clickDownTool();
						}}><Fa icon={faMapPin} /> Start Measurement</button
					>
				{:else}
					<button
						class="text-blue-500"
						on:click={() => {
							editor.clickDownTool();
						}}><Fa icon={faMapPin} /> Continue Measurement</button
					>
					<button
						class="text-green-500"
						on:click={() => {
							editor.clickDownTool();
							editor.commitTool();
							editor.deselectAll();
						}}><Fa icon={faCheck} /> End Measurement</button
					>
				{/if}
			</div>
			<div>
				<button
					on:click={() => {
						editor.cancelTool();
						editor.activeTool.set('select');
						currentComment = '';
					}}
					class="text-red-600"
					style="justify-content: center;">Cancel</button
				>
			</div>
		</MobileDrawer>
	{/if}
	{#if $activeTool == 'area'}
		<MobileCrosshair />
		<MobileDrawer>
			<div>
				{#if $measureToolCount == 0}
					<button
						class="text-blue-500"
						on:click={() => {
							editor.clickDownTool();
						}}><Fa icon={faMapPin} /> Start Measurement</button
					>
				{:else}
					<button
						class="text-blue-500"
						on:click={() => {
							editor.clickDownTool();
						}}><Fa icon={faMapPin} /> Continue Measurement</button
					>
					<button
						class="text-green-500"
						on:click={() => {
							editor.clickDownTool();
							editor.commitTool();
							editor.deselectAll();
						}}><Fa icon={faCheck} /> End Measurement</button
					>
				{/if}
			</div>
			<div>
				<button
					on:click={() => {
						editor.cancelTool();
						editor.activeTool.set('select');
						currentComment = '';
					}}
					class="text-red-600"
					style="justify-content: center;">Cancel</button
				>
			</div>
		</MobileDrawer>
	{/if}
	{#if hasSelection}
		{#if $mobileToolMode === ''}
			<MobileDrawer>
				<div>
					<button
						on:click={() => {
							editor.flyToSelection();
							setTimeout(() => {
								startTransform();
								$mobileToolMode = 'transform';
							}, 10);
						}}><Fa icon={faArrows} /> Edit CAD</button
					>
					<button
						class="text-red-500"
						on:click={() => {
							editor.deleteSelection(broker);
						}}><Fa icon={faTrash} /> Delete</button
					>
				</div>
				<div>
					<button
						on:click={() => {
							editor.deselectAll();
						}}
						class="text-blue-600"
						style="justify-content: center;">Deselect</button
					>
				</div>
			</MobileDrawer>
		{:else if $mobileToolMode == 'transform'}
			<div class="fixed bottom-0 left-0 right-0 flex flex-row z-40 p-4 space-x-2 items-end">
				<div class="flex-[2] flex flex-col space-y-2">
					<button
						class="btn"
						on:click={() => {
							applyTransform();
							editor.flipSelection(false, true);
							startTransform();
						}}><Fa icon={faArrowsUpDown} /> Flip Up/Down</button
					>
					<button
						class="btn"
						on:click={() => {
							applyTransform();
							editor.flipSelection(true, false);
							startTransform();
						}}><Fa icon={faArrowsLeftRight} /> Flip Left/Right</button
					>
					<div class="flex flex-row space-x-2">
						<button
							class="btn flex-1"
							on:click={() => {
								applyTransform();
								editor.rotateSelection(-Math.PI / 4);
								startTransform();
							}}><Fa icon={faRotateLeft} /> -45°</button
						>
						<button
							class="btn flex-1"
							on:click={() => {
								applyTransform();
								editor.rotateSelection(Math.PI / 4);
								startTransform();
							}}><Fa icon={faRotateRight} /> +45°</button
						>
					</div>
				</div>
				<div class="flex-[1] flex flex-col">
					<button
						class="btn btn-primary"
						on:click={() => {
							applyTransform();
							$mobileToolMode = '';
							editor.deselectAll();
						}}><Fa icon={faCheck} /> Done</button
					>
				</div>
			</div>
		{/if}
	{/if}
{/if}
