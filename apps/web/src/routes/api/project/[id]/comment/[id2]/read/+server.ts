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
		z.object({
			markUnread: z.boolean().optional()
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

			let comment = await db()
				.selectFrom('Comment')
				.selectAll()
				.where('projectId', '=', project.id)
				.where('id', '=', BigInt(parseInt(params.id2)))
				.executeTakeFirst();

			if (!comment) {
				throw error(404, 'Comment not found');
			}

			if (input.markUnread) {
				let deleteRead = await db()
					.deleteFrom('CommentRead')
					.where('userId', '=', user.id)
					.where('commentId', '=', comment.id)
					.executeTakeFirst();

				if (deleteRead.numDeletedRows == 0n) {
					throw error(404, 'Unable to mark unread');
				}
			} else {
				let insert = await db()
					.insertInto('CommentRead')
					.values({
						userId: user.id,
						commentId: comment.id,
						updatedAt: new Date()
					})
					.executeTakeFirst();

				if (insert.numInsertedOrUpdatedRows == 0n) {
					throw error(404, 'Unable to mark read');
				}
			}

			return json({});
		}
	);
}) satisfies RequestHandler;
