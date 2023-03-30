import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createProject, CreateProjectSchema } from 'api';

import { validateRequest } from '$lib/server/api';

export const POST = (async ({ request }) => {
	return validateRequest(
		request,
		CreateProjectSchema.omit({
			owner: true
		}),
		async (payload) => {
			const projectId = await createProject({
				...payload,
				owner: 'pub'
			});

			if (projectId) {
				return json({ projectId });
			} else {
				return json({ error: 'Could not create project' }, { status: 400 });
			}
		}
	);
}) satisfies RequestHandler;
