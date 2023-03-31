import { getRequestUser, type PrismaUser } from 'auth';
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
