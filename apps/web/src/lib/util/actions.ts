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

let getWidth = (fontSize: string, value: string) => {
	let div = document.createElement('div');
	div.innerText = value;
	div.style.fontSize = fontSize;
	div.style.width = 'auto';
	div.style.display = 'inline-block';
	div.style.visibility = 'hidden';
	div.style.position = 'fixed';
	div.style.overflow = 'auto';
	document.body.append(div);
	let width = div.clientWidth;
	div.remove();
	return width;
};

export function displayUnits(node: HTMLInputElement, unit: string) {
	if (!unit) {
		return { destroy: () => {} };
	}
	let wrapperEl = document.createElement('div');
	node.parentNode?.insertBefore(wrapperEl, node);
	wrapperEl.appendChild(node);
	wrapperEl.setAttribute('class', node.getAttribute('class') || '');
	wrapperEl.classList.add('display-units-wrapper');
	node.setAttribute('class', '');

	let unitEl = document.createElement('div');
	unitEl.innerText = unit;
	unitEl.classList.add('display-units-unit');
	wrapperEl.appendChild(unitEl);

	let listener = () => {
		let offset = getWidth('1rem', node.value);
		unitEl.style.left = `${offset}px`;
	};

	listener();

	node.addEventListener('input', listener);

	return {
		destroy: () => {
			node.removeEventListener('input', listener);
			node.setAttribute('class', wrapperEl.getAttribute('class') || '');
			wrapperEl.parentNode?.insertBefore(node, wrapperEl);
			wrapperEl.remove();
		}
	};
}
