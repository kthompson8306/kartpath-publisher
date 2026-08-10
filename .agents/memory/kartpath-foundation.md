---
name: KartPath foundation
description: Platform boundaries, DB IDs, and key runtime facts for the Life Around Senoia project
---

## Platform
- Managed Clerk for auth
- Tenant-scoped Postgres tables (pub per row, never cross-pub joins)
- App Storage object paths as storage boundary (sidecar at http://127.0.0.1:1106)

## Production DB IDs
- Publication ID: `5b418195-3aa3-4771-a89b-9fd4329b6c1d`
- Staff user ID: `6d2b2807-af9b-41c4-9a1b-1e1e2851f76d`

## Migration history (lib/db/drizzle/)
- 0000: baseline schema
- 0001: editorial additions
- 0002: staff invites
- 0003: newsletter subscribers + nominations
- 0004: alt_text column on media_assets

**Why:** The meta/ directory only has 0000 and 0001 snapshots; drizzle-kit generate will fail. Write new migration SQL files by hand and add them to meta/_journal.json manually.

## API server runtime
- Compiles to dist/index.mjs at startup (esbuild bundle via build.mjs)
- Must restart workflow after schema or route changes — no hot-reload
- publications.ts has its OWN local serializeItem — kept separate from editorial.ts serializeItem; both must be updated when adding fields to the API response
