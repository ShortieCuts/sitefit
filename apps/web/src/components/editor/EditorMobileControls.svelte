<script lang="ts">
	import { faArrows, faRemove, faTrash } from '@fortawesome/free-solid-svg-icons';
	import { getSvelteContext } from 'src/store/editor';
	import Fa from 'svelte-fa';
	import MobileDrawer from '../nav/MobileDrawer.svelte';

	const { editor, broker } = getSvelteContext();
	const { effectiveSelection, latitude, longitude } = editor;

	$: hasSelection = $effectiveSelection.length > 0;

	let selectedObjectMode: 'transform' | '' = '';

	let selectedSize = { width: 0, height: 0 };
	let lastLongitude = $longitude;
	let lastLatitude = $latitude;
	let realLongitude = $longitude;
	let realLatitude = $latitude;

	$: {
		$effectiveSelection;
		selectedObjectMode = '';

		if ($effectiveSelection.length > 0) {
			let bounds = broker.project.computeBounds($effectiveSelection[0]);
			selectedSize.width = bounds.maxX - bounds.minX;
			selectedSize.height = bounds.maxY - bounds.minY;
		} else {
			selectedSize.width = 0;
			selectedSize.height = 0;
		}
	}

	function doTransform() {
		let relativeCoordsTo = editor.lonLatToPosition(realLongitude, realLatitude);
		let relativeCoordsFrom = editor.lonLatToPosition(lastLongitude, lastLatitude);

		let deltaX = relativeCoordsTo[0] - relativeCoordsFrom[0];
		let deltaY = relativeCoordsTo[1] - relativeCoordsFrom[1];

		let selection = $effectiveSelection;
	}

	$: {
		lastLatitude = realLatitude;
		lastLongitude = realLongitude;
		realLatitude = $latitude;
		realLongitude = $longitude;

		if (selectedObjectMode === 'transform') {
			doTransform();
		}
	}
</script>

{#if hasSelection}
	{#if selectedObjectMode === ''}
		<MobileDrawer>
			<div>
				<button
					on:click={() => {
						selectedObjectMode = 'transform';
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
						editor.selection.set([]);
						editor.computeEffectiveSelection(broker);
					}}
					class="text-blue-600"
					style="justify-content: center;">Deselect</button
				>
			</div>
		</MobileDrawer>
	{/if}
{/if}
