/// <reference types="@cloudflare/workers-types" />
declare const algorithm: SubtleCryptoImportKeyAlgorithm;
declare type KeyUsage = "encrypt" | "decrypt" | "sign" | "verify" | "deriveKey" | "deriveBits" | "wrapKey" | "unwrapKey";
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
declare function importKey(keyData: string, keyUsages: KeyUsage[]): Promise<CryptoKey>;
/**
 * Generates a digital signature.
 */
declare function sign(key: CryptoKey, data: string): Promise<string>;
export { sign, importKey, KeyUsage, algorithm };
