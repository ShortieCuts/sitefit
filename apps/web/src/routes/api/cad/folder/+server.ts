import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
const CreateCadFolderSchema = z.object({
	parentId: z.string().min(0).max(100)
});

import { validateRequest, validateRequestWithAuth } from '$lib/server/api';
import { db, fs } from 'db';
import { nanoid } from 'nanoid';

export const POST = (async ({ request }) => {
	return validateRequestWithAuth(request, CreateCadFolderSchema, async (payload, user) => {
		let newP = await db()
			.insertInto('CadFolder')
			.values({
				name: 'New folder',

				updatedAt: new Date(),
				createdAt: new Date(),

				parentId: payload.parentId === '' ? null : BigInt(parseInt(payload.parentId)),

				ownerId: user?.id ?? 0
			})
			.execute();

		if (newP.length > 0 && (newP[0].numInsertedOrUpdatedRows ?? 0) > 0) {
			let ida = newP[0].insertId as bigint | undefined;
			if (typeof ida !== 'undefined') {
				let jss = { folderId: parseInt(ida.toString()) };
				return json(jss);
			} else {
				return json({ error: 'Could not create folder' }, { status: 400 });
			}
		} else {
			return json({ error: 'Could not create folder' }, { status: 400 });
		}
	});
}) satisfies RequestHandler;
