/// <reference types="@cloudflare/workers-types" />
/**
 * Converts the given JSON Web Token string into a `Jwt` object.
 */
declare function decode<T = JwtPayload, H = JwtHeader>(token: string): Jwt<T, H>;
declare function verify<T = JwtPayload, H = JwtHeader>(token: Jwt<T, H> | string, options: VerifyOptions): Promise<T | undefined>;
/**
 * Identifies which algorithm is used to generate the signature.
 */
interface JwtHeader {
    /** Token type */
    typ?: string;
    /** Content type*/
    cty?: string;
    /** Message authentication code algorithm */
    alg?: string;
    /** Key ID */
    kid?: string;
    /** x.509 Certificate Chain */
    x5c?: string;
    /** x.509 Certificate Chain URL */
    x5u?: string;
    /** Critical */
    crit?: string;
}
/**
 * Contains a set of claims.
 */
interface JwtPayload {
    /** Issuer */
    iss?: string;
    /** Subject */
    sub?: string;
    /** Audience */
    aud?: string;
    /** Authorized party */
    azp?: string;
    /** Expiration time */
    exp?: number;
    /** Not before */
    nbf?: number;
    /** Issued at */
    iat?: number;
    /** JWT ID */
    jti?: string;
}
/**
 * JSON Web Token (JWT)
 */
declare type Jwt<T = JwtPayload, H = JwtHeader> = {
    header: H;
    payload: T;
    data: string;
    signature: string;
};
declare type VerifyOptions = {
    key: CryptoKey;
    audience?: string[] | string;
};
export { decode, verify, type Jwt, type JwtHeader, type JwtPayload, type VerifyOptions, };
