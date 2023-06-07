import type { RequestHandler } from './$types';
import { error, json, redirect } from '@sveltejs/kit';
import { z } from 'zod';

import { validateRequest, validateRequestOnlyAuth, validateRequestWithAuth } from '$lib/server/api';
import { db, fs } from 'db';
import { nanoid } from 'nanoid';
import { createProject } from 'api';

export const GET = (async ({ request, params }) => {
	return validateRequestOnlyAuth(request, async (user) => {
		let newId = await createProject({
			owner: user.publicId,
			name: 'New Project',
			description: ''
		});
		if (!newId) {
			throw redirect(302, '/');
		}
		throw redirect(302, `/project/${newId}`);
	});
}) satisfies RequestHandler;
