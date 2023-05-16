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
    // try {
    SET_GOOGLE_CLOUD_KEY(env.GOOGLE_CLOUD_KEY);
    SET_FIREBASE_WEB_API_KEY(env.FIREBASE_WEB_API_KEY);
    SET_PROJECT_ID(env.PROJECT_ID);
    SET_DATABASE_URL(env.DATABASE_URL);
    SET_DATABASE_HOST(env.DATABASE_HOST);
    SET_DATABASE_USER(env.DATABASE_USER);
    SET_DATABASE_PASSWORD(env.DATABASE_PASSWORD);

    return await handleRequest(request, env);
    // } catch (e) {
    //   console.error("Error from engine request handler:", e);
    //   console.error(e.stack);
    // }
  },
};

export default Default;

async function handleRequest(request: Request, env: Env) {
  let url = new URL(request.url);
  console.log("URL 2", url);

  let paths = url.pathname.split("/");
  console.log("paths", paths);
  let id = env.ENGINE_INSTANCE.idFromName(paths[1]);
  console.log("id", id);

  let obj = env.ENGINE_INSTANCE.get(id);
  console.log("obj 3", obj);

  try {
    console.log("Doing the await");

    let awaited = await obj.fetch(request);
    console.log("objResp awaited", awaited);
    return awaited;
  } catch (e) {
    console.error("Error from engine request handler:", e);
    console.error(e.stack);
  }

  return new Response("Hello world from engine!");
}

// Durable Object

export { EngineInstance } from "./engineInstance";
