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

Media bytes belong in App Storage; Postgres stores object paths and queryable metadata. Upload URL requests are protected and should create audit events when authenticated users request media.

**Why:** Object storage is durable and avoids putting binary payloads in the relational database; auditability is required for editorial operations.

**How to apply:** Use the presigned PUT flow and persist only the normalized `/objects/...` path plus media metadata.