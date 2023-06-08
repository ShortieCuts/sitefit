import { db } from 'db';
import { error, json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { z } from 'zod';

import { APIDataViewInput, executeDataViewQuery } from '$lib/types/dataView';
import type { APIDataView } from '$lib/types/dataView';
import { validateRequest, validateRequestWithAuth } from '$lib/server/api';

import type { ListViewProject, ProjectTreeNode } from '$lib/types/project';

export const POST = (async ({ request }) => {
	return await validateRequestWithAuth(request, APIDataViewInput, async (input, user) => {
		let folders = await db()
			.selectFrom('ProjectFolder')
			.selectAll()
			.where('ownerId', '=', user.id)
			.orderBy('updatedAt', 'desc')
			.execute();
		let cads = await db()
			.selectFrom('Project')
			.selectAll()
			.where('ownerId', '=', user.id)
			.orderBy('updatedAt', 'desc')
			.execute();

		function resolveFolder(parentId?: string): ProjectTreeNode {
			let children = folders.filter((f) => {
				if (!parentId) return f.parentId === null;
				else return f.parentId?.toString() === parentId;
			});

			let folder = folders.find((f) => f.id.toString() === parentId);
			let node = {
				id: parentId ?? '',
				name: folder?.name ?? '',
				children: [
					...children.map((f) => resolveFolder(f.id.toString())),
					...cads
						.filter((f) => {
							if (!parentId) return f.parentId === null;
							else return f.parentId?.toString() === parentId;
						})
						.map(
							(f) =>
								({
									id: f.publicId,
									name: f.name,
									type: 'project',
									file: {
										createdAt: f.createdAt,
										updatedAt: f.updatedAt,
										publicId: f.publicId,
										name: f.name,
										description: f.description,
										homeLat: f.homeLat,
										homeLong: f.homeLong
									} as ListViewProject
								} as ProjectTreeNode)
						)
				],
				type: 'folder'
			} as ProjectTreeNode;

			return node;
		}

		let root = resolveFolder();

		return json(root);
	});
}) satisfies RequestHandler;
