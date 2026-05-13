import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL no está definida. Revisa .env.local (basado en .env.example).",
  );
}

const globalForDb = globalThis as unknown as {
  __docentixDbClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__docentixDbClient ??
  postgres(databaseUrl, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__docentixDbClient = client;
}

export const db = drizzle(client, { schema });
export type Database = typeof db;
