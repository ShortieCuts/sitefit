import type { User } from 'auth';

export async function getAuthHeader(): Promise<string> {
	let { firebaseAuth } = await import('src/store/firebase');
	let user = firebaseAuth.currentUser;
	if (firebaseAuth.currentUser) {
		return `Bearer ${await firebaseAuth.currentUser.getIdToken()}`;
	} else {
		return '';
	}
}

export function createApiEndpointHelper<T extends undefined, A>(
	method: string,
	endpoint: string
): () => Promise<{ data: A; error: boolean; message: string }>;
export function createApiEndpointHelper<T, A>(
	method: string,
	endpoint: string
): (payload: T) => Promise<{ data: A; error: boolean; message: string }>;
export function createApiEndpointHelper<T, A>(
	method: string,
	endpoint: string
): (payload: T) => Promise<{ data: A; error: boolean; message: string }> {
	return async (payload: T) => {
		let res = await fetch(endpoint, {
			method,
			...(method != 'GET'
				? {
						headers: {
							'Content-Type': 'application/json',
							Authorization: await getAuthHeader()
						},
						body: JSON.stringify(payload)
				  }
				: {
						headers: {
							Authorization: await getAuthHeader()
						}
				  })
		});

		let status = res.status;

		res = await res.json();
		if (status >= 400) {
			return {
				data: null as any,
				error: true,
				message: (res as any).error
			};
		} else {
			return {
				data: res as any as A,
				error: false,
				message: ''
			};
		}
	};
}

export const createProject = createApiEndpointHelper<
	{
		name: string;
		description: string;
	},
	{
		projectId: string;
	}
>('POST', '/api/project');

export const createSession = createApiEndpointHelper<
	{
		delete: boolean;
	},
	{
		success: boolean;
	}
>('POST', '/api/user/session');

export const getMe = createApiEndpointHelper<undefined, User>('POST', '/api/user/me');

export const updateMe = createApiEndpointHelper<
	{
		firstName: string;
		lastName: string;
	},
	{
		success: boolean;
	}
>('POST', '/api/user/update');
