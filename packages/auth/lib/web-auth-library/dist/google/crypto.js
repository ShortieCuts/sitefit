/* SPDX-FileCopyrightText: 2022-present Kriasoft */
/* SPDX-License-Identifier: MIT */
import { base64, base64url } from "rfc4648";
const algorithm = {
    name: "RSASSA-PKCS1-v1_5",
    hash: { name: "SHA-256" },
};
/**
 * Returns a `CryptoKey` object that you can use in the `Web Crypto API`.
 * https://developer.mozilla.org/docs/Web/API/SubtleCrypto
 *
 * @example
 *   const signingKey = await importKey(
 *     env.GOOGLE_CLOUD_CREDENTIALS.private_key,
 *     ["sign"],
 *   );
 */
function importKey(keyData, keyUsages) {
    return crypto.subtle.importKey("pkcs8", base64.parse(keyData
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replace(/\n/g, "")), algorithm, false, keyUsages);
}
/**
 * Generates a digital signature.
 */
async function sign(key, data) {
    const input = new TextEncoder().encode(data);
    const output = await self.crypto.subtle.sign(key.algorithm, key, input);
    return base64url.stringify(new Uint8Array(output), { pad: false });
}
export { sign, importKey, algorithm };
