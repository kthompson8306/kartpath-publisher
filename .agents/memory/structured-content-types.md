---
name: Structured content types
description: How recipe, crooks-corner, and lifestyle-column store and render structured data (arrays, subsections).
---

# Structured content types (M3)

Three new content types were added in Task #13. The `content_type` column is free-text so no DB migration was needed — new types just work.

## Storage pattern
`details` is `jsonb` typed as `Record<string, string>`. Arrays are serialized as JSON strings within string values:
- `recipe`: `details.ingredients = JSON.stringify(string[])`, `details.steps = JSON.stringify(string[])`, `details.issue`, `details.servings`
- `crooks-corner`: `details.timeline = JSON.stringify({year, event}[])`, `details.issue`
- `lifestyle-column`: `details.subsection = "secret-sauce" | "around-town"`, `details.issue`

Public pages parse with `JSON.parse(item.details?.ingredients ?? '[]')` wrapped in try/catch.

## CMS editor pattern
`staff.tsx` uses an IIFE in JSX (`{(() => { ... })()}`) that returns a different form block per `form.contentType`. Inline update helpers (updateIngredient, updateStep, updateTimeline, etc.) are defined inside the IIFE to avoid prop-drilling. The existing `detailsText` JSON textarea is preserved for the 6 generic types.

`FormState` was extended with: `issue`, `subsection`, `servings`, `ingredients: string[]`, `steps: string[]`, `timeline: {year, event}[]`. EMPTY_FORM initializes them to safe defaults. The `useEffect` that loads a saved item populates these from `item.details` based on content type.

## Critical: codegen + API server restart
After adding types to the OpenAPI spec `EditorialContentType` enum, you must:
1. Run `pnpm --filter @workspace/api-spec run codegen`
2. Restart the API Server workflow

**Why:** The API server validates query params against the zod enum. If the server built before codegen ran, the new content types return 400 on the public `/content-items` endpoint.

## Nav
`public-pages.tsx` nav array includes `["Crook's Corner", '/crooks-corner']` after Lifestyle. The `/crooks-corner` route is registered in `App.tsx` and exports `CrooksCorner` from `public-pages.tsx`.

## Seed scripts
- `lib/db/src/seed-lifestyle-content.ts` — inserts 5 draft items (idempotent via `onConflictDoNothing`)
- `lib/db/src/publish-lifestyle-content.ts` — publishes those 5 items by slug
