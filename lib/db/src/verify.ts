/**
 * verify.ts — post-migrate + post-seed sanity check.
 *
 * Asserts that every expected table exists in public schema and that the two
 * seed publications (LAS and the isolation fixture) plus the two system roles
 * are present.  Exits non-zero on any failure so CI can catch a broken rebuild.
 */
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function fail(msg: string): Promise<never> {
  console.error(`VERIFY FAILED: ${msg}`);
  await pool.end();
  process.exit(1);
}

async function main() {
  // ── 1. Expected tables ────────────────────────────────────────────────────
  const expectedTables = [
    "publications",
    "publication_settings",
    "users",
    "roles",
    "user_publication_access",
    "media_assets",
    "audit_events",
    "content_items",
  ];

  const tableResult = await pool.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1)`,
    [expectedTables],
  );

  const found = new Set(tableResult.rows.map((r) => r.table_name));
  const missing = expectedTables.filter((t) => !found.has(t));
  if (missing.length) {
    await fail(`Missing tables: ${missing.join(", ")}`);
  }

  // ── 2. Migration history must have two entries ────────────────────────────
  const migrationsResult = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations`,
  );
  const migrationCount = parseInt(migrationsResult.rows[0].count, 10);
  if (migrationCount < 2) {
    await fail(
      `Expected ≥2 migration history entries, got ${migrationCount}`,
    );
  }

  // ── 3. Seed publications ──────────────────────────────────────────────────
  const pubResult = await pool.query<{ slug: string }>(
    `SELECT slug FROM publications WHERE slug = ANY($1)`,
    [["life-around-senoia", "foundation-fixture"]],
  );
  const foundSlugs = new Set(pubResult.rows.map((r) => r.slug));
  for (const slug of ["life-around-senoia", "foundation-fixture"]) {
    if (!foundSlugs.has(slug)) {
      await fail(`Seed publication missing: ${slug}`);
    }
  }

  // ── 4. Publication settings must match publications ───────────────────────
  const settingsResult = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM publication_settings ps
     JOIN publications p ON p.id = ps.publication_id
     WHERE p.slug = ANY($1)`,
    [["life-around-senoia", "foundation-fixture"]],
  );
  const settingsCount = parseInt(settingsResult.rows[0].count, 10);
  if (settingsCount < 2) {
    await fail(
      `Expected publication_settings rows for both seed publications, got ${settingsCount}`,
    );
  }

  // ── 5. System roles — must exist AND have is_system = true ───────────────
  const expectedRoleKeys = ["publication-admin", "editor"];
  const rolesResult = await pool.query<{ key: string; is_system: boolean }>(
    `SELECT key, is_system FROM roles WHERE key = ANY($1)`,
    [expectedRoleKeys],
  );
  const roleMap = new Map(rolesResult.rows.map((r) => [r.key, r.is_system]));
  for (const key of expectedRoleKeys) {
    if (!roleMap.has(key)) {
      await fail(`Seed role missing: ${key}`);
    }
    if (!roleMap.get(key)) {
      await fail(`Role "${key}" exists but is_system is not true`);
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      tables: expectedTables.length,
      migrations: migrationCount,
      publications: pubResult.rows.map((r) => r.slug),
      roles: rolesResult.rows.map((r) => r.key),
    }),
  );
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
