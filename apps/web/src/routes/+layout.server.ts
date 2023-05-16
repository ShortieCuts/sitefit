import { redirect } from '@sveltejs/kit';
import { getRequestUser } from 'auth';
import { getRequestAuthState } from 'auth';
import type { LayoutServerLoad } from './$types';

export const load = async ({ cookies, request, url, route }) => {
	let user = await getRequestUser(request);

	return {
		user: await getRequestAuthState(request)
	};
};
