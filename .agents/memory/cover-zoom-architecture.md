---
name: Cover zoom architecture
description: How cover_zoom is stored, passed, and rendered — picker math and public page WYSIWYG guarantee.
---

## The rule
`cover_zoom` (float, default 1.0) lives on `content_items` as a top-level column alongside `cover_focal_x/y`. Any change to the picker or public rendering must keep both sides using the same formula.

**Why:** At zoom=1 the live-area box fills the constraining dimension; at zoom>1 the box shrinks by 1/Z, exposing both horizontal and vertical overflow for focalX/focalY to pan. WYSIWYG is guaranteed only if the public page uses the same `coverScale × zoom` math.

## Picker (staff.tsx)
- `baseH = min(renderedH, renderedW / CROP_RATIO)`
- `bh = baseH / zoom`, `bw = bh × 16/9`
- `overflowX = renderedW − bw`, `overflowY = renderedH − bh`
- Box position: `bl = overflowX × focalX`, `bt = overflowY × focalY`
- Drag delta divided by the same overflow values → updates focalX/focalY

## Public page (public-pages.tsx — CoverPhoto component)
- At zoom ≤ 1.001: pure CSS `objectFit:cover; objectPosition: X% Y%` (no JS, no flash)
- At zoom > 1: after `onLoad`, read `naturalWidth/Height` and `containerRef.clientWidth`:
  - `coverScale = max(cw/iw, ch/ih)` — mirrors CSS objectFit:cover
  - `totalScale = coverScale × zoom`
  - `left = −(iw×totalScale − cw) × focalX`, `top = −(ih×totalScale − ch) × focalY`
  - Sets absolute-positioned img with computed pixel dimensions

## WYSIWYG proof
For imgRatio > 16/9: coverScale = ch/ih → public crop width = cw/(totalScale) = ih×16/(9×Z) = picker crop width ✓
For imgRatio < 16/9: coverScale = cw/iw → public crop width = iw/Z = picker crop width ✓

## Schema touch-points
- DB: `cover_zoom double precision NOT NULL DEFAULT 1` migration 0012
- Drizzle schema: `lib/db/src/schema/editorial.ts`
- api-zod: `lib/api-zod/src/generated/api.ts` — all 9 response/request objects
- api-client-react schemas: `lib/api-client-react/src/generated/api.schemas.ts` — `CreateContentItem` interface
- API routes: `serializeItem` in editorial.ts and publications.ts

## How to apply
Any future cover-rendering surface (homepage hero cards, edition covers, etc.) must use the same `coverScale × zoom` formula and NOT use CSS `transform:scale()` on top of `objectFit:cover` — those are not equivalent.
Dev DB will not auto-migrate; always apply new migrations with direct `psql ALTER TABLE` when `pnpm migrate` fails due to existing tables.
