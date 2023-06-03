import { get, type Writable } from 'svelte/store';

export function draggable(
	node: HTMLElement,
	options: {
		store: Writable<[number, number]>;
	}
) {
	let x: number;
	let y: number;
	let startX: number;
	let startY: number;
	let dragging = false;

	function handleMousedown(event: MouseEvent) {
		x = event.clientX;
		y = event.clientY;
		startX = x;
		startY = y;
		dragging = true;
	}

	function handleMousemove(event: MouseEvent) {
		if (dragging) {
			let dx = event.clientX - x;
			let dy = event.clientY - y;
			x = event.clientX;
			y = event.clientY;
			if (get(options.store)[0] != x + dx || get(options.store)[1] != y + dy)
				options.store.update(([x, y]) => [x + dx, y + dy]);
		}
	}

	function handleMouseup(event: MouseEvent) {
		if (dragging) {
			let dx = event.clientX - x;
			let dy = event.clientY - y;
			x = event.clientX;
			y = event.clientY;
			if (get(options.store)[0] != x + dx || get(options.store)[1] != y + dy)
				options.store.update(([x, y]) => [x + dx, y + dy]);
			dragging = false;
		}
	}

	node.addEventListener('mousedown', handleMousedown);
	window.addEventListener('mousemove', handleMousemove);
	window.addEventListener('mouseup', handleMouseup);

	return {
		destroy() {
			node.removeEventListener('mousedown', handleMousedown);
			window.removeEventListener('mousemove', handleMousemove);
			window.removeEventListener('mouseup', handleMouseup);
		}
	};
}

export function draggableWatch(
	node: HTMLElement,
	options: {
		onStart: (x: number, y: number) => void;
		onEnd: (x: number, y: number) => void;
		onMove: (x: number, y: number) => void;
	}
) {
	let x: number;
	let y: number;
	let startX: number;
	let startY: number;
	let dragging = false;

	function handleMousedown(event: MouseEvent) {
		x = event.clientX;
		y = event.clientY;
		startX = x;
		startY = y;
		dragging = true;
		options.onStart(x, y);
	}

	function handleMousemove(event: MouseEvent) {
		if (dragging) {
			let dx = event.clientX - x;
			let dy = event.clientY - y;
			x = event.clientX;
			y = event.clientY;
			options.onMove(dx, dy);
		}
	}

	function handleMouseup(event: MouseEvent) {
		if (dragging) {
			let dx = event.clientX - x;
			let dy = event.clientY - y;
			x = event.clientX;
			y = event.clientY;
			dragging = false;
			options.onEnd(dx, dy);
		}
	}

	node.addEventListener('mousedown', handleMousedown);
	window.addEventListener('mousemove', handleMousemove);
	window.addEventListener('mouseup', handleMouseup);

	return {
		destroy() {
			node.removeEventListener('mousedown', handleMousedown);
			window.removeEventListener('mousemove', handleMousemove);
			window.removeEventListener('mouseup', handleMouseup);
		}
	};
}
