<script lang="ts">
	import {
		faLandmark,
		faMapLocationDot,
		faMapMarked,
		faWarning
	} from '@fortawesome/free-solid-svg-icons';
	import { Material, Path } from 'core';
	import ComboDrop from 'src/components/common/ComboDrop.svelte';
	import MobileDrawer from 'src/components/nav/MobileDrawer.svelte';
	import { getSvelteContext } from 'src/store/editor';
	import { loadParcel, type ParcelData } from 'src/store/parcels';
	import { isMobile } from 'src/store/responsive';
	import Fa from 'svelte-fa';
	import { get } from 'svelte/store';

	const { editor, broker } = getSvelteContext();

	const { zoom, selectedParcelLonLat, parcelProvider } = editor;

	let selectedParcel: ParcelData | null = null;
	function stageObject(d: ParcelData) {
		let p = new Path();
		p.name = 'Parcel ' + d.address_street;
		p.pinned = true;
		p.smartObject = 'path';
		p.smartProperties = {
			strokeWidth: 10,
			stroke: {
				value: [255 / 255, 235 / 255, 59 / 255, 1],
				active: true
			},
			fill: {
				value: [255 / 255, 235 / 255, 59 / 255, 0.3],
				active: true
			}
		};
		p.style = new Material();

		let mainPoly = d.geometry;
		let overlay = get(editor.overlay);
		let corner = broker.watchCornerstone();
		let heading = -(get(corner.heading) * Math.PI) / 180;
		let rotMatrix = [Math.cos(heading), Math.sin(heading), -Math.sin(heading), Math.cos(heading)];
		if (mainPoly && overlay) {
			let rootCoords: number[][] = [];
			if (mainPoly.type == 'Polygon') {
				rootCoords = mainPoly.coordinates[0];
			} else if (mainPoly.type == 'MultiPolygon') {
				rootCoords = mainPoly.coordinates[0][0];
			}
			for (let coord of rootCoords) {
				let vec3 = overlay.lonLatToVector3(coord[0], coord[1]);
				let pos = [vec3.x, vec3.z];

				p.segments.push([
					pos[0] * rotMatrix[0] + pos[1] * rotMatrix[2],
					pos[0] * rotMatrix[1] + pos[1] * rotMatrix[3]
				]);
			}
		}

		broker.stagingObject.set(p);
		broker.needsRender.set(true);
	}
	let loadedParcelFor = [0, 0];
	$: {
		if ($selectedParcelLonLat[0] !== 0 || $selectedParcelLonLat[1] !== 0) {
			(async () => {
				if (
					loadedParcelFor[0] != $selectedParcelLonLat[0] ||
					loadedParcelFor[1] != $selectedParcelLonLat[1]
				) {
					loadedParcelFor = [...$selectedParcelLonLat];
					selectedParcel = await loadParcel(
						$selectedParcelLonLat[0],
						$selectedParcelLonLat[1],
						get(editor.parcelProvider)
					);

					if (selectedParcel) stageObject(selectedParcel);
				}
			})();
		} else {
			selectedParcel = null;
		}
	}
</script>

{#if $isMobile}
	<MobileDrawer>
		{#if $zoom < 17}
			<div
				class="text-lg flex flex-row items-center justify-center text-gray-500 rounded-md bg-yellow-300 px-4 py-2"
			>
				<Fa icon={faWarning} />
				<span class="ml-2"> Zoom in to view parcels </span>
			</div>
		{:else if $selectedParcelLonLat[0] == 0 && $selectedParcelLonLat[1] == 0}
			<div
				class="text-lg flex flex-row items-center justify-center text-gray-500 rounded-md bg-blue-300 px-4 py-2"
			>
				<Fa icon={faMapLocationDot} />
				<span class="ml-2"> Tap to select a parcel </span>
			</div>
		{:else if selectedParcel}
			<div
				class="text-lg flex flex-row items-center justify-center text-gray-500 rounded-md bg-gray-100 px-4 py-2"
			>
				<Fa icon={faMapMarked} />
				<span class="ml-2"> Parcel: {selectedParcel.id ?? 'Unknown'} </span>
			</div>
			<div>
				<button
					class="text-blue-500"
					on:click={() => {
						let newId = broker.commitStagedObject();
						if (newId) editor.select(newId);
						$selectedParcelLonLat[0] = 0;
						$selectedParcelLonLat[1] = 0;
						editor.activateDialog('');
					}}>Save Parcel</button
				>
				<button
					class="text-red-500"
					on:click={() => {
						broker.stagingObject.set(null);
						broker.needsRender.set(true);
						$selectedParcelLonLat[0] = 0;
						$selectedParcelLonLat[1] = 0;
					}}>Cancel</button
				>
			</div>
		{/if}
	</MobileDrawer>
{:else}
	<div class="flex flex-col p-4">
		<ComboDrop
			bind:value={$parcelProvider}
			options={[
				{ name: 'Report All', value: 'reportall' },
				{ name: 'Regrid', value: 'regrid' }
			]}
		/>
	</div>
	{#if $zoom < 17}
		<div class="flex flex-col p-4">
			<div
				class="text-lg flex flex-row items-center justify-center text-gray-500 rounded-md bg-yellow-300 px-4 py-2"
			>
				<Fa icon={faWarning} />
				<span class="ml-2"> Zoom in to view parcels </span>
			</div>
		</div>
	{:else if $selectedParcelLonLat[0] == 0 && $selectedParcelLonLat[1] == 0}
		<div class="flex flex-col p-4">
			<div
				class="text-lg flex flex-row items-center justify-center text-gray-500 rounded-md bg-blue-300 px-4 py-2"
			>
				<Fa icon={faMapLocationDot} />
				<span class="ml-2"> Click to select a parcel </span>
			</div>
		</div>
	{:else if selectedParcel}
		<div class="flex flex-col p-4">
			<div
				class="text-lg flex flex-row items-center justify-center text-gray-500 rounded-md bg-gray-100 px-4 py-2"
			>
				<Fa icon={faMapMarked} />
				<span class="ml-2"> Parcel: {selectedParcel.id} </span>
			</div>
			<div class="flex flex-row justify-end">
				<button
					class="btn mt-2 mr-2"
					on:click={() => {
						broker.stagingObject.set(null);
						broker.needsRender.set(true);
						$selectedParcelLonLat[0] = 0;
						$selectedParcelLonLat[1] = 0;
					}}>Cancel</button
				>
				<button
					class="btn mt-2 btn-primary"
					on:click={() => {
						let newId = broker.commitStagedObject();
						if (newId) editor.select(newId);
						$selectedParcelLonLat[0] = 0;
						$selectedParcelLonLat[1] = 0;
						editor.activateDialog('');
					}}>Save Parcel</button
				>
			</div>
		</div>
	{/if}
{/if}
