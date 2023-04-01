export type SocketMessage = Join | Leave | Login | Sync;

type SessionShape = {
  uid: string;
  userId: string;
  color: string;
};

type Sync = {
  type: "sync";
  sessions: SessionShape[];
};

export function isSync(message: SocketMessage): message is Sync {
  return message.type === "sync";
}

type Join = SessionShape & {
  type: "join";
};

export function isJoin(message: SocketMessage): message is Join {
  return message.type === "join";
}

type Leave = {
  type: "leave";
  uid: string;
};

export function isLeave(message: SocketMessage): message is Leave {
  return message.type === "leave";
}

type Login = {
  type: "login";
  session: string;
};

export function isLogin(message: SocketMessage): message is Login {
  return message.type === "login";
}

export namespace SocketMessage {
  export function join(uid: string, userId: string, color: string): Join {
    return {
      type: "join",
      uid,
      userId,
      color,
    };
  }

  export function leave(uid: string): Leave {
    return {
      type: "leave",
      uid,
    };
  }

  export function login(session: string): Login {
    return {
      type: "login",
      session,
    };
  }

  export function sync(sessions: SessionShape[]): Sync {
    return {
      type: "sync",
      sessions: sessions.map((s) => ({
        uid: s.uid,
        userId: s.userId,
        color: s.color,
      })),
    };
  }
}
