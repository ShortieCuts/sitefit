<script lang="ts">
	import DialogSlideUp from 'src/components/common/DialogSlideUp.svelte';
	import ResponsiveGroup from 'src/components/common/ResponsiveGroup.svelte';
	import { getSvelteContext } from 'src/store/editor';
	import type { ProjectMapStyle } from 'core';
	import TransparencySvg from '../common/TransparencySvg.svelte';
	import { get, writable } from 'svelte/store';
	import ColorInput from '../common/ColorInput.svelte';
	import { debouncify } from '$lib/util/debounce';

	const { broker } = getSvelteContext();
	const mapStyle = broker.writableGlobalProperty<ProjectMapStyle>('mapStyle', 'google-satellite');
	const boundaryOpacity = broker.writableGlobalProperty<number>('boundaryOpacity', 1);
	const cadOpacity = broker.writableGlobalProperty<number>('cadOpacity', 1);
	const overrideCadColor = broker.writableGlobalProperty<string>('overrideCadColor', '');

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
	<ResponsiveGroup groups={['Map', 'Transparency', 'Colors']}>
		<div
			slot="group-0"
			class="flex flex-row items-center justify-center space-x-4 py-8 select-none"
		>
			<button
				class="flex flex-col items-center"
				on:click={() => {
					$mapStyle = 'google-satellite';
				}}
			>
				<img
					src="/img/google-sat.png"
					alt="sat"
					class="rounded-xl hover:shadow-md hover:brightness-105 border-4 border-white [&.active]:border-blue-500"
					class:active={$mapStyle == 'google-satellite'}
				/>
				<b class="mt-2">Satellite</b>
			</button>
			<button
				class="flex flex-col items-center"
				on:click={() => {
					$mapStyle = 'google-simple';
				}}
			>
				<img
					src="/img/google-street.png"
					alt="street"
					class="rounded-xl hover:shadow-md hover:brightness-105 border-4 border-white [&.active]:border-blue-500"
					class:active={$mapStyle == 'google-simple'}
				/>
				<b class="mt-2">Simple</b>
			</button>
			<button
				class="flex flex-col items-center"
				on:click={() => {
					$mapStyle = 'google-dark';
				}}
			>
				<img
					src="/img/google-dark.png"
					alt="dark"
					class="rounded-xl hover:shadow-md hover:brightness-105 border-4 border-white [&.active]:border-blue-500"
					class:active={$mapStyle == 'google-dark'}
				/>
				<b class="mt-2">Dark</b>
			</button>
		</div>
		<div slot="group-1">
			<div class="flex flex-col items-center pt-4">
				<div class="flex flex-col w-[337px]">
					<TransparencySvg />
					<div class="grid mt-4 text-gray-500" style="grid-template-columns: 1.5fr 4fr 50px;">
						<span>Boundries</span>
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
					</div>
				</div>
			</div>
		</div>
		<div slot="group-2">
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
	</ResponsiveGroup>
</DialogSlideUp>
