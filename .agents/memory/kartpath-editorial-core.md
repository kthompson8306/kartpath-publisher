---
name: KartPath editorial core
description: Durable M1 decisions for publication-scoped manual editorial content management.
---

M1 uses one publication-owned content-item model for the six LAS editorial lanes: featured family, nonprofit spotlight, young achiever, pet of the month, business listing, and event. Items carry constrained content type, draft/published status, slug, editorial copy, string-valued structured details, optional cover media, and author/update provenance.

**Why:** The six lanes share the same editorial lifecycle and tenant boundary; one audited model keeps the first manual CMS consistent without prematurely creating six divergent tables.

**How to apply:** Keep every editorial list/read/create/update/publish/delete request explicitly publication-scoped. Resolve the exact user/publication access row before querying or mutating; never use first-access fallback.

Publication-admin access is considered sufficient for editorial writes through `publication:write`; editor access uses `content:write`. Editorial reads require `publication:read`, `content:write`, or `publication:write`.

**Why:** Existing M0 publication-admin rows predate M1 and intentionally contain publication/media permissions only. Reusing the existing admin capability avoids silently changing access data while preserving an explicit server-side permission decision.

**How to apply:** Preserve this permission mapping unless roles are deliberately redesigned; audit all editorial creates, updates, publishes, unpublishes, and deletes with the publication and content item identifiers.

The generated API Zod barrel requires a post-generation normalization step because Orval emits duplicate path-parameter type names into runtime and type outputs.

**Why:** Wildcard re-exports fail TypeScript when generated runtime schemas and generated path-parameter types share names.

**How to apply:** Keep the codegen script running the barrel-fix step after Orval; do not hand-edit generated API files as a one-off.