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

				destroy = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
					let user = await getMe();

					if (!user.error) {
						set({
							isAnonymous: firebaseUser?.isAnonymous ?? true,
							isLoading: false,
							firebaseUser,
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
				});
			})();

		return () => {
			destroy();
		};
	}
);

export const signIn = async (email: string, password: string) => {
	let { firebaseAuth } = await import('./firebase');

	return await signInWithEmailAndPassword(firebaseAuth, email, password);
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

	return newUser;
};

export const signInWithOAuth = async (provider: string) => {
	let { firebaseAuth } = await import('./firebase');
	let providerInstance: AuthProvider = new GithubAuthProvider();
	if (provider === 'github') providerInstance = new GithubAuthProvider();
	if (provider == 'google') providerInstance = new GoogleAuthProvider();

	return await signInWithPopup(firebaseAuth, providerInstance);
};

export const signOut = async () => {
	let { firebaseAuth } = await import('./firebase');

	await createSession({ delete: true });

	await firebaseAuth.signOut();

	location.reload();
};

export const sendPasswordReset = async (email: string) => {
	let { firebaseAuth } = await import('./firebase');

	return await sendPasswordResetEmail(firebaseAuth, email);
};

export const refreshUserData = async () => {
	let { firebaseAuth } = await import('./firebase');
	let user = await getMyUserInfo();
	let firebaseUser = firebaseAuth.currentUser;

	auth.update((state) => {
		return {
			...state,
			user,
			firebaseUser
		};
	});
};

export const getSession = async (noCreate: boolean = false): Promise<string> => {
	let cookies = parseCookie(document.cookie);
	let session = cookies.session;
	if (!session) {
		if (noCreate) return '';

		await createSession({ delete: false });

		return await getSession(true);
	}

	return session;
};

if (browser) {
	(async () => {
		let { firebaseAuth } = await import('./firebase');

		firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
			let cookies = parseCookie(document.cookie);
			let session = cookies.session;
			if (!session) {
				await createSession({ delete: false });
			}
		});
	})();
}
