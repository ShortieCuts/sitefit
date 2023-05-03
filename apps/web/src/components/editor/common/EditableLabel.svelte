<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let value = '';
	let workingValue = '';
	$: {
		workingValue = value;
	}
	export let editing = false;

	let dispatch = createEventDispatcher();

	function commit() {
		if (!editing) return;
		editing = false;
		if (workingValue == value) return;
		value = workingValue;

		dispatch('change', value);
	}

	let inputEl: HTMLInputElement | null = null;

	let clazz = '';
	export { clazz as class };

	export let fullWidth = false;

	$: {
		if (editing) {
			if (typeof window !== 'undefined') {
				setTimeout(() => {
					if (inputEl) {
						inputEl.focus();
						inputEl.select();
					}
				});
			}
		}
	}
</script>

<svelte:window
	on:click={(e) => (e.target != inputEl && e.target != inputEl?.parentElement ? commit() : null)}
/>

<div
	class="click-editable {clazz}"
	on:dblclick={() => {
		editing = true;
	}}
>
	{#if editing}
		<input
			on:keydown={(e) => {
				if (e.code == 'Enter' || e.code == 'Tab') {
					commit();
				} else if (e.code == 'Escape') {
					editing = false;
					workingValue = value;
				}
			}}
			class="border-0 bg-transparent color-white h-full p-0 w-full"
			style={!fullWidth ? `width: ${workingValue.length}ch` : ''}
			type="text"
			bind:this={inputEl}
			bind:value={workingValue}
		/>
	{:else}
		<span
			class="border-0 bg-transparent color-white {fullWidth
				? 'block min-w-full w-full text-left'
				: 'w-auto'}">{value}</span
		>
	{/if}
</div>
