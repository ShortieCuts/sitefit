function objectNotFound(objectName: string): Response {
  return new Response(
    `<html><body>R2 object "<b>${objectName}</b>" not found</body></html>`,
    {
      status: 404,
      headers: {
        "content-type": "text/html; charset=UTF-8",
      },
    }
  );
}
const Default = {
  async fetch(request: Request, env: Env) {
    let auth = request.headers.get("Authorization");
    if (!auth) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (auth != "Bearer " + env.AUTH_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const objectName = url.pathname.slice(1);

    if (request.method === "GET") {
      const object = await env.CADS.get(objectName, {});

      if (object === null) {
        return objectNotFound(objectName);
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);

      const status = object.body ? 200 : 304;
      return new Response(object.body, {
        headers,
        status,
      });
    }

    if (request.method === "PUT" || request.method == "POST") {
      const object = await env.CADS.put(objectName, request.body, {
        httpMetadata: request.headers,
      });
      return new Response(null, {
        headers: {
          etag: object.httpEtag,
        },
      });
    }
    if (request.method === "DELETE") {
      await env.CADS.delete(url.pathname.slice(1));
      return new Response();
    }

    return new Response(`Unsupported method`, {
      status: 400,
    });
  },
};

export default Default;
