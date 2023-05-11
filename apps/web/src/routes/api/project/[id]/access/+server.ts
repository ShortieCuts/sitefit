import { db } from 'db';
import { error, json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { z } from 'zod';

import { nanoid } from 'nanoid';

import { validateRequestWithAccess } from '$lib/server/api';
function isEmail(str: string) {
	return str
		.toLowerCase()
		.match(
			/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
		);
}

export const POST = (async ({ request, params, fetch }) => {
	return await validateRequestWithAccess(
		params.id,
		'WRITE',
		request,
		z.object({
			mode: z.enum(['grant', 'revoke', 'blanketMode', 'blanketSet']),
			email: z.string().email().optional(),
			access: z.enum(['READ', 'WRITE', 'COMMENT']).optional(),
			blanketMode: z.boolean().optional()
		}),
		async (input, reqUser) => {
			let project = await db()
				.selectFrom('Project')
				.selectAll()
				.where('publicId', '=', params.id)
				.executeTakeFirst();

			if (!project) {
				throw error(404, 'Project not found');
			}

			function doFetch() {
				return fetch('/api/project/' + params.id + '/metadata', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({})
				});
			}

			let grantedAccess = await db()
				.selectFrom('Access')
				.where('projectId', '=', project.id)
				.select(['Access.level', 'Access.id', 'Access.createdAt', 'Access.email'])
				.execute();

			let accessEmails = new Map(grantedAccess.map((access) => [access.email, access.id]));

			if (input.mode === 'grant') {
				if (!input.email) {
					throw error(400, 'Email is required');
				}

				if (!input.access) {
					throw error(400, 'Access is required');
				}

				let emails = input.email.split(',').map((e) => e.trim());
				emails = emails.filter((e) => isEmail(e));

				let access = input.access;
				let projectId = project.id;
				await Promise.all(
					emails.map(async (email) => {
						let accessId = accessEmails.get(email);

						if (accessId) {
							await db()
								.updateTable('Access')
								.set({ level: access, updatedAt: new Date() })
								.where('id', '=', accessId)
								.execute();
						} else {
							let user = await db()
								.selectFrom('User')
								.select('id')
								.where('email', '=', email)
								.executeTakeFirst();

							if (!user) {
								await db()
									.insertInto('Access')
									.values({
										level: access,
										projectId: projectId,
										userId: 0n,
										createdAt: new Date(),
										updatedAt: new Date(),
										status: 'ACTIVE',
										email: email,
										token: nanoid(120)
									})
									.execute();
							} else {
								await db()
									.insertInto('Access')
									.values({
										level: access,
										projectId: projectId,
										userId: user.id,
										createdAt: new Date(),
										updatedAt: new Date(),
										status: 'ACTIVE',
										email: email,
										token: nanoid(120)
									})
									.execute();
							}
						}
					})
				);

				return doFetch();
			} else if (input.mode === 'revoke') {
				if (!input.email) {
					throw error(400, 'Email is required');
				}

				let accessId = accessEmails.get(input.email);

				if (!accessId) {
					throw error(400, 'User does not have access');
				}

				await db().deleteFrom('Access').where('id', '=', accessId).execute();

				return doFetch();
			} else if (input.mode === 'blanketMode') {
				if (typeof input.blanketMode === 'undefined') {
					throw error(400, 'Blanket mode is required');
				}

				await db()
					.updateTable('Project')
					.set({ blanketAccessGranted: input.blanketMode, updatedAt: new Date() })
					.where('id', '=', project.id)
					.execute();

				return doFetch();
			} else if (input.mode === 'blanketSet') {
				if (!input.access) {
					throw error(400, 'Access is required');
				}

				await db()
					.updateTable('Project')
					.set({ blanketAccess: input.access, updatedAt: new Date() })
					.where('id', '=', project.id)
					.execute();

				return doFetch();
			}

			throw error(400, 'Invalid mode');
		}
	);
}) satisfies RequestHandler;
