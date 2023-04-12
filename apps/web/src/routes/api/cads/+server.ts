import { db } from 'db';
import { error, json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { z } from 'zod';

import { APIDataViewInput, executeDataViewQuery } from '$lib/types/dataView';
import type { APIDataView } from '$lib/types/dataView';
import { validateRequest, validateRequestWithAuth } from '$lib/server/api';
import type { ListViewProject } from '$lib/types/project';
import type { CadFile, CadTreeNode } from '$lib/types/cad';

export const POST = (async ({ request }) => {
	return await validateRequestWithAuth(request, APIDataViewInput, async (input, user) => {
		let folders = await db()
			.selectFrom('CadFolder')
			.selectAll()
			.where('ownerId', '=', user.id)
			.orderBy('createdAt', 'desc')
			.execute();
		let cads = await db()
			.selectFrom('Cad')
			.selectAll()
			.where('ownerId', '=', user.id)
			.orderBy('createdAt', 'desc')
			.execute();

		function resolveFolder(parentId?: string): CadTreeNode {
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
									type: 'cad',
									file: {
										createdAt: new Date(f.createdAt),
										updatedAt: new Date(f.updatedAt),
										publicId: f.publicId,
										name: f.name,
										description: f.description,
										long: f.long,
										lat: f.lat,
										filename: f.filename
									} as CadFile
								} as CadTreeNode)
						)
				],
				type: 'folder'
			} as CadTreeNode;

			return node;
		}

		let root = resolveFolder();

		return json(root);
	});
}) satisfies RequestHandler;
