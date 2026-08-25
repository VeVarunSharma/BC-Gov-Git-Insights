import { createDatabasePool, migrateDatabase } from "@git-insights/database";

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function quoteIdentifier(value: string): string {
  if (!/^[A-Za-z0-9_.-]{1,128}$/.test(value)) {
    throw new Error("Database identifier contains unsupported characters.");
  }
  return `"${value.replaceAll('"', '""')}"`;
}

interface PgaadauthPrincipal {
  rolname: string;
  objectid: string;
}

/**
 * The pgaadauth extension is installed only in the server's maintenance
 * database, not in application databases created afterwards, so its principal
 * functions must be called against `postgres`. The grants that follow still run
 * against the application database.
 */
async function ensureWebPrincipal(
  webRoleName: string,
  webObjectId: string,
): Promise<string> {
  const maintenancePool = createDatabasePool("postgres");

  try {
    const available = await maintenancePool.query(
      "select 1 from pg_proc where proname = 'pgaadauth_create_principal_with_oid'",
    );
    if (available.rowCount === 0) {
      throw new Error(
        "pgaadauth_create_principal_with_oid is unavailable in the maintenance database.",
      );
    }

    const principals = await maintenancePool.query<PgaadauthPrincipal>(
      "select rolname, objectid from pg_catalog.pgaadauth_list_principals(false) where objectid = $1",
      [webObjectId],
    );
    if (principals.rowCount === 0) {
      await maintenancePool.query(
        "select * from pg_catalog.pgaadauth_create_principal_with_oid($1, $2, 'service', false, false)",
        [webRoleName, webObjectId],
      );
      return "created";
    }
    if (principals.rows[0]?.rolname !== webRoleName) {
      throw new Error(
        `Web identity is already mapped to PostgreSQL role ${principals.rows[0]?.rolname}.`,
      );
    }
    return "already-present";
  } finally {
    await maintenancePool.end();
  }
}

async function main(): Promise<void> {
  const pool = createDatabasePool();
  const webRoleName = requiredEnvironment("WEB_IDENTITY_NAME");
  const webObjectId = requiredEnvironment("WEB_IDENTITY_OBJECT_ID");
  const databaseName = requiredEnvironment("PGDATABASE");

  try {
    await migrateDatabase(pool);

    const principalState = await ensureWebPrincipal(webRoleName, webObjectId);

    const quotedRole = quoteIdentifier(webRoleName);
    const quotedDatabase = quoteIdentifier(databaseName);
    await pool.query(
      `grant connect on database ${quotedDatabase} to ${quotedRole}`,
    );
    await pool.query(`grant usage on schema public to ${quotedRole}`);
    await pool.query(
      `grant select on all tables in schema public to ${quotedRole}`,
    );
    await pool.query(
      `alter default privileges in schema public grant select on tables to ${quotedRole}`,
    );

    console.log(
      JSON.stringify({
        event: "database-bootstrap-completed",
        webRoleName,
        principalState,
      }),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: "database-bootstrap-failed",
      message: error instanceof Error ? error.message : "Unknown error",
    }),
  );
  process.exitCode = 1;
});
