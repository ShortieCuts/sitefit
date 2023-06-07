import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
const CopyProjectSchema = z.object({
	name: z.string().min(1).max(100),
	parentId: z.string().min(0).max(100).optional()
});

import {
	validateRequest,
	validateRequestOnlyAuth,
	validateRequestWithAccess,
	validateRequestWithAuth
} from '$lib/server/api';
import { db, fs } from 'db';
import { nanoid } from 'nanoid';
import { copyProject } from 'api';
import { dev } from '$app/environment';
export const POST = (async ({ request, params }) => {
	return await validateRequestWithAccess(
		params.id,
		'READ',
		request,
		CopyProjectSchema,
		async (input, user) => {
			if (user) {
				let copied = await copyProject(params.id, input.name, user.publicId, dev);
				if (!copied) throw error(500, 'Failed to copy project');

				return json({
					id: copied
				});
			} else {
				throw error(403, 'You must be logged in to perform this action');
			}
		}
	);
}) satisfies RequestHandler;
