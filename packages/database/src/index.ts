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
  const host = requireEnvironment("PGHOST");
  const port = Number(process.env.PGPORT ?? "5432");
  const database = requireEnvironment("PGDATABASE");
  const user = requireEnvironment("PGUSER");
  const max = Number(process.env.PGPOOL_MAX ?? "5");

  // Local development against a containerized Postgres, which has neither an
  // Entra token endpoint nor a trusted certificate. Refused in production so
  // deployed workloads can only ever use managed identity over TLS.
  const localPassword = process.env.PGPASSWORD;
  if (localPassword && process.env.NODE_ENV !== "production") {
    return new Pool({
      host,
      port,
      database,
      user,
      password: localPassword,
      max,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: false,
    });
  }

  const credential = getDatabaseCredential();
  return new Pool({
    host,
    port,
    database,
    user,
    password: entraTokenProvider(credential),
    max,
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
