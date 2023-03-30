/* SPDX-FileCopyrightText: 2022-present Kriasoft */
/* SPDX-License-Identifier: MIT */
import { base64url } from "rfc4648";
/**
 * Converts the given JSON Web Token string into a `Jwt` object.
 */
function decode(token) {
    const segments = token.split(".");
    const dec = new TextDecoder();
    if (segments.length !== 3) {
        throw new Error();
    }
    return {
        header: JSON.parse(dec.decode(base64url.parse(segments[0], { loose: true }))),
        payload: JSON.parse(dec.decode(base64url.parse(segments[1], { loose: true }))),
        data: `${segments[0]}.${segments[1]}`,
        signature: segments[2],
    };
}
async function verify(token, options) {
    const enc = new TextEncoder();
    const jwt = typeof token === "string" ? decode(token) : token;
    const aud = jwt.payload.aud;
    if (options.audience &&
        (!aud ||
            (Array.isArray(options.audience) && !options.audience.includes(aud)) ||
            options.audience !== aud)) {
        return;
    }
    const verified = await crypto.subtle.verify(options.key.algorithm, options.key, base64url.parse(jwt.signature, { loose: true }), enc.encode(jwt.data));
    return verified ? jwt.payload : undefined;
}
export { decode, verify, };
