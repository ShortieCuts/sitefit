const Default = {
  async fetch(request: Request, env: Env) {
    return await handleRequest(request, env);
  },
};

export default Default;

async function handleRequest(request: Request, env: Env) {
  let url = new URL(request.url);
  console.log(url.pathname);
  let paths = url.pathname.split("/");
  let id = env.ENGINE_INSTANCE.idFromName(paths[1]);
  let obj = env.ENGINE_INSTANCE.get(id);
  let subReqPath = paths.slice(2).join("/");
  console.log(subReqPath);
  let resp = await obj.fetch(request);
  let count = await resp.text();

  return new Response(count);
}

// Durable Object

export { EngineInstance } from "./engineInstance";
