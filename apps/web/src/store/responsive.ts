import { readable } from 'svelte/store';

export const isMobile = readable(false, (set) => {
	if (typeof window === 'undefined') return;

	const mediaQuery = window.matchMedia('(max-width: 768px)');
	set(mediaQuery.matches);
	const listener = (ev: MediaQueryListEvent) => {
		set(ev.matches);
	};
	mediaQuery.addEventListener('change', listener);
	return () => mediaQuery.removeEventListener('change', listener);
});
