import { browser } from '$app/environment';
import { get, writable, type Writable } from 'svelte/store';

const keys = new Map<string, DraggableInstance>();

class DraggableInstance {
	payload: Writable<any> = writable(null);
	key: string;
	dragging: Writable<boolean> = writable(false);
	slot: Writable<any> = writable(null);
	bias: Writable<any> = writable(null);
	signal: Writable<boolean> = writable(false);

	constructor(key: string) {
		this.key = key;
	}

	startDragging(payload: any) {
		this.payload.set(payload);
		this.dragging.set(true);
	}

	stopDragging() {
		this.payload.set(null);
		this.dragging.set(false);
	}

	setSlot(slot: any, bias: number) {
		this.slot.set(slot);
		this.bias.set(bias);
	}

	exitSlot(slot: any) {
		if (get(this.slot) === slot) {
			this.slot.set(null);
			this.bias.set(null);
		}
	}

	drop(slot: any, bias: number) {
		this.slot.set(slot);
		this.bias.set(bias);
		this.signal.set(true);

		setTimeout(() => {
			this.signal.set(false);
		}, 1);
	}
}

if (browser) {
	window.addEventListener('mouseup', (e) => {
		if (e.target instanceof HTMLElement && e.target.closest('.draggable-node')) {
			keys.forEach((key) => {
				key.stopDragging();
			});
		}
	});
}

export function getDraggable(key: string): DraggableInstance {
	if (!keys.has(key)) {
		keys.set(key, new DraggableInstance(key));
	}

	return keys.get(key) as DraggableInstance;
}
