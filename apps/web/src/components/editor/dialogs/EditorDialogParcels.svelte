<script lang="ts">
	import {
		faLandmark,
		faMapLocationDot,
		faMapMarked,
		faPaintBrush,
		faWarning
	} from '@fortawesome/free-solid-svg-icons';
	import { Material, ObjectType, Path } from 'core';
	import ComboDrop from 'src/components/common/ComboDrop.svelte';
	import MobileDrawer from 'src/components/nav/MobileDrawer.svelte';
	import { getSvelteContext } from 'src/store/editor';
	import { loadParcel, type ParcelData } from 'src/store/parcels';
	import { isMobile } from 'src/store/responsive';
	import Fa from 'svelte-fa';
	import { get } from 'svelte/store';
	import EditorProperties from '../EditorProperties.svelte';
	import EditorParcelStyle from './EditorParcelStyle.svelte';
	import DialogSlideUp from 'src/components/common/DialogSlideUp.svelte';

	const { editor, broker } = getSvelteContext();

	const { zoom, selectedParcelLonLat, parcelProvider, selection } = editor;

	const USE_EXACT_PARCEL_DATA = false;

	let showParcelStyleMobile = false;

	let selectedParcel: ParcelData | null = null;
	let selectedParcelExisting: Path | null = null;
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
		selectedParcelExisting = null;

		if ($selectedParcelLonLat[0] !== 0 || $selectedParcelLonLat[1] !== 0) {
			(async () => {
				if (
					loadedParcelFor[0] != $selectedParcelLonLat[0] ||
					loadedParcelFor[1] != $selectedParcelLonLat[1]
				) {
					loadedParcelFor = [...$selectedParcelLonLat];
					if (USE_EXACT_PARCEL_DATA) {
						selectedParcel = await loadParcel(
							$selectedParcelLonLat[0],
							$selectedParcelLonLat[1],
							get(editor.parcelProvider)
						);
					} else {
						let parcelOverlay = get(editor.parcelOverlay);
						if (parcelOverlay) {
							let results = parcelOverlay.getParcelPolyAt($selectedParcelLonLat);

							selectedParcel = results;
							console.log(selectedParcel);
						}
					}

					if (selectedParcel) {
						stageObject(selectedParcel);
						broker.commitStagedObject();
					} else {
						broker.stagingObject.set(null);
						selectedParcel = null;
					}
				} else {
				}
			})();
		} else {
			broker.stagingObject.set(null);
			selectedParcel = null;

			let selectedObjects = get(editor.effectiveSelection);
			if (selectedObjects.length == 1) {
				let selectedObject = broker.project.objectsMap.get(selectedObjects[0]);
				if (selectedObject && selectedObject.pinned && selectedObject.type == ObjectType.Path) {
					editor.deleteSelection(broker);
				}
			}
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
		{:else}
			<div
				class="text-lg flex flex-row items-center justify-center text-gray-500 rounded-md bg-blue-300 px-4 py-2 relative"
			>
				<Fa icon={faMapLocationDot} />
				<span class="ml-2">
					Tap to select/deselect parcels
					<button
						class="w-8 h-8 rounded-md bg-gray-100 flex justify-center items-center right-4 absolute top-4 bottom-4 aspect-square"
						on:click={() => {
							showParcelStyleMobile = true;
						}}
					>
						<Fa icon={faPaintBrush} />
					</button>
				</span>
			</div>
		{/if}
	</MobileDrawer>
	{#if showParcelStyleMobile}
		<DialogSlideUp
			dispatchClose={true}
			on:close={() => {
				showParcelStyleMobile = false;
			}}
		>
			<EditorParcelStyle />
		</DialogSlideUp>
	{/if}
{:else}
	<div class="flex flex-col p-4 hidden">
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
	{:else}
		<div class="flex flex-col p-4">
			<div
				class="text-lg flex flex-row items-center justify-center text-gray-500 rounded-md bg-blue-300 px-4 py-2"
			>
				<Fa icon={faMapLocationDot} />
				<span class="ml-2"> Click to select/deselect parcels </span>
			</div>

			{#if selectedParcel}
				<div class="flex flex-col rounded-lg bg-gray-50 mt-4">
					<div class="flex flex-row p-4">
						<div class="mr-4">Admin</div>
						<div>{selectedParcel.county}</div>
					</div>
					<div class="flex flex-row p-4">
						<div class="mr-4">Address</div>
						<div>{selectedParcel.address_street}</div>
					</div>

					<div class="flex flex-row p-4">
						<div class="mr-4">Owner</div>
						<div>{selectedParcel.owner}</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
	<div class="mx-2">
		<EditorParcelStyle />
	</div>
{/if}
