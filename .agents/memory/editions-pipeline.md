---
name: Editions pipeline
description: How digital_edition records power the public /editions pages — fields, API shape, and CMS workflow.
---

# Editions Pipeline

## Field mapping (content_items table)
- `title` — featured family/person name (e.g. "The Brewingtons")
- `summary` — date string (e.g. "Jul–Aug 2026") — reused for this purpose
- `details.issuu_embed_url` — Issuu embed src URL; required before publishing
- `details.description` — archive card and featured reader blurb
- `details.cover_filename` — Vite static asset filename (e.g. "las6-cover.jpg"); for future issues use object storage (coverUrl) instead
- `details.editorial_title` — optional headline overriding title in the featured reader (set for Issue 06: "Making Room at the Table")
- `status` — must be 'published' to appear publicly; API filters on this

## API endpoint: GET /publications/:slug/editions
Returns a sorted array (not a map) of `PublicEdition` objects, status='published' only.
Shape: `{ issueNum, title, editorialTitle, date, coverFilename, coverUrl, embedUrl, description }`.
Sorted by slug ascending (edition-01, edition-02, ...) so last item is always the latest.

## Public pages (public-pages.tsx)
- `usePublishedEditions()` hook replaces the old hardcoded `issues` array and `useEditionEmbeds()`.
- `editionCover(ed)` helper: prefers `coverUrl` (object storage), falls back to `image(coverFilename)` (Vite static).
- `Editions` component: featured reader = last item in array; archive grid = all items.
- `EditionReader`: finds edition by `issueNum === urlParam`; shows loading state while API fetches; 404 for unpublished/nonexistent slugs.

## CMS publish guard (staff.tsx)
`publish()` checks `item.details.issuu_embed_url` before allowing publish for digital_edition content type. Error shown inline if missing.

**Why:** Prevents an edition appearing on the public site with no flip-through embed — the empty state ("Flip-Through Coming Soon") is confusing if the issue is officially "published".

## Known gaps (proposed tasks)
- No "New Edition" button in CMS Editions tab — Issue 07+ require manual DB insert.
- Homepage edition promo block is still hardcoded to Issue 06 (separate from the archive page).
