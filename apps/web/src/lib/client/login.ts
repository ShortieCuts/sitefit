import { auth } from 'src/store/auth';
import { get } from 'svelte/store';

export function checkLoginAndRedirect() {
	let $auth = get(auth);
	if ($auth.isLoading) {
		let unsub = auth.subscribe((v) => {
			if (!v.isLoading && !v.firebaseUser) {
				window.location.href = '/login?redirect=' + encodeURIComponent(window.location.href);
				unsub();
			}
		});
	} else {
		if (!$auth.firebaseUser) {
			window.location.href = '/login?redirect=' + encodeURIComponent(window.location.href);
		}
	}
}
