const functions = require("firebase-functions");
const Busboy = require("busboy");

const createMyModule = require("./dwg2dxf.js");

async function process(fileData) {
  let outputBuf;

  var ModuleInit = {
    INITIAL_MEMORY: 1024 * 1024 * 64,
    arguments: ["/t.dwg"],
    print: function (text) {
      console.log(text);
    },
    printErr: function (text) {
      console.error(text);
    },
    preRun: function () {
      let FS = ModuleInit.FS;
      var data = fileData;
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

  return outputBuf;
}

async function streamToBuf(stream) {
  // lets have a ReadableStream as a stream variable
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.convert = functions.https.onRequest((req, res) => {
  if (req.method !== "POST") {
    // Return a "method not allowed" error
    return res.status(405).end();
  }
  const busboy = Busboy({ headers: req.headers });

  // This object will accumulate all the fields, keyed by their name
  const fields = {};

  // This object will accumulate all the uploaded files, keyed by their name.
  const uploads = {};

  // This code will process each non-file field in the form.
  busboy.on("field", (fieldname, val) => {
    /**
     *  TODO(developer): Process submitted field values here
     */
    console.log(`Processed field ${fieldname}: ${val}.`);
    fields[fieldname] = val;
  });

  const fileWrites = [];

  // This code will process each file uploaded.
  busboy.on("file", async (fieldname, file, { filename }) => {
    // Note: os.tmpdir() points to an in-memory file system on GCF
    // Thus, any files in it must fit in the instance's memory.
    console.log(`Processed file ${filename}`);

    let buf = await streamToBuf(file);
    let outputBuf = await process(buf);
    res.end(outputBuf);
  });

  busboy.end(req.rawBody);
});
