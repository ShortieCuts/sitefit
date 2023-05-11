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
		z.object({
			sortBy: z.enum(['unread', 'date'])
		}),
		async (input, user) => {
			let project = await db()
				.selectFrom('Project')
				.selectAll()
				.where('publicId', '=', params.id)
				.executeTakeFirst();

			if (!project) {
				throw error(404, 'Project not found');
			}

			if (user) {
				let commentsRead = await db()
					.selectFrom('Comment')

					.innerJoin('User', 'Comment.authorId', 'User.id')
					.where('projectId', '=', project.id)
					.where('isRoot', '=', true)
					.where(({ exists, selectFrom }) =>
						exists(
							selectFrom('CommentRead')
								.select(['CommentRead.commentId', 'CommentRead.userId'])
								.whereRef('Comment.id', '=', 'CommentRead.commentId')
								.where('CommentRead.userId', '=', user.id)
						)
					)
					.select([
						'Comment.id',
						'Comment.authorId',
						'Comment.createdAt',
						'Comment.updatedAt',
						'Comment.text',
						'Comment.long',
						'Comment.lat',
						'Comment.toLong',
						'Comment.toLat',
						'Comment.isRoot',
						'User.publicId'
					])
					.orderBy('createdAt', 'desc')
					.limit(500)
					.execute();

				let commentsUnread = await db()
					.selectFrom('Comment')
					.innerJoin('User', 'Comment.authorId', 'User.id')
					.select([
						'Comment.id',
						'Comment.authorId',
						'Comment.createdAt',
						'Comment.updatedAt',
						'Comment.text',
						'Comment.long',
						'Comment.lat',
						'Comment.toLong',
						'Comment.toLat',
						'Comment.isRoot',
						'User.publicId'
					])
					.where('projectId', '=', project.id)
					.where('isRoot', '=', true)

					.where(({ not, exists, selectFrom }) =>
						not(
							exists(
								selectFrom('CommentRead')
									.select(['CommentRead.commentId', 'CommentRead.userId'])
									.whereRef('Comment.id', '=', 'CommentRead.commentId')
									.where('CommentRead.userId', '=', user.id)
							)
						)
					)

					.orderBy('createdAt', 'desc')
					.limit(500)
					.execute();

				return json({
					comments: [
						...commentsRead.map((c) => ({
							id: parseInt(c.id.toString()),
							authorId: c.publicId,
							createdAt: c.createdAt,
							updatedAt: c.updatedAt,
							text: c.text,
							long: c.long,
							lat: c.lat,
							toLong: c.toLong,
							toLat: c.toLat,
							isRoot: c.isRoot,
							read: true
						})),
						...commentsUnread.map((c) => ({
							id: parseInt(c.id.toString()),
							authorId: c.publicId,
							createdAt: c.createdAt,
							updatedAt: c.updatedAt,
							text: c.text,
							long: c.long,
							lat: c.lat,
							toLong: c.toLong,
							toLat: c.toLat,
							isRoot: c.isRoot,
							read: false
						}))
					]
				});
			} else {
				let comments = await db()
					.selectFrom('Comment')
					.selectAll()
					.where('projectId', '=', project.id)
					.where('isRoot', '=', true)
					.orderBy('createdAt', 'desc')
					.limit(500)
					.execute();

				return json({
					comments: comments.map((c) => ({
						id: parseInt(c.id.toString()),
						authorId: c.authorId,
						createdAt: c.createdAt,
						updatedAt: c.updatedAt,
						text: c.text,
						long: c.long,
						lat: c.lat,
						toLong: c.toLong,
						toLat: c.toLat,
						isRoot: c.isRoot,
						read: false
					}))
				});
			}

			return json({
				comments: []
			});
		}
	);
}) satisfies RequestHandler;
