import { redirect } from '@sveltejs/kit';
import { getRequestUser } from 'auth';
import { getRequestAuthState } from 'auth';
import type { LayoutServerLoad } from './$types';

import {
	GOOGLE_CLOUD_KEY,
	FIREBASE_WEB_API_KEY,
	PROJECT_ID,
	DATABASE_URL,
	DATABASE_HOST,
	DATABASE_USER,
	DATABASE_PASSWORD
} from '$env/static/private';

import {
	SET_GOOGLE_CLOUD_KEY,
	SET_FIREBASE_WEB_API_KEY,
	SET_PROJECT_ID,
	SET_DATABASE_URL,
	SET_DATABASE_HOST,
	SET_DATABASE_USER,
	SET_DATABASE_PASSWORD
} from 'secrets';

SET_GOOGLE_CLOUD_KEY(GOOGLE_CLOUD_KEY);
SET_FIREBASE_WEB_API_KEY(FIREBASE_WEB_API_KEY);
SET_PROJECT_ID(PROJECT_ID);
SET_DATABASE_URL(DATABASE_URL);
SET_DATABASE_HOST(DATABASE_HOST);
SET_DATABASE_USER(DATABASE_USER);
SET_DATABASE_PASSWORD(DATABASE_PASSWORD);

export const load = async ({ cookies, request, url, route }) => {
	let user = await getRequestUser(request);
	console.log('user', user);
	if (!user && route.id !== '/login' && route.id !== '/signup') {
		throw redirect(302, '/login?redirect=' + encodeURI(url.pathname));
	}

	return {
		user: await getRequestAuthState(request)
	};
};
