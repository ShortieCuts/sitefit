import { GOOGLE_CLOUD_KEY } from "$env/static/private";

import { getAuthToken } from "./lib/web-auth-library/dist/google/index";

export async function genToken(scope: string): Promise<string> {
  (globalThis as any).self = globalThis;
  return (
    await getAuthToken({
      credentials: GOOGLE_CLOUD_KEY,
      scope,
    })
  ).accessToken;
}
