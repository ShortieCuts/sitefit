let debounceTimers = new Map<string, NodeJS.Timeout>();

export function debouncify(fn: () => void, key: string, timeout: number = 250) {
	if (debounceTimers.has(key)) {
		clearTimeout(debounceTimers.get(key)!);
	}
	debounceTimers.set(
		key,
		setTimeout(() => {
			debounceTimers.delete(key);
			fn();
		}, timeout)
	);
}
