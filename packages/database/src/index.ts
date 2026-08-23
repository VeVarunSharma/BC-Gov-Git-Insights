import {
  DefaultAzureCredential,
  ManagedIdentityCredential,
  type TokenCredential,
} from "@azure/identity";
import { entraTokenProvider } from "@azure/postgresql-auth";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import * as schema from "./schema";

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function getDatabaseCredential(): TokenCredential {
  if (process.env.NODE_ENV === "production") {
    return new ManagedIdentityCredential({
      clientId: requireEnvironment("AZURE_CLIENT_ID"),
    });
  }
  return new DefaultAzureCredential();
}

export function createDatabasePool(): Pool {
  const credential = getDatabaseCredential();
  return new Pool({
    host: requireEnvironment("PGHOST"),
    port: Number(process.env.PGPORT ?? "5432"),
    database: requireEnvironment("PGDATABASE"),
    user: requireEnvironment("PGUSER"),
    password: entraTokenProvider(credential),
    max: Number(process.env.PGPOOL_MAX ?? "5"),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: {
      rejectUnauthorized: true,
    },
  });
}

export function createDatabase(pool = createDatabasePool()) {
  return drizzle(pool, { schema });
}

export async function migrateDatabase(pool = createDatabasePool()) {
  const database = createDatabase(pool);
  await migrate(database, {
    migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)),
  });
}

export { schema };
import { fileURLToPath } from "node:url";
