---
name: Cleanup job pattern
description: Architecture for the stale media upload cleanup job
---

# Stale Media Upload Cleanup — Architecture

## Structure
- `src/lib/cleanup.ts` — exports `cleanupStaleMediaUploads(): Promise<CleanupResult>` and `STALE_THRESHOLD_HOURS = 1`. Directly callable from tests.
- `src/lib/scheduler.ts` — exports `startScheduler()`. Fires cleanup 30s after startup, then every 15 minutes. Wraps in try/catch so errors don't crash the process.
- `src/index.ts` — calls `startScheduler()` inside the `app.listen()` callback after logging "Server listening".

## Status values the cleanup introduces
`media_assets.status` is a plain `text` column (not a Postgres enum), so "failed" works without a migration. Valid values after this feature: `"pending"`, `"ready"`, `"failed"`.

## Audit events emitted
- `media.upload.expired` — file missing from GCS; asset marked "failed"
- `media.upload.recovered` — file found in GCS despite no /complete call; asset marked "ready"

## Testing approach
Call `cleanupStaleMediaUploads()` directly (not via HTTP). Backdate `created_at` using `db.update(mediaAssetsTable).set({ createdAt: pastDate }).where(eq(id, assetId))` — the insert schema omits createdAt but Drizzle can update it directly. Use `afterEach` to delete all assets owned by the test user to prevent cross-test contamination.

**Why:** The cleanup function is decoupled from Express and Clerk, so it can be unit-tested without starting the server or stubbing auth. Only `fetch` (for checkObjectExists) needs mocking.
