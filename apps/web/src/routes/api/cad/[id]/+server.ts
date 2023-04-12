import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
const UpdateCadSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	parentId: z.string().min(0).max(100).optional()
});

import { validateRequest, validateRequestOnlyAuth, validateRequestWithAuth } from '$lib/server/api';
import { db, fs } from 'db';
import { nanoid } from 'nanoid';

export const POST = (async ({ request, params }) => {
	return validateRequestWithAuth(request, UpdateCadSchema, async (payload, user) => {
		let newP = await db()
			.updateTable('Cad')
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
			.where('publicId', '=', params.id)
			.where('ownerId', '=', user.id)
			.execute();

		return json({ success: true });
	});
}) satisfies RequestHandler;

export const GET = (async ({ request, params }) => {
	return validateRequestOnlyAuth(request, async (user) => {
		let cad = await db()
			.selectFrom('Cad')
			.selectAll()
			.where('publicId', '=', params.id)
			.where('ownerId', '=', user.id)
			.executeTakeFirst();

		if (!cad) {
			throw error(404, 'Cad not found');
		}

		let res = await fs().get(`cads/${cad.publicId}`);
		return new Response(res.body, {
			status: res.status,
			headers: {
				'Content-Type': 'text/plain'
			}
		});
	});
}) satisfies RequestHandler;
