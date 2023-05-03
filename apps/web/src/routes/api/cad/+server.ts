import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
const CreateCadSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(1000).optional(),
	filename: z.string().min(1).max(100),
	parent: z.number().nullable(),

	long: z.number().min(-180).max(180),
	lat: z.number().min(-90).max(90),
	data: z
		.string()
		.min(1)
		.max(1024 * 1024 * 50)
});

import { validateRequest, validateRequestWithAuth } from '$lib/server/api';
import { db, fs } from 'db';
import { nanoid } from 'nanoid';

export const POST = (async ({ request }) => {
	return validateRequestWithAuth(request, CreateCadSchema, async (payload, user) => {
		let publicId = nanoid(32);
		let newP = await db()
			.insertInto('Cad')
			.values({
				publicId,
				name: payload.name,
				description: payload.description ?? '',
				lat: payload.lat,
				long: payload.long,
				size: 0,
				filename: payload.filename,
				parentId: payload.parent ? BigInt(payload.parent) : null,

				updatedAt: new Date(),
				createdAt: new Date(),

				ownerId: user?.id ?? 0
			})
			.execute();

		await fs().put(`cads/${publicId}`, payload.data);

		if (newP.length > 0 && (newP[0].numInsertedOrUpdatedRows ?? 0) > 0) {
			return json({ cadId: publicId });
		} else {
			return json({ error: 'Could not create project' }, { status: 400 });
		}
	});
}) satisfies RequestHandler;
