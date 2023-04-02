import { getUserInfo } from '$lib/client/api';
import type { PublicUserInfo } from '$lib/types/user';
import { readable, writable, type Readable, type Writable } from 'svelte/store';

let userCache: Map<string, Readable<PublicUserInfo>> = new Map();

export function getUserInfoStore(userId: string): Readable<PublicUserInfo> {
	if (userCache.has(userId)) {
		return userCache.get(userId)!;
	}

	let store = writable<PublicUserInfo>({
		id: userId,
		firstName: '',
		lastName: '',
		photoURL: ''
	});

	userCache.set(userId, store);

	(async () => {
		let res = await getUserInfo(userId, {});
		if (res.error) {
			console.error(res.message);
			return;
		}

		store.set(res.data);
	})();

	return store;
}
