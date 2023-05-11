import { getRequestUser, type PrismaUser } from 'auth';
import { db } from 'db';
import { z } from 'zod';

export function validateRequest<T>(
	request: Request,
	zodObj: z.ZodType<T>,
	fn: (payload: T) => Promise<Response>
): Promise<Response> {
	return new Promise(async (resolve, reject) => {
		try {
			const body = await request.json();
			const payload = zodObj.parse(body);

			const response = await fn(payload);
			resolve(response);
		} catch (err) {
			console.error(err);
			if (err instanceof z.ZodError) {
				resolve(
					new Response(JSON.stringify({ error: 'Invalid JSON input', details: err.issues }), {
						status: 400,
						headers: {
							'Content-Type': 'application/json'
						}
					})
				);
			} else if (err instanceof SyntaxError) {
				if (err.message === 'Unexpected end of JSON input') {
					resolve(
						new Response('{"error": "Invalid JSON input"}', {
							status: 400,
							headers: { 'Content-Type': 'application/json' }
						})
					);
				} else {
					resolve(
						new Response(JSON.stringify({ error: (err as Error).toString() }), {
							status: 400,
							headers: {
								'Content-Type': 'application/json'
							}
						})
					);
				}
			} else {
				resolve(
					new Response(JSON.stringify({ error: (err as Error).toString() }), {
						status: 400,
						headers: {
							'Content-Type': 'application/json'
						}
					})
				);
			}
		}
	});
}

export function validateRequestWithAuth<T>(
	request: Request,
	zodObj: z.ZodType<T>,
	fn: (payload: T, auth: PrismaUser) => Promise<Response>
): Promise<Response> {
	return validateRequest(request, zodObj, async (payload) => {
		let user = await getRequestUser(request);
		if (user) {
			return await fn(payload, user);
		} else {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
	});
}
export async function validateRequestOnlyAuth(
	request: Request,
	fn: (auth: PrismaUser) => Promise<Response>
): Promise<Response> {
	let user = await getRequestUser(request);
	if (user) {
		return await fn(user);
	} else {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
}

export function validateRequestWithAccess<T>(
	projectId: string,
	accessLevel: 'READ' | 'WRITE' | 'COMMENT',
	request: Request,
	zodObj: z.ZodType<T>,
	fn: (payload: T, auth: PrismaUser | null) => Promise<Response>
): Promise<Response> {
	return validateRequest(request, zodObj, async (payload) => {
		let user = await getRequestUser(request);
		let project = await db()
			.selectFrom('Project')
			.selectAll()
			.where('publicId', '=', projectId)
			.executeTakeFirst();

		if (!project) {
			return new Response(JSON.stringify({ error: 'Project not found' }), {
				status: 404,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}

		if (user) {
			let grantedAccess = await db()
				.selectFrom('Access')
				.where('projectId', '=', project.id)
				.where('Access.userId', '=', user.id)

				.select(['Access.level', 'Access.id', 'status'])
				.executeTakeFirst();

			if (!project) {
				return new Response(JSON.stringify({ error: 'Project not found' }), {
					status: 404,
					headers: {
						'Content-Type': 'application/json'
					}
				});
			}

			if (project.ownerId === user.id) {
				return await fn(payload, user);
			}

			if (!grantedAccess) {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
					headers: {
						'Content-Type': 'application/json'
					}
				});
			}

			let access = grantedAccess;
			let hasAccess = true;

			if (access.status !== 'ACTIVE') {
				hasAccess = false;
			}

			if (accessLevel === 'COMMENT') {
				if (access.level == 'READ') {
					hasAccess = false;
				}
			}

			if (accessLevel === 'WRITE') {
				if (access.level == 'READ' || access.level == 'COMMENT') {
					hasAccess = false;
				}
			}

			if (!hasAccess) {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
					headers: {
						'Content-Type': 'application/json'
					}
				});
			} else {
				return await fn(payload, user);
			}
		} else {
			if (project.blanketAccessGranted) {
				let hasAccess = true;

				if (accessLevel === 'COMMENT') {
					if (project.blanketAccess == 'READ') {
						hasAccess = false;
					}
				}

				if (accessLevel === 'WRITE') {
					if (project.blanketAccess == 'READ' || project.blanketAccess == 'COMMENT') {
						hasAccess = false;
					}
				}

				if (hasAccess) {
					return await fn(payload, null);
				}
			}

			if (request.headers.get('X-access-token')) {
				let access = await db()
					.selectFrom('Access')
					.where('projectId', '=', project.id)
					.where('token', '=', request.headers.get('X-access-token'))
					.select(['Access.level', 'Access.id', 'status'])
					.executeTakeFirst();

				if (access) {
					let hasAccess = true;

					if (access.status !== 'ACTIVE') {
						hasAccess = false;
					}

					if (accessLevel === 'COMMENT') {
						if (access.level == 'READ') {
							hasAccess = false;
						}
					}

					if (accessLevel === 'WRITE') {
						if (access.level == 'READ' || access.level == 'COMMENT') {
							hasAccess = false;
						}
					}

					if (hasAccess) {
						return await fn(payload, null);
					}
				}
			}
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
	});
}
