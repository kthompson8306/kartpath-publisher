---
name: KartPath public-site asset delivery and M2 bridge
description: Preview-safe media delivery and the verified M2 publish-to-public bridge architecture.
---

## Asset delivery

Bundling editorial images through the frontend build (Vite import.meta.glob) is more reliable than referencing files from a public directory when the Replit preview proxy uses an SPA fallback for unmatched paths. Keep original public copies as source assets but use Vite-managed URLs in rendered components.

**Why:** The path-routed preview can return the HTML shell with a 200 status for a missing image URL, creating broken images despite apparently successful curl checks.

**How to apply:** For future public-site media in this artifact, import or bundle through Vite and verify the rendered preview, not only HTTP status codes.

## M2 publish-to-public bridge (verified 2026-08-08)

**Architecture:** Unauthenticated `GET /api/publications/:slug/content-items` resolves the publication by slug, filters by that publication's ID and `status = published`, optionally filters by contentType. All six editorial types are wired on the public frontend to this endpoint. Static reference arrays were emptied.

**Verified:** Full draft → publish → public appearance → unpublish → disappear → delete → audit trail cycle was confirmed with a real authenticated staff account (kevin@kartpathmedia.com, publication-admin on life-around-senoia). Audit events created/published/unpublished/deleted all recorded correctly.

**Isolation confirmed:** `foundation-fixture` slug returns `[]` through LAS endpoint. Unknown slugs return 404.

**Why unauthenticated public endpoint is safe:** The route performs publication lookup by slug (not by caller identity), enforces `status = published` server-side, and is completely separate from the authenticated staff editorial routes.

**How to apply:** Any future content type added to the CMS must also be wired into the corresponding public page query with the correct `contentType` filter. Do not add static fallback arrays — they bypass the published-only filter.

## Remaining M2 gaps (acknowledged, not blocking)

- Digital editions reader (no CMS-driven content yet)
- Newsletter/nomination persistence
- These were explicitly out of scope for the M2 bridge milestone.
