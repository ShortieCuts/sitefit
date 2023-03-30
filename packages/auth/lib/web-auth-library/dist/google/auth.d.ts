import { Credentials } from "./credentials.js";
import { type JwtPayload } from "./jwt.js";
/**
 * Retrieves an authentication token from OAuth 2.0 authorization server.
 *
 * @example
 *   const token = await getAuthToken({
 *     credentials: env.GOOGLE_CLOUD_CREDENTIALS,
 *     scope: "https://www.googleapis.com/auth/cloud-platform"
 *   );
 *   const headers = { Authorization: `Bearer ${token.accessToken}` };
 *   const res = await fetch(url, { headers });
 */
declare function getAuthToken(options: AccessTokenOptions): Promise<AccessToken>;
declare function getAuthToken(options: IdTokenOptions): Promise<IdToken>;
export declare function fetchAuthToken(credentials: Credentials, scope: string | undefined): Promise<AccessToken | IdToken>;
declare function verifyIdToken(idToken: string, options?: VerifyIdTokenOptions): Promise<JwtPayload | undefined>;
declare type AccessTokenOptions = {
    credentials: Credentials | string;
    scope?: string[] | string;
};
declare type IdTokenOptions = {
    credentials: Credentials | string;
    audience: string;
};
declare type AccessToken = {
    accessToken: string;
    type: string;
    scope: string;
    expires: number;
};
declare type IdToken = {
    idToken: string;
    audience: string;
    expires: number;
};
declare type VerifyIdTokenOptions = {
    audience?: string[] | string;
};
export { type AccessToken, type IdToken, getAuthToken, verifyIdToken };
