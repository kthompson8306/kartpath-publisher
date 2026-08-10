---
name: api-zod content type sync
description: Adding a new editorial content type requires updating the hardcoded Zod enum in api-zod/src/generated/api.ts AND the type object in editorialContentType.ts, then restarting the API server.
---

## Rule

When adding a new value to `editorialContentTypes` in `lib/db/src/schema/editorial.ts`, you must also:

1. Edit `lib/api-zod/src/generated/api.ts` — the content type enum is hardcoded in ~11 places as `zod.enum(['featured-family', ...])`. Use `sed -i` to replace all occurrences in one shot.
2. Edit `lib/api-zod/src/generated/types/editorialContentType.ts` — add the new key to the `EditorialContentType` const object.
3. Restart the API server workflow so it rebuilds and picks up the changes.

**Why:** The api-zod generated files are checked into version control (not auto-regenerated on each build). The DB schema and the Zod validation schemas drift apart when a new type is added to the DB without updating the generated files. The API's public content endpoint returns HTTP 400 for any unrecognized content type, causing the frontend query to hard-error.

**How to apply:** Any time a new entry is added to `editorialContentTypes`, run the sed command and type file edit before restarting the server. Failing to do so causes a 400 on the public list endpoint and the frontend shows "temporarily unavailable."
