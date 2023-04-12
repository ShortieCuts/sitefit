import createMyModule from "../lib/dwg2dxf_module.js";

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "localhost:5173,cad-mapper.xyz",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Access-Control-Max-Age": "86400",
    };

    const formData = await request.formData();
    const file = formData.get("file");

    const fileData = await file.arrayBuffer();
    let outputBuf;

    var ModuleInit = {
      arguments: ["/t.dwg"],
      print: function (text) {
        console.log(text);
      },
      printErr: function (text) {
        console.error(text);
      },
      preRun: function () {
        let FS = ModuleInit.FS;
        var data = Buffer.from(fileData);
        var stream = FS.open("/t.dwg", "w+");
        FS.write(stream, data, 0, data.length, 0);
        FS.close(stream);
      },
      postRun: function () {
        let FS = ModuleInit.FS;
        let stream2 = FS.open("/t.dxf", "r");
        let stat = FS.stat("/t.dxf");
        var buf = new Uint8Array(stat.size);
        FS.read(stream2, buf, 0, stat.size, 0);
        FS.close(stream2);

        outputBuf = buf;
      },
    };
    await createMyModule(ModuleInit);

    const responseHeaders = new Headers();
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(outputBuf, {
      headers: responseHeaders,
    });
  },
};
