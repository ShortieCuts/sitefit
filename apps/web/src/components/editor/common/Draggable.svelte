<script lang="ts">
	import { getDraggable } from 'src/store/draggable';
	import type { Writable } from 'svelte/store';

	export let draggableKey: string;
	export let payload: any;
	export let allowReorder = true;
	export let canSelect = true;
	export let selected: boolean = false;

	export let commit: (subject: any, to: any, toBias: number) => void;

	let el: HTMLElement;

	$: inst = getDraggable(draggableKey);

	let globalSlot: Writable<any>;
	let globalPayload: Writable<any>;
	let globalBias: Writable<number>;
	let globalDragging: Writable<boolean>;
	let globalSignal: Writable<boolean>;
	$: {
		globalSlot = inst.slot;
		globalPayload = inst.payload;
		globalBias = inst.bias;
		globalDragging = inst.dragging;
		globalSignal = inst.signal;
	}

	function calcBias(e: MouseEvent) {
		let rect = el.firstChild.getBoundingClientRect();
		let mid = rect.top + rect.height / 2;
		let quarter = rect.height / 4;

		if (e.clientY < mid - quarter) {
			return -1;
		} else if (e.clientY < mid + quarter) {
			return 0;
		} else {
			return 1;
		}
	}

	$: draggingInto = $globalDragging && $globalSlot !== null && $globalSlot == payload;
	$: dragging = $globalDragging && $globalPayload !== null && $globalPayload == payload;
	$: canRender = canSelect ? true : $globalSlot === payload && payload !== $globalPayload;

	$: {
		selected = dragging;
	}

	function checkSignal() {
		if (dragging) {
			if ($globalSlot != payload) {
				commit(payload, $globalSlot, $globalBias);
			}

			inst.stopDragging();
			inst.signal.set(false);
			console.log('Resetting signal');
		}
	}

	$: {
		if ($globalSignal) {
			checkSignal();
		}
	}
</script>

<div
	bind:this={el}
	class="draggable-node contents"
	class:dragging={canRender && dragging}
	class:dragging-into={canRender && draggingInto && ($globalBias == 0 || !allowReorder)}
	class:dragging-into-top={canRender && allowReorder && draggingInto && $globalBias == -1}
	class:dragging-into-bottom={canRender && allowReorder && draggingInto && $globalBias == 1}
	on:mousedown={() => {
		inst.startDragging(payload);
	}}
	on:mouseup={(e) => {
		inst.drop(payload, calcBias(e));
	}}
	on:mousemove={(e) => {
		inst.setSlot(payload, calcBias(e));
	}}
	on:mouseleave={() => {
		inst.exitSlot(payload);
	}}
>
	<slot />
</div>

<style lang="scss">
	:global(html .draggable-node > *) {
		@apply border border-transparent;
	}

	:global(html .dragging > *) {
		@apply border border-blue-500 bg-blue-100;
	}

	:global(html .dragging-into > *) {
		@apply border border-blue-500;
	}

	:global(html .dragging-into-top > *) {
		@apply border-t border-t-blue-500;
	}

	:global(html .dragging-into-bottom > *) {
		@apply border-b border-b-blue-500;
	}
</style>
