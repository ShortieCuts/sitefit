import { getRequestUser, prismaUserToClientUser } from 'auth';

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from 'db';

export const POST = (async ({ request }) => {
	let input = await request.json();
	let user = await getRequestUser(request);

	if (!user) throw error(401, 'Not logged in');

	let payload = z
		.object({
			firstName: z.string().optional(),
			lastName: z.string().optional()
		})
		.parse(input);

	let res = await db.user.update({
		where: {
			id: user.id
		},
		data: payload
	});

	return json({
		success: !!res
	});
}) satisfies RequestHandler;
