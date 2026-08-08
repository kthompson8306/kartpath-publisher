---
name: Editorial route schemas
description: Body schema quirks for editorial routes and engagement endpoints that affect integration tests and form wiring
---

# Editorial Route Body Schema Quirks

## UpdateContentItemBody (PATCH) — all fields required, including coverMediaId
`UpdateContentItemBody` is a full-replace schema, NOT a partial PATCH:
- `publicationId`, `contentType`, `slug`, `title`, `summary`, `body`, `details` — all required
- `coverMediaId: zod.string().nullable()` — required key, but value can be null. Must pass `coverMediaId: null` explicitly; omitting the key fails Zod validation.

**Why:** The OpenAPI spec defines the PATCH body as a complete item shape. Integration tests that send only `{ publicationId, title }` receive 400 (body parse failure) before reaching the auth check.

**How to apply:** When writing tests for the PATCH route, send a complete valid body so schema validation passes and the auth/logic layer fires.

## PublishContentItemBody — requires status field
`PublishContentItemBody` requires both `publicationId` (UUID regex) and `status: "draft" | "published"`. Tests that send only `publicationId` receive 400 before the auth check.

## ListContentItemsResponse — plain array, not { items: [...] }
`GET /api/editorial/content-items` returns a plain array of content items, not a wrapped object. Test with `Array.isArray(res.body)`.

## OpenAPI format: email is not supported
Orval generates `zod.string().email()` for `format: email`, but this does not exist in the installed Zod v3 build (it's a Zod v4 method). Use `type: string` with `minLength: 3` instead when you need email fields in the OpenAPI spec.

## Engagement endpoint mutations (orval-generated hook signatures)
- `useSubscribeToPublication` → `mutate({ slug, data: { email } })`
- `useSubmitNomination` → `mutate({ slug, data: { nominatorName, nominatorEmail, category, story } })`
- `useListNominations` → `useListNominations({ publicationId })` (query, not mutation)

Orval uses `data` as the body key (not the schema name) for all POST/PATCH mutations.
