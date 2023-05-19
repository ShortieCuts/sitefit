import {
  GlobalProjectPropertiesKey,
  Project,
  ProjectTransaction,
} from "./classes/project";

export type SocketMessage =
  | Join
  | Leave
  | Login
  | Sync
  | Batch
  | WriteGlobalProperty
  | CommitTransaction
  | SetAccessLevel
  | Refresh;

type SessionShape = {
  uid: string;
  userId: string;
  color: string;
};

type Sync = {
  type: "sync";
  sessions: SessionShape[];
  project: any;
  selfUid: string;
  broken: boolean;
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

type Batch = {
  type: "batch";
  messages: SocketMessage[];
};

export function isBatch(message: SocketMessage): message is Batch {
  return message.type === "batch";
}

type WriteGlobalProperty = {
  type: "writeGlobalProperty";
  key: GlobalProjectPropertiesKey;
  value: any;
};

export function isWriteGlobalProperty(
  message: SocketMessage
): message is WriteGlobalProperty {
  return message.type === "writeGlobalProperty";
}

type CommitTransaction = {
  type: "commitTransaction";
  transaction: ProjectTransaction;
};

export function isCommitTransaction(
  message: SocketMessage
): message is CommitTransaction {
  return message.type === "commitTransaction";
}

type SetAccessLevel = {
  type: "setAccessLevel";
  accessLevel: "READ" | "WRITE" | "COMMENT";
};

export function isSetAccessLevel(
  message: SocketMessage
): message is SetAccessLevel {
  return message.type === "setAccessLevel";
}

type Refresh = {
  type: "refresh";
  subject: "access" | "replies" | "comments";
  payload: any;
};

export function isRefresh(message: SocketMessage): message is Refresh {
  return message.type === "refresh";
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

  export function sync(a: {
    project: any;
    sessions: SessionShape[];
    selfUid: string;
    broken: boolean;
  }): Sync {
    return {
      type: "sync",
      selfUid: a.selfUid,
      project: a.project,
      broken: a.broken,
      sessions: a.sessions.map((s) => ({
        uid: s.uid,
        userId: s.userId,
        color: s.color,
      })),
    };
  }

  export function batch(messages: SocketMessage[]): Batch {
    return {
      type: "batch",
      messages,
    };
  }

  export function writeGlobalProperty(
    key: GlobalProjectPropertiesKey,
    value: any
  ): WriteGlobalProperty {
    return {
      type: "writeGlobalProperty",
      key,
      value,
    };
  }

  export function commitTransaction(
    transaction: ProjectTransaction
  ): CommitTransaction {
    return {
      type: "commitTransaction",
      transaction,
    };
  }

  export function setAccessLevel(
    accessLevel: "READ" | "WRITE" | "COMMENT"
  ): SetAccessLevel {
    return {
      type: "setAccessLevel",
      accessLevel,
    };
  }

  export function refresh(
    subject: "access" | "replies" | "comments",
    payload: any = null
  ): Refresh {
    return {
      type: "refresh",
      subject,
      payload,
    };
  }

  export type JoinType = Join;
  export type LeaveType = Leave;
  export type LoginType = Login;
  export type SyncType = Sync;
  export type BatchType = Batch;
  export type WriteGlobalPropertyType = WriteGlobalProperty;
  export type CommitTransactionType = CommitTransaction;
  export type SetAccessLevelType = SetAccessLevel;
  export type RefreshType = Refresh;
}
