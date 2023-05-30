export function watchMutationAndResize(node: HTMLElement, cb: () => void) {
	let mutationObserver = new MutationObserver(cb);
	let resizeObserver = new ResizeObserver(cb);

	mutationObserver.observe(node, {
		childList: true,
		subtree: true,
		attributes: true
	});

	resizeObserver.observe(node);

	return {
		destroy() {
			mutationObserver.disconnect();
			resizeObserver.disconnect();
		}
	};
}

export function watchMutation(node: HTMLElement, cb: () => void) {
	let mutationObserver = new MutationObserver(cb);

	mutationObserver.observe(node, {
		childList: true,
		subtree: true,
		attributes: true
	});

	return {
		destroy() {
			mutationObserver.disconnect();
		}
	};
}

export function watchResize(node: HTMLElement, cb: () => void) {
	let resizeObserver = new ResizeObserver(cb);

	resizeObserver.observe(node);

	return {
		destroy() {
			resizeObserver.disconnect();
		}
	};
}
