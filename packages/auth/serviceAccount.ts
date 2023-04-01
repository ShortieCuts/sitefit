import { GET_GOOGLE_CLOUD_KEY } from "secrets";

import { getAuthToken } from "./lib/web-auth-library/dist/google/index";

export async function genToken(scope: string): Promise<string> {
  (globalThis as any).self = globalThis;
  return (
    await getAuthToken({
      credentials: GET_GOOGLE_CLOUD_KEY(),
      scope,
    })
  ).accessToken;
}
