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
