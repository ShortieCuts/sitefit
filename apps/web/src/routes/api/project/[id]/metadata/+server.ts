import { db } from 'db';
import { error, json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { z } from 'zod';

import { APIDataViewInput, executeDataViewQuery } from '$lib/types/dataView';
import type { APIDataView } from '$lib/types/dataView';
import {
	validateRequest,
	validateRequestWithAccess,
	validateRequestWithAuth
} from '$lib/server/api';
import type { ListViewProject, MetadataProject } from '$lib/types/project';

export const POST = (async ({ request, params }) => {
	return await validateRequestWithAccess(
		params.id,
		'READ',
		request,
		z.object({}),
		async (input, user) => {
			let project = await db()
				.selectFrom('Project')
				.selectAll()
				.where('publicId', '=', params.id)
				.executeTakeFirst();

			if (!project) {
				throw error(404, 'Project not found');
			}
			let grantedAccess = await db()
				.selectFrom('Access')
				.where('projectId', '=', project.id)
				.innerJoin('User', 'Access.userId', 'User.id')
				.select(['Access.level', 'Access.id', 'User.publicId'])
				.execute();

			return json({
				name: project.name,
				description: project.description,
				homeLat: project.homeLat,
				homeLong: project.homeLong,
				createdAt: project.createdAt,
				updatedAt: project.updatedAt,

				access: {
					items: grantedAccess.map((access) => {
						return {
							level: access.level,
							id: access.id,
							userId: access.publicId
						};
					}),
					blanketAccessGranted: project.blanketAccessGranted,
					blanketAccess: project.blanketAccess
				}
			} as MetadataProject);
		}
	);
}) satisfies RequestHandler;
