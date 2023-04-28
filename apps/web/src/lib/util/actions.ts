import type { Writable } from 'svelte/store';
import { tick } from 'svelte';

export function reactiveSize(
	node: HTMLElement,
	params: {
		width?: Writable<number>;
		height?: Writable<number>;
	}
) {
	function update() {
		if (params.width) params.width.set(node.clientWidth);
		if (params.height) params.height.set(node.clientHeight);
	}
	window.addEventListener('resize', () => {
		update();
	});

	update();

	return {
		destroy() {
			window.removeEventListener('resize', update);
		}
	};
}

const portal_map = new Map();
export function createPortal(node: HTMLElement, id = 'default') {
	const key = `$$portal.${id}`;
	if (portal_map.has(key)) throw `duplicate portal key "${id}"`;
	else portal_map.set(key, node);
	return { destroy: portal_map.delete.bind(portal_map, key) };
}
function mount(node: HTMLElement, key: string) {
	if (!portal_map.has(key)) throw `unknown portal ${key}`;
	const host = portal_map.get(key);
	host.insertBefore(node, null);
	return () => host.contains(node) && host.removeChild(node);
}
export function portal(node: HTMLElement, id = 'default') {
	let destroy: () => void;
	const key = `$$portal.${id}`;
	if (!portal_map.has(key))
		tick().then(() => {
			destroy = mount(node, key);
		});
	else destroy = mount(node, key);
	return { destroy: () => destroy?.() };
}
