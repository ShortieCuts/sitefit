import { readable } from 'svelte/store';

let watchers = new Map<string, Set<(val: any) => void>>();

function getCookie(name: string, defaultValue: any) {
	if (typeof window !== 'undefined') {
		let cookie = document.cookie;
		let start = cookie.indexOf(name + '=');
		if (start === -1) return defaultValue;
		start = start + name.length + 1;
		let end = cookie.indexOf(';', start);
		if (end === -1) end = cookie.length;
		return cookie.substring(start, end);
	} else {
		return defaultValue;
	}
}

function setCookie(name: string, value: any, days: number) {
	if (typeof window !== 'undefined') {
		let expires = '';
		if (days) {
			let date = new Date();
			date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
			expires = '; expires=' + date.toUTCString();
		}
		document.cookie = name + '=' + (value || '') + expires + '; path=/';

		let set = watchers.get(name);
		if (set) {
			set.forEach((callback) => callback(value));
		}
	}
}

function watchCookie(name: string, callback: (val: any) => void) {
	if (typeof window !== 'undefined') {
		let set = watchers.get(name);
		if (!set) {
			set = new Set();
			watchers.set(name, set);
		}
		set.add(callback);

		let cookie = document.cookie;
		let start = cookie.indexOf(name + '=');
		if (start === -1) return;
		start = start + name.length + 1;
		let end = cookie.indexOf(';', start);
		if (end === -1) end = cookie.length;
		callback(cookie.substring(start, end));
	}
}

function unwatchCookie(name: string, callback: (val: any) => void) {
	if (typeof window !== 'undefined') {
		let set = watchers.get(name);
		if (set) {
			set.delete(callback);
		}
	}
}

function generateWritableCookieStore(
	cookieName: string,
	defaultValue: any,
	writeExpirationDays = 365
) {
	let defaultVal = defaultValue;
	if (typeof window !== 'undefined') {
		defaultVal = getCookie(cookieName, defaultValue);
	}

	const { subscribe } = readable(defaultVal, (set) => {
		let callback = (val: any) => {
			set(val);
		};

		if (typeof window !== 'undefined') {
			watchCookie(cookieName, callback);

			return () => {
				unwatchCookie(cookieName, callback);
			};
		} else {
			return () => {};
		}
	});

	return {
		subscribe,
		set(val: any) {
			if (typeof window !== 'undefined') {
				setCookie(cookieName, val, writeExpirationDays);
			}
		},
		update(fn: (val: any) => any) {
			if (typeof window !== 'undefined') {
				setCookie(cookieName, fn(getCookie(cookieName, defaultVal)), writeExpirationDays);
			}
		}
	};
}

export const cookieName = generateWritableCookieStore('site_fit_name', '');
