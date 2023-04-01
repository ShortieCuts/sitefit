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

	let res = await db()
		.updateTable('User')
		.set({
			firstName: payload.firstName,
			lastName: payload.lastName
		})
		.where('id', '=', user.id)
		.executeTakeFirst();

	return json({
		success: res.numUpdatedRows > 0
	});
}) satisfies RequestHandler;
