import type { DB } from "./db/types";

import { Kysely, SelectQueryBuilder } from "kysely";
import { PlanetScaleDialect } from "kysely-planetscale";
import {
  GET_DATABASE_HOST,
  GET_DATABASE_PASSWORD,
  GET_DATABASE_USER,
} from "secrets";

let cachedDb: Kysely<DB> | null = null;

export function db() {
  if (cachedDb) return cachedDb;

  cachedDb = new Kysely<DB>({
    dialect: new PlanetScaleDialect({
      host: GET_DATABASE_HOST(),
      username: GET_DATABASE_USER(),
      password: GET_DATABASE_PASSWORD(),
    }),
  });

  return cachedDb;
}

export type SelectQueryBuilderDB = SelectQueryBuilder<DB, keyof DB, {}>;

const AUTH_TOKEN = "44bc8e68-8f9c-4ba1-ac3a-e3876627d107";
const FS_WORKER = "https://filesystem.cad-mapper.workers.dev";

export function fs() {
  return {
    async get(path: string) {
      return await fetch(`${FS_WORKER}/${path}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
      });
    },

    async put(path: string, body: string) {
      return await fetch(`${FS_WORKER}/${path}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        body,
      });
    },

    async delete(path: string) {
      return await fetch(`${FS_WORKER}/${path}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
      });
    },
  };
}
