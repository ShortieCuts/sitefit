import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createProject, CreateProjectSchema } from 'api';

import { validateRequest, validateRequestWithAuth } from '$lib/server/api';

export const POST = (async ({ request }) => {
	return validateRequestWithAuth(
		request,
		CreateProjectSchema.omit({
			owner: true
		}),
		async (payload, user) => {
			const projectId = await createProject({
				name: payload.name,
				description: payload.description ?? '',
				owner: user.publicId
			});

			if (projectId) {
				return json({ projectId });
			} else {
				return json({ error: 'Could not create project' }, { status: 400 });
			}
		}
	);
}) satisfies RequestHandler;
