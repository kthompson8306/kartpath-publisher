---
name: Drizzle migration discipline
description: How schema changes must be paired with migration files for the test DB to stay in sync.
---

The test DB (`rebuild-test`) is rebuilt from scratch using the migration files in `lib/db/drizzle/` via `drizzle/migrator`. Editing `lib/db/src/schema/*.ts` alone is not enough — the test DB will fail with "column does not exist".

**Rule:** Every schema change (add column, drop column, rename) requires both:
1. An edit to the appropriate `lib/db/src/schema/*.ts` file.
2. A new numbered SQL file in `lib/db/drizzle/` (e.g. `0005_cover_focal_point.sql`).
3. A new entry appended to `lib/db/drizzle/meta/_journal.json` with the matching `idx`, `tag`, and current `when` timestamp.

**Why:** `rebuild-test` runs `tsx src/migrate.ts` which calls `drizzle-orm/node-postgres/migrator` against the `drizzle/` folder. It does not do schema introspection — it only replays the SQL migration files in journal order. The production DB gets changes via direct SQL (e.g. `psql $DATABASE_URL -c "ALTER TABLE ..."`), but the test DB only gets what's in the migration files.

**How to apply:** When adding any column, write the journal entry using Python to read/modify the JSON rather than editing it by hand (avoids formatting drift). Use `IF NOT EXISTS` / `DROP COLUMN IF EXISTS` in migration SQL so reruns are idempotent where possible.
