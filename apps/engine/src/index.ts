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

  let paths = url.pathname.split("/");
  if (paths[1] == "copy") {
    // This secret should be set in the environment
    if (request.headers.get("x-auth") != "Fshegstds2$@!@%!Q-fshsges") {
      return new Response("Unauthorized", { status: 401 });
    }

    let id = env.ENGINE_INSTANCE.idFromName(paths[2]);
    let id2 = env.ENGINE_INSTANCE.idFromName(paths[3]);
    let source = await env.PROJECTS.get(id.toString());
    if (!source) {
      return new Response("Source project not found", { status: 404 });
    }
    let rawText = await source.text();
    let dest = await env.PROJECTS.get(id2.toString());
    if (dest) {
      return new Response("Destination project already exists", {
        status: 409,
      });
    }

    await env.PROJECTS.put(id2.toString(), rawText);

    return new Response("OK");
  }

  let id = env.ENGINE_INSTANCE.idFromName(paths[1]);

  let obj = env.ENGINE_INSTANCE.get(id);

  try {
    let awaited = await obj.fetch(request);

    return awaited;
  } catch (e) {
    console.error("Error from engine request handler:", e);
    console.error(e.stack);
  }

  return new Response("Unhandled request");
}

// Durable Object

export { EngineInstance } from "./engineInstance";
