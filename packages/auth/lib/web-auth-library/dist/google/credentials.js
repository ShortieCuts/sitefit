/* SPDX-FileCopyrightText: 2022-present Kriasoft */
/* SPDX-License-Identifier: MIT */
import QuickLRU from "quick-lru";
const cache = new QuickLRU({ maxSize: 100 });
export function getCredentials(value) {
    if (typeof value === "string") {
        const cacheKey = Symbol.for(value);
        let credentials = cache.get(cacheKey);
        if (!credentials) {
            credentials = JSON.parse(value);
            cache.set(cacheKey, credentials);
        }
        return credentials;
    }
    return value;
}
