import { Project } from "core";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class EngineInstance {
  state: DurableObjectState;

  project: Project | null;

  dirty: boolean = false;
  key: string;
  env: Env;
  saveTimer: number | null = null;
  saveNonce: number = 0;

  broken: boolean = false;

  constructor(state: DurableObjectState, env: Env) {
    this.env = env;
    this.state = state;
    this.project = null;

    this.key = state.id.name ?? "unknown";

    state.blockConcurrencyWhile(async () => {
      let vals = await env.PROJECTS.get(this.key);
      if (vals) {
        let rawJson = await vals.text();
        let parsedVal = {};
        try {
          parsedVal = JSON.parse(rawJson);
        } catch (e) {
          this.broken = true;
          console.log("Error parsing project: ", e);
        }

        this.project = new Project(this.key);
        this.project.deserialize(parsedVal);
      }
    });
  }

  async enqueueSave() {
    let nonce = ++this.saveNonce;
    await sleep(1000);
    if (nonce !== this.saveNonce) {
      return;
    }

    await this.save();
  }

  async save() {
    console.log("Auto saving...");
    if (this.dirty && !this.broken && this.project) {
      let resp = await this.env.PROJECTS.put(
        this.key,
        JSON.stringify(this.project.serialize())
      );

      console.log("Auto saved. ", resp);
      this.dirty = false;
    }
  }

  // Handle HTTP requests from clients.
  async fetch(request: Request, env: Env) {
    // Apply requested action.
    console.log(await this.env.PROJECTS.get("test.txt"));

    let url = new URL(request.url);

    // Durable Object storage is automatically cached in-memory, so reading the
    // same key every request is fast. (That said, you could also store the
    // value in a class member if you prefer.)
    switch (url.pathname.split("/")[2]) {
      case "increment":
        for (let i = 0; i < this.value.length; i++) {
          this.value[i] += 1;
        }
        this.dirty = true;
        this.enqueueSave();
        break;
      case "decrement":
        for (let i = 0; i < this.value.length; i++) {
          this.value[i] -= 1;
        }
        this.dirty = true;
        this.enqueueSave();
        break;
      case "":
        // Just serve the current value.
        break;
      default:
        return new Response("Not found", { status: 404 });
    }

    // We don't have to worry about a concurrent request having modified the
    // value in storage because "input gates" will automatically protect against
    // unwanted concurrency. So, read-modify-write is safe. For more details,
    // see: https://blog.cloudflare.com/durable-objects-easy-fast-correct-choose-three/
    // await this.state.storage.put("value", value);

    return new Response(
      this.value
        .slice(0, 1000)
        .map((v) => v.toString())
        .join(",")
    );
  }
}
