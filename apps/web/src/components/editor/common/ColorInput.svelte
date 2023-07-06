<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ColorPicker from 'svelte-awesome-color-picker';
	import Popover from 'svelte-smooth-popover/Popover.svelte';

	const dispatch = createEventDispatcher();

	export let noVerticalBorder = false;
	export let small = false;

	export let value: [number, number, number, number] | undefined = [0, 0, 0, 1];

	$: {
		if (typeof value !== 'undefined' && !Array.isArray(value)) {
			value = [0, 0, 0, 1];
		}
	}

	function valueToRGB(value: [number, number, number, number] | undefined) {
		if (!value) {
			return {
				r: 0,
				g: 0,
				b: 0,
				a: 1
			};
		}
		return {
			r: value[0] * 255,
			g: value[1] * 255,
			b: value[2] * 255,
			a: value[3]
		};
	}

	function valueToHEX(value: [number, number, number, number] | undefined) {
		if (!value) {
			return '#000000';
		}
		return (
			'#' +
			[0, 1, 2]
				.map((i) =>
					Math.round(value[i] * 255)
						.toString(16)
						.padStart(2, '0')
				)
				.join('')
		);
	}
</script>

<div
	class=" flex flex-row border border-gray-200 rounded-md hover:shadow-sm h-6"
	class:border-y-0={noVerticalBorder}
	class:rounded-none={noVerticalBorder}
>
	{#if value}
		<div
			class="w-4 h-4 mx-1 my-auto rounded shadow-md"
			style="background-color: rgba({value[0] * 255}, {value[1] * 255}, {value[2] *
				255}, {value[3]})"
		/>
		<Popover
			showOnClick={true}
			hideOnExternalClick
			caretBg="#f3f4f6"
			offset={10}
			caretCurveAmount={1}
			caretWidth={20}
			align="left-middle"
		>
			<div
				class="shadow-xl bg-white border-gray-100 border-2 space-y-2 rounded-lg min-w-[150px] overflow-hidden"
			>
				<ColorPicker
					rgb={valueToRGB(value)}
					on:input={({ detail }) => {
						const rgb = detail.rgb;
						let newValue = [rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a];
						if (
							value &&
							newValue[0] === value[0] &&
							newValue[1] === value[1] &&
							newValue[2] === value[2] &&
							newValue[3] === value[3]
						) {
							return;
						}
						dispatch('input', newValue);
						dispatch('change', newValue);
					}}
					isInput={false}
					isOpen
					isPopup={false}
				/>
			</div>
		</Popover>
		{#if !small}
			{valueToHEX(value)}
			<div class="border-l border-gray-200 mx-2" />
			{Math.floor(value[3]) != value[3] ? value[3].toFixed(1) : value[3]}
			<div class="pr-2" />
		{/if}
	{:else}
		<div
			class="w-4 h-4 m-1 rounded-md border border-gray-200"
			style="background-color: rgba(0, 0, 0, 0);"
		/>
		<Popover
			showOnClick={true}
			hideOnExternalClick
			caretBg="#f3f4f6"
			offset={10}
			caretCurveAmount={1}
			caretWidth={20}
			align="left-middle"
		>
			<div
				class="shadow-xl bg-white border-gray-100 border-2 space-y-2 rounded-lg min-w-[150px] overflow-hidden"
			>
				<ColorPicker
					on:input={({ detail }) => {
						const rgb = detail.rgb;
						let newValue = [rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a];
						dispatch('input', newValue);
						dispatch('change', newValue);
					}}
					isInput={false}
					isOpen
					isPopup={false}
				/>
			</div>
		</Popover>
	{/if}
</div>
