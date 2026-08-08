---
name: KartPath foundation
description: Durable M0 platform decisions for the multi-tenant KartPath publishing system.
---

The platform foundation is tenant-aware from the first schema: publications own settings, user access, media metadata, and audit events. Life Around Senoia is the first seeded publication; a separate foundation fixture exists for isolation checks.

**Why:** KartPath will support multiple publications, but the first release is intentionally LAS-only manual publishing. Keeping publication ownership in every foundation query prevents a later single-tenant rewrite.

**How to apply:** Any M1+ content, media, or editorial route must require a publication context and resolve access through `user_publication_access`; never use an unscoped global content query.

Browser authentication uses Clerk session cookies through the managed Clerk React/Express integrations. Web clients must not add bearer-token handling; protected API routes bridge the Clerk subject to a local `users` row and publication access.

**Why:** The managed Clerk setup is the canonical Replit path and browser cookies avoid duplicating session transport logic.

**How to apply:** Keep `/sign-in/*?` and `/sign-up/*?` as dedicated Clerk routes, keep the Clerk proxy/middleware ordering intact, and record application authorization in Postgres rather than Clerk metadata.

The API's Express 5 route-facing authorization middleware must expose exactly `(req, res, next)`; permission-specific state belongs in an internal helper. For this managed Clerk setup, server requests are verified through the backend client's `authenticateRequest` with a Web `Request`, then the verified subject is bridged into the local authorization guard.

**Why:** Express 5 treats four-argument functions as error handlers, and the Express adapter's request conversion did not preserve the bearer session in this runtime.

**How to apply:** Keep authentication verification separate from local staff approval. Never treat a valid Clerk session as publication access; resolve the verified subject through the local `users` and `user_publication_access` records.

Media bytes belong in App Storage; Postgres stores object paths and queryable metadata. Upload URL requests are protected and should create audit events when authenticated users request media.

**Why:** Object storage is durable and avoids putting binary payloads in the relational database; auditability is required for editorial operations.

**How to apply:** Use the presigned PUT flow and persist only the normalized `/objects/...` path plus media metadata.

Media upload requests require an explicit publication scope and authorize that exact publication before issuing a storage URL or writing metadata/audit rows; they must not fall back to the user's first publication access.

**Why:** A real LAS admin request carrying the foundation-fixture publication ID returned a presigned URL and created LAS-owned media/audit rows, proving that ignoring the requested tenant can turn a cross-publication attempt into a misleading success.

**How to apply:** Before issuing an upload URL or inserting media metadata, validate the requested publication against the authenticated user's access and reject missing or unauthorized publication context; never use first-access fallback for tenant-scoped mutations.