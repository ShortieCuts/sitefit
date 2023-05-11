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
		'COMMENT',
		request,
		z.object({
			longitude: z.number(),
			latitude: z.number(),
			text: z.string().min(1).max(2000)
		}),
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

			let newComment = await db()
				.insertInto('Comment')
				.values({
					projectId: project.id,
					authorId: user.id,
					long: input.longitude,
					lat: input.latitude,
					toLong: input.longitude,
					toLat: input.latitude,
					updatedAt: new Date(),
					createdAt: new Date(),
					isRoot: true,
					text: input.text
				})
				.executeTakeFirst();

			if (newComment.insertId == null) {
				throw error(500, 'Failed to insert comment');
			}

			let newCommentRead = await db()
				.insertInto('CommentRead')
				.values({
					userId: user.id,
					commentId: newComment.insertId,
					updatedAt: new Date()
				})
				.executeTakeFirst();

			return json({
				id: parseInt(newComment.insertId?.toString() ?? '-1')
			});
		}
	);
}) satisfies RequestHandler;
