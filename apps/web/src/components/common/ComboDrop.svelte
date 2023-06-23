<script lang="ts">
	import { faCaretDown, faChevronDown } from '@fortawesome/free-solid-svg-icons';
	import { createEventDispatcher } from 'svelte';
	import Fa from 'svelte-fa';
	import Popover from 'svelte-smooth-popover/Popover.svelte';
	import { fly } from 'svelte/transition';

	export let options: { name: string; value: any }[] = [];

	export let value: any = '';

	export let readonly = false;

	const dispatch = createEventDispatcher();

	function getOption(value: any) {
		return options.find((o) => o.value === value)?.name || 'Unknown';
	}

	let isOpen = false;

	$: option = getOption(value);

	let buttonEl: HTMLButtonElement;

	function handleSelect(val: any) {
		dispatch('select', val);
		isOpen = false;
		value = val;
	}
</script>

<svelte:window
	on:click={(e) => {
		if (e.target != buttonEl && !buttonEl.contains(e.target))
			setTimeout(() => {
				isOpen = false;
			}, 1);
	}}
/>

<div>
	<button
		bind:this={buttonEl}
		class="rounded-md hover:bg-stone-100 px-1 flex flex-row items-center"
		class:pointer-events-none={readonly}
		class:text-gray-500={readonly}
		on:click={() => (isOpen = !isOpen)}
	>
		<span class="mr-2">{option} </span>
		{#if !readonly}
			<Fa icon={faCaretDown} />
		{/if}
	</button>
	<Popover
		transition={(e) =>
			fly(e, {
				duration: 200,
				x: 0,
				y: -10,
				opacity: 0,
				delay: 0
			})}
		hideOnExternalClick={true}
		open={isOpen}
		caretBg="#f3f4f6"
		offset={0}
		caretCurveAmount={1}
		caretWidth={0}
		align="bottom-right"
	>
		<div
			class="shadow-xl bg-white border-gray-100 border-2 space-y-2 py-2 rounded-lg min-w-[150px]"
		>
			{#each options as option}
				<button
					class="flex flex-row w-full items-center px-4 py-1 hover:bg-gray-100"
					on:click={() => handleSelect(option.value)}
				>
					{option.name}
				</button>
			{/each}
		</div>
	</Popover>
</div>
