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
			let project = await db()
				.selectFrom('Project')
				.selectAll()
				.where('publicId', '=', params.id)
				.executeTakeFirst();

			if (!project) {
				throw error(404, 'Project not found');
			}

			if (user && user.id == project.ownerId) {
				await db()
					.updateTable('Project')
					.set({
						updatedAt: new Date()
					})
					.where('id', '=', project.id)
					.execute();
			}

			let grantedAccess = await db()
				.selectFrom('Access')
				.where('projectId', '=', project.id)
				.where('userId', '!=', 0n)
				.innerJoin('User', 'Access.userId', 'User.id')
				.select([
					'Access.level',
					'Access.id',
					'Access.createdAt',
					'User.publicId',
					'User.firstName',
					'User.lastName',
					'User.photoURL',
					'User.email'
				])
				.execute();

			let grantedAccessNonUser = await db()
				.selectFrom('Access')
				.where('projectId', '=', project.id)
				.where('userId', '=', 0n)
				.select(['Access.level', 'Access.id', 'Access.createdAt', 'Access.email'])
				.execute();

			let owner = await db()
				.selectFrom('User')
				.where('id', '=', project.ownerId)
				.select(['publicId', 'firstName', 'lastName', 'photoURL', 'email'])
				.executeTakeFirst();

			if (!owner) {
				throw error(500, 'Owner not found (this should never happen)');
			}

			return json({
				name: project.name,
				description: project.description,
				homeLat: project.homeLat,
				homeLong: project.homeLong,
				createdAt: project.createdAt,
				updatedAt: project.updatedAt,

				access: {
					items: [
						{
							access: 'OWNER',
							id: -1,
							userId: owner.publicId,
							firstName: owner.firstName,
							lastName: owner.lastName,
							photoURL: owner.photoURL,
							email: owner.email,
							createdAt: project.createdAt
						},
						...grantedAccess.map((access) => {
							return {
								access: access.level,
								id: access.id,
								userId: access.publicId,
								firstName: access.firstName,
								lastName: access.lastName,
								photoURL: access.photoURL,
								email: access.email,
								createdAt: access.createdAt
							};
						}),
						...grantedAccessNonUser.map((access) => {
							return {
								access: access.level,
								id: access.id,
								userId: 0,
								firstName: access.email,
								lastName: '',
								photoURL: '',
								email: access.email,
								createdAt: access.createdAt
							};
						})
					],
					blanketAccessGranted: filterBool(project.blanketAccessGranted),
					blanketAccess: project.blanketAccess
				}
			} as MetadataProject);
		}
	);
}) satisfies RequestHandler;
