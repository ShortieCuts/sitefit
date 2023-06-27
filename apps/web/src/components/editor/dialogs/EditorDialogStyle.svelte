<script lang="ts">
	import DialogSlideUp from 'src/components/common/DialogSlideUp.svelte';
	import ResponsiveGroup from 'src/components/common/ResponsiveGroup.svelte';
	import { getSvelteContext } from 'src/store/editor';
	import type { Color, ProjectMapStyle } from 'core';
	import TransparencySvg from '../common/TransparencySvg.svelte';
	import { get, writable } from 'svelte/store';
	import ColorInput from '../common/ColorInput.svelte';
	import { debouncify } from '$lib/util/debounce';
	import { isMobile } from 'src/store/responsive';
	import { MAP_STYLES } from '../maps/mapStyles';

	const { broker } = getSvelteContext();
	const mapStyle = broker.writableGlobalProperty<ProjectMapStyle>('mapStyle', 'google-satellite');
	const boundaryOpacity = broker.writableGlobalProperty<number>('boundaryOpacity', 1);
	const cadOpacity = broker.writableGlobalProperty<number>('cadOpacity', 1);
	const overrideCadColor = broker.writableGlobalProperty<string>('overrideCadColor', '');

	let defaultBoundaryProps = {
		strokeWidth: 10,
		stroke: {
			value: [255 / 255, 235 / 255, 59 / 255, 1] as Color,
			active: true
		},
		fill: {
			value: [255 / 255, 235 / 255, 59 / 255, 0.3] as Color,
			active: true
		}
	};
	const defaultBoundaryStrokeWidth = broker.writableGlobalProperty<number>(
		'defaultBoundaryStrokeWidth',
		defaultBoundaryProps.strokeWidth
	);
	const defaultBoundaryStrokeActive = broker.writableGlobalProperty<boolean>(
		'defaultBoundaryStrokeActive',
		defaultBoundaryProps.stroke.active
	);
	const defaultBoundaryStrokeValue = broker.writableGlobalProperty<Color>(
		'defaultBoundaryStrokeValue',
		defaultBoundaryProps.stroke.value
	);
	const defaultBoundaryFillActive = broker.writableGlobalProperty<boolean>(
		'defaultBoundaryFillActive',
		defaultBoundaryProps.fill.active
	);
	const defaultBoundaryFillValue = broker.writableGlobalProperty<Color>(
		'defaultBoundaryFillValue',
		defaultBoundaryProps.fill.value
	);
	const measurementFontSize = broker.writableGlobalProperty<number>('measurementFontSize', 1);

	function setTo(mode: 'original' | 'black' | 'white' | 'custom') {
		return () => {
			if (mode == 'original') {
				overrideCadColor.set('');
			} else if (mode == 'black') {
				if (get(overrideCadColor) == '#000000') {
					overrideCadColor.set('');
				} else {
					overrideCadColor.set('#000000');
				}
			} else if (mode == 'white') {
				if (get(overrideCadColor) == '#ffffff') {
					overrideCadColor.set('');
				} else {
					overrideCadColor.set('#ffffff');
				}
			} else if (mode == 'custom') {
				let c = get(overrideCadColor);
				if (c != '#000000' && c != '#ffffff' && c != '') {
					overrideCadColor.set('');
				} else {
					overrideCadColor.set('#ff0000');
				}
			}
		};
	}
</script>

<DialogSlideUp>
	<ResponsiveGroup
		hide={$isMobile ? [] : ['group-0']}
		groups={['Map', 'Transparency', 'Colors', 'Selected Parcels', 'Measurement']}
	>
		<div slot="group-0" class="flex flex-row items-center space-x-2 py-8 select-none overflow-auto">
			{#each MAP_STYLES as style}
				<button
					class="flex flex-col items-center first:ml-auto last:mr-auto ml-2 relative"
					on:click={() => {
						$mapStyle = style.key;
					}}
				>
					<img
						src={style.image}
						alt={style.name}
						class="rounded-xl hover:shadow-md hover:brightness-105 border-white [&.active]:border-blue-500"
						class:active={$mapStyle == style.key}
					/>

					<b class="mt-2 text-sm">{style.name}</b>
				</button>
			{/each}
		</div>

		<div slot="group-1">
			<div class="flex flex-col items-center pt-4">
				<div class="flex flex-col w-[337px] max-w-full mb-4">
					<TransparencySvg />
					<div class="grid mt-4 text-gray-500" style="grid-template-columns: 1.5fr 4fr 50px;">
						<span>Parcels</span>
						<input
							class="w-full"
							type="range"
							min={0}
							max={1}
							step={0.01}
							bind:value={$boundaryOpacity}
						/>
						<span class="text-left pl-1">{Math.floor($boundaryOpacity * 100)}%</span>

						<span>CAD</span>
						<input
							class="w-full"
							type="range"
							min={0}
							max={1}
							step={0.01}
							bind:value={$cadOpacity}
						/>
						<span class="text-left pl-1">{Math.floor($cadOpacity * 100)}%</span>

						<span>Base Map</span>
						<input
							class="w-full"
							type="range"
							min={0}
							max={1}
							step={1}
							value={$mapStyle.endsWith('-plain') ? 0 : 1}
							on:change={(e) => {
								if (e.target.value == 1) {
									$mapStyle = $mapStyle.replace('-plain', '-satellite');
								} else {
									if ($mapStyle.startsWith('google')) {
										$mapStyle = 'google-plain';
									} else {
										$mapStyle = 'mapbox-plain';
									}
								}
							}}
						/>
						<span class="text-left pl-1">{($mapStyle.endsWith('-plain') ? 0 : 1) * 100}%</span>
					</div>
				</div>
			</div>
		</div>
		<div slot="group-2" class="mb-4 pt-4">
			<div class="grid justify-center" style="grid-template-columns: auto">
				<span class="justify-self-start text-gray-400 mb-2">Override CAD Colors</span>
				<div class="inline-flex w-fit flex-row items-center justify-center space-x-2">
					<label for="cad-color-original"> Original </label>
					<input
						on:change={setTo('original')}
						class="align-middle"
						id="cad-color-original"
						type="checkbox"
						checked={$overrideCadColor == ''}
					/>

					<label for="cad-color-white" class="border-l border-l-gray-200 pl-2"> White </label>
					<input
						on:change={setTo('white')}
						class="align-middle"
						id="cad-color-white"
						type="checkbox"
						checked={$overrideCadColor == '#ffffff'}
					/>

					<label for="cad-color-black" class="border-l border-l-gray-200 pl-2"> Black </label>
					<input
						on:change={setTo('black')}
						class="align-middle"
						id="cad-color-black"
						type="checkbox"
						checked={$overrideCadColor == '#000000'}
					/>

					<label for="cad-color-custom" class="border-l border-l-gray-200 pl-2"> Custom </label>
					<input
						on:change={setTo('custom')}
						class="align-middle"
						id="cad-color-custom"
						type="checkbox"
						checked={$overrideCadColor != '' &&
							$overrideCadColor != '#000000' &&
							$overrideCadColor != '#ffffff'}
					/>
				</div>
				{#if $overrideCadColor != '' && $overrideCadColor != '#000000' && $overrideCadColor != '#ffffff'}
					<div class="flex flex-col items-end my-2">
						<input
							class="w-8 h-8 rounded-lg overflow-hidden bg-transparent"
							type="color"
							bind:value={$overrideCadColor}
						/>
					</div>
				{/if}
			</div>
		</div>
		<div slot="group-3" class="py-4 space-y-2 mx-6">
			<div class="border-gray-200 border rounded-md mx-2 flex flex-row h-6 flex-shrink-0">
				<span
					class="flex-shrink-0 h-full w-28 min-w-20 overflow-hidden overflow-ellipsis bg-gray-200 capitalize text-sm flex items-center justify-start rounded-l pl-1 pr-2"
				>
					Border Width
				</span>
				<input
					class="w-full px-1"
					type="number"
					bind:value={$defaultBoundaryStrokeWidth}
					min="0"
					max="1000"
				/>
			</div>
			<div class="border-gray-200 border rounded-md mx-2 flex flex-row h-6 flex-shrink-0">
				<span
					class="flex-shrink-0 h-full w-28 min-w-20 overflow-hidden overflow-ellipsis bg-gray-200 capitalize text-sm flex items-center justify-start rounded-l pl-1 pr-2"
				>
					Border
				</span>
				<input
					class="mx-2"
					type="checkbox"
					checked={$defaultBoundaryStrokeActive}
					on:change={() => {
						$defaultBoundaryStrokeActive = !$defaultBoundaryStrokeActive;
					}}
				/>
			</div>
			{#if $defaultBoundaryStrokeActive}
				<div class="border-gray-200 border rounded-md mx-2 flex flex-row h-6 flex-shrink-0">
					<span
						class="flex-shrink-0 h-full w-28 min-w-20 overflow-hidden overflow-ellipsis bg-gray-200 capitalize text-sm flex items-center justify-start rounded-l pl-1 pr-2"
					>
						Border Color
					</span>

					<span class:line-through={!$defaultBoundaryStrokeActive}>
						<ColorInput
							noVerticalBorder
							value={$defaultBoundaryStrokeValue}
							on:change={(e) => {
								$defaultBoundaryStrokeValue = e.detail;
							}}
						/>
					</span>
				</div>
			{/if}
			<div class="border-gray-200 border rounded-md mx-2 flex flex-row h-6 flex-shrink-0">
				<span
					class="flex-shrink-0 h-full w-28 min-w-20 overflow-hidden overflow-ellipsis bg-gray-200 capitalize text-sm flex items-center justify-start rounded-l pl-1 pr-2"
				>
					Fill
				</span>
				<input
					class="mx-2"
					type="checkbox"
					checked={$defaultBoundaryFillActive}
					on:change={() => {
						$defaultBoundaryFillActive = !$defaultBoundaryFillActive;
					}}
				/>
			</div>
			{#if $defaultBoundaryFillActive}
				<div class="border-gray-200 border rounded-md mx-2 flex flex-row h-6 flex-shrink-0">
					<span
						class="flex-shrink-0 h-full w-28 min-w-20 overflow-hidden overflow-ellipsis bg-gray-200 capitalize text-sm flex items-center justify-start rounded-l pl-1 pr-2"
					>
						Fill Color
					</span>
					<span class:line-through={!$defaultBoundaryFillActive}>
						<ColorInput
							noVerticalBorder
							value={$defaultBoundaryFillValue}
							on:change={(e) => {
								$defaultBoundaryFillValue = e.detail;
							}}
						/>
					</span>
				</div>
			{/if}
		</div>
		<div slot="group-4" class="pt-4 space-y-2 mx-6">
			<div class="border-gray-200 border rounded-md mx-2 flex flex-row h-6 flex-shrink-0">
				<span
					class="flex-shrink-0 h-full w-28 min-w-20 overflow-hidden overflow-ellipsis bg-gray-200 capitalize text-sm flex items-center justify-start rounded-l pl-1 pr-2"
				>
					Font Size
				</span>
				<input
					class="w-full px-1"
					type="number"
					value={$measurementFontSize * 10}
					on:change={(e) => {
						$measurementFontSize = e.target.value / 10;
					}}
					min="0"
					max="1000"
				/>
			</div>
		</div>
	</ResponsiveGroup>
</DialogSlideUp>
