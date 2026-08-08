import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const migrationTag = "0000_salty_gunslinger";
const migrationWhen = 1786148793365;
const migrationPath = path.resolve(
  process.cwd(),
  "drizzle",
  `${migrationTag}.sql`,
);
const requiredTables = [
  "publications",
  "publication_settings",
  "users",
  "roles",
  "user_publication_access",
  "media_assets",
  "audit_events",
];

const migrationSql = await readFile(migrationPath);
const migrationHash = createHash("sha256").update(migrationSql).digest("hex");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const missing = await pool.query(
    `SELECT table_name
     FROM (VALUES ${requiredTables.map((_, index) => `($${index + 1})`).join(", ")}) AS expected(table_name)
     WHERE NOT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = expected.table_name
     )`,
    requiredTables,
  );
  if (missing.rowCount) {
    throw new Error(
      `Cannot baseline: missing foundation tables ${missing.rows
        .map((row) => row.table_name)
        .join(", ")}`,
    );
  }

  await pool.query("CREATE SCHEMA IF NOT EXISTS drizzle");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
  const existing = await pool.query(
    "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1",
  );
  if (!existing.rowCount) {
    await pool.query(
      "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
      [migrationHash, migrationWhen],
    );
    console.log(
      JSON.stringify({ baselined: true, migrationTag, migrationHash }),
    );
  } else {
    console.log(
      JSON.stringify({
        baselined: false,
        reason: "migration history already exists",
        migrationTag,
      }),
    );
  }
} finally {
  await pool.end();
}