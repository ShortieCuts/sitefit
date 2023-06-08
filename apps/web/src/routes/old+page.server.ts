import { requireAuth } from '$lib/server/util.js';

export const load = async ({ cookies, request, url, route, parent }) => {
	let { user } = await parent();

	requireAuth(user, url);
};
