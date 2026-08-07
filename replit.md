# KartPath Digital Publishing Platform

Multi-tenant publishing infrastructure, beginning with the Life Around Senoia local publication.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — foundation API contract
- `lib/api-client-react` and `lib/api-zod` — generated API clients and validators
- `lib/db/src/schema/platform.ts` — tenant, identity, access, media, and audit schema
- `lib/db/src/seed.ts` — LAS and tenant-isolation foundation fixtures
- `artifacts/api-server/src` — Clerk-aware API and object-storage routes
- `artifacts/kartpath-las/src` — LAS public shell, branded Clerk auth, and staff foundation

## Architecture decisions

- The schema is tenant-aware from the beginning; LAS is the only active publication workflow in the first release.
- Managed Clerk handles browser authentication with session cookies; local Postgres rows handle publication access and authorization.
- App Storage owns uploaded bytes; Postgres stores normalized object paths and media metadata.
- M0 stops before editorial CRUD, ingestion, advertising, and Publication #2 UI work.

## Product

Life Around Senoia is a place-rooted local publication. The current release establishes its editorial visual language, public publication shell, staff sign-in surface, staff access context, and platform foundation before content workflows are introduced.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after OpenAPI changes.
- Run `pnpm --filter @workspace/db run push` before seeding a fresh development database.
- Run `pnpm --filter @workspace/db run seed` to create the LAS and isolation fixtures.
- Clerk development-key warnings in the browser are expected; production keys are managed at publish time.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
