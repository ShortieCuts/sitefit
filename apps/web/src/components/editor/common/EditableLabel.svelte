<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let value = '';
	let workingValue = '';
	$: {
		workingValue = value;
	}
	export let editing = false;

	export let readonly = false;

	export let doubleclick = false;

	export let noWrap = true;

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
	on:click={(e) => {
		if (e.target && e.target.matches('button') && e.target.contains(inputEl)) {
			return;
		}
		e.target != inputEl && e.target != inputEl?.parentElement ? commit() : null;
	}}
/>

<div
	class="click-editable {clazz}"
	on:dblclick={() => {
		if (doubleclick) editing = true;
	}}
>
	{#if editing}
		<input
			{readonly}
			on:keyup|stopPropagation={() => {}}
			on:keydown={(e) => {
				e.stopPropagation();
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
			class="border-0 bg-transparent color-white {noWrap ? 'editable-label-nowrap' : ''} {fullWidth
				? 'block min-w-full w-full text-left'
				: 'w-auto'}">{value}</span
		>
	{/if}
</div>

<style>
	.editable-label-nowrap {
		white-space: nowrap;
		max-width: 166px;
		text-overflow: ellipsis;
		overflow: hidden;
	}
</style>
