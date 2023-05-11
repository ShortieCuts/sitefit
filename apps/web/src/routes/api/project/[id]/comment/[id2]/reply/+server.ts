import { db } from 'db';
import { error, json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { z } from 'zod';

import { validateRequestWithAccess } from '$lib/server/api';
import type { ListViewProject, MetadataProject } from '$lib/types/project';

export const POST = (async ({ request, params }) => {
	return await validateRequestWithAccess(
		params.id,
		'COMMENT',
		request,
		z.object({
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

			let parentComment = await db()
				.selectFrom('Comment')
				.selectAll()
				.where('projectId', '=', project.id)
				.where('id', '=', BigInt(parseInt(params.id2)))
				.executeTakeFirst();

			if (!parentComment) {
				throw error(404, 'Comment not found');
			}

			let newComment = await db()
				.insertInto('Comment')
				.values({
					projectId: project.id,
					authorId: user.id,
					parentId: parentComment.id,
					text: input.text,
					lat: 0,
					long: 0,
					toLat: 0,
					toLong: 0,
					isRoot: false,
					updatedAt: new Date()
				})
				.executeTakeFirst();

			if (!newComment) {
				throw error(500, 'Failed to create comment');
			}

			await db()
				.deleteFrom('CommentRead')
				.where('commentId', '=', parentComment.id)
				.where('userId', '!=', user.id)
				.execute();

			return json({
				id: parseInt(newComment.insertId?.toString() ?? '0')
			});
		}
	);
}) satisfies RequestHandler;
