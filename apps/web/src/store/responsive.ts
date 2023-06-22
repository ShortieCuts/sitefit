import { detect } from 'detect-browser';
import { readable } from 'svelte/store';

export const isMobile = readable(false, (set) => {
	if (typeof window === 'undefined') return;

	let isMobileDevice = false;
	const browser = detect();
	if (browser) {
		isMobileDevice = browser.name == 'ios' || browser.os == 'Android OS' || browser.os == 'iOS';
	}

	const mediaQuery = window.matchMedia('(max-width: 768px)');
	const listener = (ev: MediaQueryListEvent) => {
		watcher();
	};

	const watcher = () => {
		let doesMatch = isMobileDevice;
		if (mediaQuery.matches) {
			doesMatch = true;
		}
		if (window.innerHeight < 550) {
			doesMatch = true;
		}

		set(doesMatch);
	};

	watcher();
	mediaQuery.addEventListener('change', listener);
	window.addEventListener('resize', watcher);

	return () => {
		mediaQuery.removeEventListener('change', listener);
		window.removeEventListener('resize', watcher);
	};
});
