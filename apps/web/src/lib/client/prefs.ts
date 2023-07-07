import { writable, type Writable } from 'svelte/store';

const localStorageCache = new Map<string, Writable<string>>();

export function localStoragePreference<T extends string>(key: string, fallback: any): Writable<T> {
	if (!localStorageCache.has(key)) {
		let value = localStorage.getItem(key);
		if (value) {
			try {
				localStorageCache.set(key, writable(value));
			} catch (e) {
				localStorageCache.set(key, writable(fallback));
			}
		} else {
			localStorageCache.set(key, writable(fallback));
		}

		localStorageCache.get(key)!.subscribe((v) => {
			localStorage.setItem(key, v);
		});
	}
	return localStorageCache.get(key)! as Writable<T>;
}
