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

async function main(): Promise<void> {
  const pool = createDatabasePool();
  const webRoleName = requiredEnvironment("WEB_IDENTITY_NAME");
  const webObjectId = requiredEnvironment("WEB_IDENTITY_OBJECT_ID");
  const databaseName = requiredEnvironment("PGDATABASE");

  try {
    await migrateDatabase(pool);

    const principals = await pool.query<{
      objectid: string;
      rolename: string;
    }>(
      "select objectid, rolename from pg_catalog.pgaadauth_list_principals(false) where objectid = $1",
      [webObjectId],
    );
    if (principals.rowCount === 0) {
      await pool.query(
        "select * from pg_catalog.pgaadauth_create_principal_with_oid($1, $2, 'service', false, false)",
        [webRoleName, webObjectId],
      );
    } else if (principals.rows[0]?.rolename !== webRoleName) {
      throw new Error(
        `Web identity is already mapped to PostgreSQL role ${principals.rows[0]?.rolename}.`,
      );
    }

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
