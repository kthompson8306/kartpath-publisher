---
name: Business listing tier system
description: Architecture for Standard/Premium business listing tiers — DB columns, API schema changes, CMS editor gates, and public directory rendering.
---

## Rule
`listing_tier` and `business_description` are **top-level DB columns**, not JSONB details fields.

**Why:** They need to be indexed/sorted in SQL (premium-first ordering) and referenced across response schemas. JSONB details are for display strings only.

## How to apply
- Migration: `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS listing_tier text NOT NULL DEFAULT 'standard'; ALTER TABLE content_items ADD COLUMN IF NOT EXISTS business_description text;`
- DB schema: `listingTier: text("listing_tier").notNull().default("standard")` and `businessDescription: text("business_description")`
- Both are optional in all Zod request/response schemas (`zod.string().optional()` / `zod.string().nullable().optional()`)

## summary/body relaxed for business-listing
`summary` and `body` in `CreateContentItemBody`/`UpdateContentItemBody` changed from `.min(1)` to plain `zod.string()` (no min) so business-listings can send empty strings for these fields.

**Why:** Business listings have no Standfirst or Story Body fields in the editor. Sending `summary: ''` and `body: ''` must not be rejected by the API.

The `bodyForSave` validation in staff.tsx excludes both `digital_edition` AND `business-listing` from the summary-required check.

## Dev DB migration pattern
Drizzle's `migrate()` re-runs ALL migrations from scratch and fails when tables already exist. For the live dev DB, apply new migration SQL directly:
```js
pool.query(`ALTER TABLE content_items ADD COLUMN IF NOT EXISTS ...`)
```
The `pnpm rebuild-test` command is for the test DB only and works cleanly because it wipes first.

## CMS editor gating
- Standfirst, Pull Quote, Story Body: wrapped in `{form.contentType !== 'business-listing' && (...)}` — hidden for business listings
- Cover photo / Gallery: also hidden for Standard tier (`form.contentType !== 'business-listing' || form.listingTier === 'premium'`)
- Premium section (business description + word counter): inside `{form.listingTier === 'premium' && (...)}` block within the business-listing field block

## Word counter colour logic
- 0 words: muted/grey
- < 150: grey (a bit short)
- 150–250: pine/green (sweet spot)
- > 250: honey/amber (too long)

## Public directory rendering
Premium listings sorted first via `.sort()` before `.map()`. Premium cards get:
- `.biz-card--premium` class (green top border, subtle gradient background)
- `.biz-logo-wrap` with negative margins to bleed logo image full-width of card
- `★ Premium` badge inline after the category span
- `businessDescription` shown in `.biz-desc` (5-line clamp)

Standard cards render as before (compact contact card, no image, no description).
