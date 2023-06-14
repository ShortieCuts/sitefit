import { writable } from 'svelte/store';
import {
	GithubAuthProvider,
	GoogleAuthProvider,
	sendPasswordResetEmail,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signInWithPopup,
	type AuthProvider,
	type User as FirebaseUser
} from 'firebase/auth';
import { browser } from '$app/environment';
import type { User } from 'auth';
import { createSession, getMe, updateMe } from '$lib/client/api';
import { parseCookie } from '$lib/util/cookie';

export type AuthState = {
	isAnonymous: boolean;
	isLoading: boolean;
	user: User | null;
	firebaseUser: FirebaseUser | null;
};

function getUserState(user: User | null, firebaseUser: FirebaseUser | null): AuthState {
	return {
		isAnonymous: firebaseUser?.isAnonymous || true,
		isLoading: false,
		user,
		firebaseUser
	};
}

export const sessionCounter = writable(0);

export const auth = writable(
	{
		isAnonymous: false,
		isLoading: true,
		user: null
	} as AuthState,
	(set) => {
		let destroy = () => {};

		if (browser)
			(async () => {
				let { firebaseAuth } = await import('./firebase');

				async function refresh() {
					let user = await getMe();

					if (!user.error) {
						set({
							isAnonymous: false,
							isLoading: false,
							firebaseUser: null,
							user: user.data
						});
					} else {
						set({
							isAnonymous: true,
							isLoading: false,
							firebaseUser: null,
							user: null
						});
					}
				}

				let unsub = sessionCounter.subscribe(async (val) => {
					refresh();
				});

				let unsub2 = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
					refresh();
				});

				destroy = () => {
					unsub();
					unsub2();
				};
			})();

		return () => {
			destroy();
		};
	}
);

export function notifySessionChange() {
	sessionCounter.update((val) => val + 1);
}

export const signIn = async (email: string, password: string) => {
	let { firebaseAuth } = await import('./firebase');

	let res = await signInWithEmailAndPassword(firebaseAuth, email, password);
	console.log('Sign in', res);
	await createSession({ delete: false });
	notifySessionChange();
	return res;
};

export const signUp = async (
	firstName: string,
	lastName: string,
	email: string,
	password: string
) => {
	let { firebaseAuth } = await import('./firebase');

	let newUser = await createUserWithEmailAndPassword(firebaseAuth, email, password);
	await updateMe({
		firstName,
		lastName
	});

	await createSession({ delete: false });
	notifySessionChange();

	return newUser;
};

export const signInWithOAuth = async (provider: string) => {
	let { firebaseAuth } = await import('./firebase');
	let providerInstance: AuthProvider = new GithubAuthProvider();
	if (provider === 'github') providerInstance = new GithubAuthProvider();
	if (provider == 'google') providerInstance = new GoogleAuthProvider();

	let res = await signInWithPopup(firebaseAuth, providerInstance);
	console.log('Sign in (oauth)', res);
	await createSession({ delete: false });
	notifySessionChange();

	return res;
};

export const signOut = async () => {
	let { firebaseAuth } = await import('./firebase');

	await createSession({ delete: true });
	notifySessionChange();

	await firebaseAuth.signOut();

	location.reload();
};

export const sendPasswordReset = async (email: string) => {
	let { firebaseAuth } = await import('./firebase');

	return await sendPasswordResetEmail(firebaseAuth, email);
};

export const refreshUserData = async () => {
	sessionCounter.update((val) => val + 1);
};

export const getSession = async (noCreate: boolean = false): Promise<string> => {
	let cookies = parseCookie(document.cookie);
	let session = cookies.session;
	if (!session) {
		if (noCreate) return '';

		await createSession({ delete: false });
		notifySessionChange();

		return await getSession(true);
	}

	return session;
};

// if (browser) {
// 	(async () => {
// 		let { firebaseAuth } = await import('./firebase');

// 		firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
// 			let cookies = parseCookie(document.cookie);
// 			let session = cookies.session;
// 			if (!session || session) {
// 				await createSession({ delete: false });
// 			}
// 		});
// 	})();
// }
