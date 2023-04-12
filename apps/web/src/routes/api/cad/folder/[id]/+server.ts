import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
const UpdateCadFolderSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	parentId: z.string().min(0).max(100).optional()
});

import { validateRequest, validateRequestWithAuth } from '$lib/server/api';
import { db, fs } from 'db';
import { nanoid } from 'nanoid';

export const POST = (async ({ request, params }) => {
	return validateRequestWithAuth(request, UpdateCadFolderSchema, async (payload, user) => {
		let newP = await db()
			.updateTable('CadFolder')
			.set({
				...(payload.name
					? {
							name: payload.name
					  }
					: {}),

				...(typeof payload.parentId !== 'undefined'
					? {
							parentId: payload.parentId === '' ? null : BigInt(parseInt(payload.parentId))
					  }
					: {})
			})
			.where('id', '=', BigInt(parseInt(params.id)))
			.where('ownerId', '=', user.id)
			.execute();

		return json({ success: true });
	});
}) satisfies RequestHandler;
