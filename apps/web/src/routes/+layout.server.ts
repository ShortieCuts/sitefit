import { redirect } from '@sveltejs/kit';
import { getRequestUser } from 'auth';
import { getRequestAuthState } from 'auth';
import type { LayoutServerLoad } from './$types';

export const load = async ({ cookies, request, url, route }) => {
	let user = await getRequestUser(request);
	console.log('user', user);
	if (!user && route.id !== '/login' && route.id !== '/signup') {
		throw redirect(302, '/login?redirect=' + encodeURI(url.pathname));
	}

	return {
		user: await getRequestAuthState(request)
	};
};
