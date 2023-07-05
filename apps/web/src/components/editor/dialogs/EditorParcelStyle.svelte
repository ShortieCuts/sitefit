<script lang="ts">
	import { getSvelteContext } from 'src/store/editor';
	import type { Color, ProjectMapStyle } from 'core';
	import ColorInput from '../common/ColorInput.svelte';

	const { broker } = getSvelteContext();

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
</script>

<div class="flex flex-col space-y-2">
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
