import { getRequestUser, prismaUserToClientUser } from 'auth';

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST = (async ({ request }) => {
	let user = await getRequestUser(request);

	if (!user) throw error(401, 'Not logged in');

	return json({
		...prismaUserToClientUser(user),
		email: user.email
	});
}) satisfies RequestHandler;
