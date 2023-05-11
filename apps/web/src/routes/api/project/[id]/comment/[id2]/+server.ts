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

			let updateComment = await db()
				.updateTable('Comment')
				.set({
					text: input.text
				})
				.where('authorId', '=', user.id)
				.where('id', '=', BigInt(parseInt(params.id2)))
				.executeTakeFirst();

			if (updateComment.numUpdatedRows == 0n) {
				throw error(404, 'Comment not found');
			}

			return json({});
		}
	);
}) satisfies RequestHandler;

export const DELETE = async ({ request, params }) => {
	return await validateRequestWithAccess(
		params.id,
		'WRITE',
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

			let deleteComment = await db()
				.deleteFrom('Comment')
				.where('authorId', '=', user.id)
				.where('id', '=', BigInt(parseInt(params.id2)))
				.executeTakeFirst();

			if (deleteComment.numDeletedRows == 0n) {
				throw error(404, 'Comment not found');
			} else {
				await db()
					.deleteFrom('Comment')
					.where('parentId', '=', BigInt(parseInt(params.id2)))
					.executeTakeFirst();
			}

			return json({});
		}
	);
};
