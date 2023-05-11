import { redirect } from '@sveltejs/kit';
import type { AuthState } from 'auth';

export function requireAuth(user: AuthState, url: URL) {
	if (!user.user) {
		throw redirect(302, '/login?redirect=' + encodeURI(url.pathname));
	}
}
