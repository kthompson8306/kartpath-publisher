/**
 * Vitest global setup — runs once before the test suite.
 *
 * Verifies the test database connection and ensures the schema is present.
 * Does NOT drop or rebuild the schema; the db:verify workflow (`pnpm rebuild-test`)
 * is responsible for schema provisioning.  Tests therefore require TEST_DATABASE_URL
 * to be set and the schema to already exist.
 */
import { afterAll } from "vitest";
import { pool } from "@workspace/db";

// Verify connectivity before tests begin and confirm the target table exists.
const { rows } = await pool.query<{ table_name: string }>(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'media_assets'`,
);
if (rows.length === 0) {
  throw new Error(
    "Table `media_assets` is missing from the test database.\n" +
      "Run `pnpm --filter @workspace/db rebuild-test` to initialise it.",
  );
}

afterAll(async () => {
  // Close the shared pool so the process exits cleanly.
  await pool.end();
});
