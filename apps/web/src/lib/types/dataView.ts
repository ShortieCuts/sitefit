import { z } from "zod";
export function deserializeDates(obj: any) {
  const isoDateRegex =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
  for (let key in obj) {
    if (typeof obj[key] === "string") {
      if (isoDateRegex.test(obj[key])) {
        obj[key] = new Date(obj[key]);
      }
    } else if (typeof obj[key] === "object") {
      deserializeDates(obj[key]);
    }
  }
}

export type APIDataView<T> = {
  items: T[];
  pageSize: number;
  page: number;
  nextPage: number | null;
  totalPages: number;

  endpoint: string;
  payload: object;

  status: 200 | 400 | 401 | 403 | 404 | 500 | number;
  error: string | null;
};

type fetchSignature = typeof fetch;

export async function fetchDataView<T>(
  url: string,
  body: object = {},
  fetchFn: fetchSignature = fetch
): Promise<APIDataView<T>> {
  const resp = await fetchFn(url, {
    credentials: "include",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    return {
      items: [],
      pageSize: 0,
      page: 0,
      nextPage: null,
      endpoint: url,
      payload: body,
      error: resp.statusText,
      status: resp.status,
      totalPages: 0,
    };
  }

  const data = (await resp.json()) as APIDataView<T>;

  if (!data) {
    return {
      items: [],
      pageSize: 0,
      page: 0,
      nextPage: null,
      endpoint: url,
      payload: body,
      error: (data as any).error,
      status: 400,
      totalPages: 0,
    };
  }

  for (let item of data.items) {
    deserializeDates(item);
  }

  return data;
}

export function emptyDataView<T>(): APIDataView<T> {
  return {
    items: [],
    pageSize: 0,
    page: 0,
    nextPage: null,
    endpoint: "",
    payload: {},
    error: null,
    status: 200,
    totalPages: 0,
  };
}

type APIDataViewInputShape = {
  pageSize?: number | undefined;
  page?: number | undefined;
};

export const APIDataViewInput = z.object({
  pageSize: z.number().min(1).max(100).default(10),
  page: z.number().min(0).default(0),
});

type PrismaCollection<T, A, AA> = {
  findMany: (args: A) => Promise<T[]>;
  aggregate: (args: any) => Promise<any>;
};

export async function executeDataViewQuery<T, P extends T, A, V, AA>(
  endpoint: string,
  payload: object,
  collection: PrismaCollection<T, A, AA>,
  query: A,
  input: APIDataViewInputShape,
  transformer: (item: P) => V = (item) => item as unknown as V
): Promise<APIDataView<V>> {
  input.page = input.page ?? 0;
  input.pageSize = input.pageSize ?? 10;
  let resp = await collection.findMany({
    ...query,
    take: input.pageSize + 1,
    skip: input.page * input.pageSize,
  });

  let nextPage: number | null = null;

  if (resp.length > input.pageSize) {
    nextPage = input.page + 1;
    resp.pop();
  }

  let count: { _count: number } = await collection.aggregate({
    where: (query as any).where ?? {},
    _count: true,
  });

  let totalPages = Math.ceil(count._count / input.pageSize);

  return {
    items: resp.map(transformer as any),
    pageSize: input.pageSize,
    page: input.page,
    nextPage,
    totalPages,
    endpoint,
    payload,
    error: null,
    status: 200,
  };
}
