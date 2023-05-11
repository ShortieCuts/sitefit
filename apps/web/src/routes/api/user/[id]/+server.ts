import { db } from 'db';
import { error, json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { z } from 'zod';
import { validateRequest, validateRequestWithAuth } from '$lib/server/api';
import type { PublicUserInfo } from '$lib/types/user';

export const POST = (async ({ request, params }) => {
	return await validateRequest(request, z.object({}), async (input) => {
		let user = await db()
			.selectFrom('User')
			.select(['User.firstName', 'User.lastName', 'User.photoURL'])
			.where('publicId', '=', params.id)
			.executeTakeFirst();

		if (!user) {
			throw error(404, 'User not found');
		}

		return json({
			id: params.id,
			firstName: user.firstName,
			lastName: user.lastName,
			photoURL: user.photoURL
		} as PublicUserInfo);
	});
}) satisfies RequestHandler;
