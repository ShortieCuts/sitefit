import { createSessionCookie } from 'auth';

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';

export const POST = (async ({ request, cookies }) => {
	let input = (await request.json()) as { delete: boolean };
	if (input.delete) {
		cookies.set('session', '', {
			maxAge: 0,
			httpOnly: !dev,
			secure: !dev,
			sameSite: true,
			path: '/'
		});
		return json({ success: true });
	}

	let session = await createSessionCookie(request);

	if (session) {
		const options = {
			maxAge: 60 * 60 * 24 * 13.99,
			httpOnly: !dev,
			secure: !dev,
			sameSite: true,
			path: '/'
		};
		cookies.set('session', session, options);
		return json({ success: true });
	} else {
		throw error(401, 'Could not create session');
	}
}) satisfies RequestHandler;
