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

function filterBool(v: any) {
	if (typeof v === 'boolean') {
		return v;
	} else if (typeof v === 'string') {
		return v === 'true';
	} else if (typeof v === 'number') {
		return v === 1;
	}
}

export const POST = (async ({ request, params }) => {
	return await validateRequestWithAccess(
		params.id,
		'READ',
		request,
		z.object({}),
		async (input, user) => {
			if (!user) {
				throw error(401, 'Not logged in');
			}

			let project = await db()
				.selectFrom('Project')
				.selectAll()
				.where('publicId', '=', params.id)
				.executeTakeFirst();

			if (!project) {
				throw error(404, 'Project not found');
			}

			let replies = await db()
				.selectFrom('Comment')
				.innerJoin('User', 'Comment.authorId', 'User.id')
				.select([
					'Comment.id',
					'User.publicId',
					'Comment.createdAt',
					'Comment.updatedAt',
					'Comment.text'
				])
				.where('projectId', '=', project.id)
				.where('parentId', '=', BigInt(parseInt(params.id2)))
				.orderBy('Comment.createdAt', 'asc')
				.limit(200)
				.execute();

			return json({
				replies: replies.map((c) => ({
					id: parseInt(c.id.toString()),
					authorId: c.publicId,
					createdAt: c.createdAt,
					updatedAt: c.updatedAt,
					text: c.text
				}))
			});
		}
	);
}) satisfies RequestHandler;
