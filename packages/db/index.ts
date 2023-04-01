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
