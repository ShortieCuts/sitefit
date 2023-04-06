import {
  isBatch,
  isCommitTransaction,
  isJoin,
  isLogin,
  isWriteGlobalProperty,
  Project,
  SocketMessage,
} from "core";

import {
  SET_GOOGLE_CLOUD_KEY,
  SET_FIREBASE_WEB_API_KEY,
  SET_PROJECT_ID,
  SET_DATABASE_URL,
  SET_DATABASE_HOST,
  SET_DATABASE_USER,
  SET_DATABASE_PASSWORD,
} from "secrets";

import { checkRequestAuth, getUserFromFirebaseId } from "auth";
import { randomNiceColorFromString } from "./color";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleErrors(request: Request, func: () => Promise<Response>) {
  try {
    return await func();
  } catch (err: any) {
    if (request.headers.get("Upgrade") == "websocket") {
      // Annoyingly, if we return an HTTP error in response to a WebSocket request, Chrome devtools
      // won't show us the response body! So... let's send a WebSocket response with an error
      // frame instead.
      let pair = new WebSocketPair();
      pair[1].accept();
      pair[1].send(JSON.stringify({ error: err.stack }));
      pair[1].close(1011, "Uncaught exception during session setup");
      return new Response(null, { status: 101, webSocket: pair[0] });
    } else {
      return new Response(err.stack, { status: 500 });
    }
  }
}

class Session {
  uid: string;
  userId: string | null;
  socket: WebSocket;
  quit: boolean = false;
  color: string = "#000000";

  constructor(socket: WebSocket, uid: string) {
    this.socket = socket;
    this.uid = uid;
    this.userId = null;
  }

  async handleLogin(msg: SocketMessage): Promise<boolean> {
    if (isLogin(msg)) {
      let res = await checkRequestAuth(msg.session);
      if (res) {
        let user = await getUserFromFirebaseId(res.uid);
        if (user) {
          this.userId = user.publicId;
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }

    return false;
  }

  kill() {
    this.quit = true;
    this.socket.close();
  }

  send(msg: SocketMessage) {
    this.socket.send(JSON.stringify(msg));
  }
}

export class EngineInstance {
  state: DurableObjectState;
  uidCounter: number = 0;
  project: Project | null;

  dirty: boolean = false;
  key: string;
  env: Env;
  saveTimer: number | null = null;
  saveNonce: number = 0;

  broken: boolean = false;

  sessions: Session[] = [];

  private queuedMessages: SocketMessage[] = [];
  private messageQueueTimeout: number | null = null;

  constructor(state: DurableObjectState, env: Env) {
    SET_GOOGLE_CLOUD_KEY(env.GOOGLE_CLOUD_KEY);
    SET_FIREBASE_WEB_API_KEY(env.FIREBASE_WEB_API_KEY);
    SET_PROJECT_ID(env.PROJECT_ID);
    SET_DATABASE_URL(env.DATABASE_URL);
    SET_DATABASE_HOST(env.DATABASE_HOST);
    SET_DATABASE_USER(env.DATABASE_USER);
    SET_DATABASE_PASSWORD(env.DATABASE_PASSWORD);

    this.env = env;
    this.state = state;
    this.project = null;

    this.key = state.id.toString();
    console.log("New", this.key);

    state.blockConcurrencyWhile(async () => {
      let vals = await env.PROJECTS.get(this.key);
      console.log("Loading", this.key, vals);
      if (vals) {
        let rawJson = await vals.text();
        let parsedVal = {};
        console.log("raw", rawJson);
        try {
          parsedVal = JSON.parse(rawJson);
          console.log("p", parsedVal);
        } catch (e) {
          this.broken = true;
          console.log("Error parsing project: ", e);
        }
        console.log("Loading", parsedVal);

        this.project = new Project(this.key);
        this.project.deserialize(parsedVal);
      } else {
        this.project = new Project(this.key);
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
      let data = JSON.stringify(this.project.serialize());
      console.log("Saving", data);
      let resp = await this.env.PROJECTS.put(this.key, data);

      console.log("Auto saved. ", resp);
      this.dirty = false;
    }
  }

  // Handle HTTP requests from clients.
  async fetch(request: Request, env: Env) {
    return await handleErrors(request, async () => {
      let url = new URL(request.url);

      switch (url.pathname.split("/")[2]) {
        case "websocket": {
          if (request.headers.get("Upgrade") != "websocket") {
            return new Response("expected websocket", { status: 400 });
          }

          let ip = request.headers.get("CF-Connecting-IP");

          let pair = new WebSocketPair();

          await this.handleSession(pair[1], ip);

          return new Response(null, { status: 101, webSocket: pair[0] });
        }

        default:
          return new Response("Not found", { status: 404 });
      }
    });
  }

  async syncAll(session: Session) {
    session.send(
      SocketMessage.sync({
        selfUid: session.uid,
        project: this.project?.serialize() ?? {},
        sessions: this.sessions
          .filter((s) => !s.quit && s.userId)
          .map((s) => ({
            color: s.color,
            userId: s.userId ?? "impossible",
            uid: s.uid,
          })),
      })
    );
  }

  async handleSession(webSocket: WebSocket, ip: string | null) {
    webSocket.accept();

    let session = new Session(webSocket, "s" + this.uidCounter++);
    this.sessions.push(session);

    // Set event handlers to receive messages.
    let loggedIn = false;
    webSocket.addEventListener("message", async (msg: MessageEvent) => {
      if (session.quit) {
        webSocket.close(1011, "WebSocket broken.");
        return;
      }

      let data: SocketMessage | null = null;
      try {
        data = JSON.parse(msg.data.toString());
      } catch (e) {
        console.log("Error parsing message: ", e);
      }

      try {
        if (data) {
          if (isLogin(data)) {
            if (await session.handleLogin(data)) {
              loggedIn = true;
              session.color = randomNiceColorFromString(
                `${session.userId}.${session.uid}`
              );
              this.syncAll(session);
              this.broadcast(
                SocketMessage.join(
                  session.uid,
                  session.userId ?? "",
                  session.color
                )
              );
            } else {
              session.kill();
            }
          } else if (isBatch(data)) {
            for (let msg of data.messages) {
              await this.handleMessage(session, msg);
            }
          } else {
            await this.handleMessage(session, data);
          }
        }
      } catch (err: any) {
        webSocket.send(JSON.stringify({ error: err.stack }));
      }
    });

    let closeOrErrorHandler = (evt: CloseEvent | ErrorEvent) => {
      session.quit = true;
      this.sessions = this.sessions.filter((member) => member !== session);
      this.broadcast(SocketMessage.leave(session.uid));
    };
    webSocket.addEventListener("close", closeOrErrorHandler);
    webSocket.addEventListener("error", closeOrErrorHandler);
  }

  async handleMessage(session: Session, data: SocketMessage): Promise<void> {
    console.log(data);
    if (this.project === null) {
      return;
    }

    if (isWriteGlobalProperty(data)) {
      if (data.key == "mapStyle") {
        if (["google-satellite", "google-simple"].includes(data.value)) {
          this.project.globalProperties.mapStyle = data.value;
          this.enqueueBroadcast(data);
          console.log("Broadcast", data);
          this.dirty = true;
          this.enqueueSave();
        }
      }
    } else if (isCommitTransaction(data)) {
      if (this.project) {
        let appliedMutations = this.project.applyTransaction(
          data.transaction,
          false
        );
        let newTransaction = this.project.createTransaction();

        for (let mutation of appliedMutations) {
          newTransaction.mutations.push(mutation);
        }
        this.enqueueBroadcast(SocketMessage.commitTransaction(newTransaction));
        this.dirty = true;
        this.enqueueSave();
      }
    }
  }

  enqueueBroadcast(message: SocketMessage) {
    this.queuedMessages.push(message);

    if (this.messageQueueTimeout) {
      clearTimeout(this.messageQueueTimeout);
    }

    this.messageQueueTimeout = setTimeout(() => {
      if (this.queuedMessages.length == 1) {
        this.broadcast(this.queuedMessages[0]);
        this.queuedMessages = [];
      } else if (this.queuedMessages.length > 1) {
        this.broadcast(SocketMessage.batch(this.queuedMessages));
        this.queuedMessages = [];
      }
    }, 1);
  }

  broadcast(message: SocketMessage) {
    let json = JSON.stringify(message);

    let dead: Session[] = [];
    this.sessions = this.sessions.filter((session) => {
      if (session.userId) {
        try {
          session.socket.send(json);
          return true;
        } catch (err) {
          session.quit = true;
          dead.push(session);
          return false;
        }
      } else {
        return true;
      }
    });

    dead.forEach((sess) => {
      this.broadcast(SocketMessage.leave(sess.uid));
    });
  }
}
