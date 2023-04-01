import { db } from 'db';
import { error, json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { z } from 'zod';

import { APIDataViewInput, executeDataViewQuery } from '$lib/types/dataView';
import type { APIDataView } from '$lib/types/dataView';
import { validateRequest, validateRequestWithAuth } from '$lib/server/api';
import type { ListViewProject } from '$lib/types/project';

export const POST = (async ({ request }) => {
	return await validateRequestWithAuth(request, APIDataViewInput, async (input, user) => {
		return json(
			await executeDataViewQuery(
				'/api/projects',
				input,
				'Project',
				(q) => {
					return q.where('ownerId', '=', user.id).orderBy('createdAt', 'desc');
				},

				input,
				(project: any) =>
					({
						createdAt: project.createdAt,
						updatedAt: project.updatedAt,
						publicId: project.publicId,
						name: project.name,
						description: project.description,
						homeLat: project.homeLat,
						homeLong: project.homeLong
					} as ListViewProject)
			)
		);
	});
}) satisfies RequestHandler;
