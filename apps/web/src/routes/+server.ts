import type { RequestHandler } from './$types';
import { error, json, redirect } from '@sveltejs/kit';
import { z } from 'zod';

import { validateRequest, validateRequestOnlyAuth, validateRequestWithAuth } from '$lib/server/api';
import { db, fs } from 'db';
import { nanoid } from 'nanoid';
import { createProject } from 'api';
import { getRequestUser } from 'auth';

export const GET = (async ({ request, params }) => {
	let user = await getRequestUser(request);
	console.log('Hit req');
	if (!user) {
		throw redirect(302, '/login');
	}
	let latestProject = await db()
		.selectFrom('Project')
		.selectAll()
		.where('ownerId', '=', user.id)
		.orderBy('updatedAt', 'desc')
		.limit(1)
		.executeTakeFirst();

	if (latestProject) {
		throw redirect(302, `/project/${latestProject.publicId}`);
	} else {
		throw redirect(302, `/new`);
	}

	return json({ user });
}) satisfies RequestHandler;
