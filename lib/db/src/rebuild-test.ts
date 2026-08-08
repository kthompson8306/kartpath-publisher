/**
 * rebuild-test.ts — proves versioned migrations build the schema from zero.
 *
 * SAFETY: This script drops the entire public schema before re-applying
 * migrations.  It MUST only run against an isolated test database supplied via
 * TEST_DATABASE_URL.  It intentionally refuses to fall back to DATABASE_URL so
 * it can never destroy application data by accident.
 *
 * Steps:
 *   1. Require TEST_DATABASE_URL (exit 1 if absent)
 *   2. DROP SCHEMA public CASCADE  (wipes all tables in the test DB)
 *   3. DROP SCHEMA drizzle CASCADE (wipes migration history)
 *   4. Recreate public schema
 *   5. Run migrate  (applies 0000 + 0001 from scratch)
 *   6. Run seed     (inserts LAS, Foundation Fixture, system roles)
 *   7. Run verify   (asserts expected tables + seed rows)
 *
 * Exits 0 on full success, non-zero on any failure.
 */
import { execSync } from "node:child_process";
import pg from "pg";

const testDbUrl = process.env.TEST_DATABASE_URL;
if (!testDbUrl) {
  console.error(
    "rebuild-test: TEST_DATABASE_URL is not set.\n" +
      "This script requires a dedicated isolated test database — it must NOT\n" +
      "run against the application DATABASE_URL because it drops the schema.\n" +
      "Set TEST_DATABASE_URL to a separate empty or disposable database URL.",
  );
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: testDbUrl });

console.log("rebuild-test: wiping test schema …");
try {
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
  await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
  await pool.query("CREATE SCHEMA public");
  await pool.query("GRANT ALL ON SCHEMA public TO PUBLIC");
} finally {
  await pool.end();
}

// Forward TEST_DATABASE_URL as DATABASE_URL so migrate/seed/verify pick it up
const childEnv = { ...process.env, DATABASE_URL: testDbUrl };
const opts: Parameters<typeof execSync>[1] = {
  stdio: "inherit",
  env: childEnv,
  cwd: process.cwd(),
};

console.log("rebuild-test: running migrate …");
execSync("tsx src/migrate.ts", opts);

console.log("rebuild-test: running seed …");
execSync("tsx src/seed.ts", opts);

console.log("rebuild-test: running verify …");
execSync("tsx src/verify.ts", opts);

console.log("rebuild-test: ✓ fresh rebuild succeeded");
