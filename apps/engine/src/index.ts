import {
  SET_GOOGLE_CLOUD_KEY,
  SET_FIREBASE_WEB_API_KEY,
  SET_PROJECT_ID,
  SET_DATABASE_URL,
  SET_DATABASE_HOST,
  SET_DATABASE_USER,
  SET_DATABASE_PASSWORD,
} from "secrets";

const Default = {
  async fetch(request: Request, env: Env) {
    SET_GOOGLE_CLOUD_KEY(env.GOOGLE_CLOUD_KEY);
    SET_FIREBASE_WEB_API_KEY(env.FIREBASE_WEB_API_KEY);
    SET_PROJECT_ID(env.PROJECT_ID);
    SET_DATABASE_URL(env.DATABASE_URL);
    SET_DATABASE_HOST(env.DATABASE_HOST);
    SET_DATABASE_USER(env.DATABASE_USER);
    SET_DATABASE_PASSWORD(env.DATABASE_PASSWORD);

    return await handleRequest(request, env);
  },
};

export default Default;

async function handleRequest(request: Request, env: Env) {
  let url = new URL(request.url);
  console.log("HIt WS");
  let paths = url.pathname.split("/");
  let id = env.ENGINE_INSTANCE.idFromName(paths[1]);
  let obj = env.ENGINE_INSTANCE.get(id);

  return await obj.fetch(request);
}

// Durable Object

export { EngineInstance } from "./engineInstance";
