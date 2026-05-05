# Workspace

## GitHub Repository
- **URL**: https://github.com/st3v0o/gps-video-capture
- **Remote**: `origin` → `https://github.com/st3v0o/gps-video-capture.git`
- **Auth**: `GITHUB_PERSONAL_ACCESS_TOKEN` secret (stored in Replit env vars)
- To push future changes: `git push origin master`

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   ├── geospector-portal/  # Geospector web portal (React + Vite, at /geospector-portal/)
│   ├── gps-video-capture/  # Geospector iOS app (Expo SDK 54)
│   └── mach7-website/      # MACH 7 Technologies marketing site (Astro, at /mach7/)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health`; `src/routes/portal.ts` exposes all Geospector Portal endpoints under `/api/portal/`
- Portal API: sessions CRUD, frames, route GeoJSON, share token lookup, import from JSON/GPX, mock seed; Atlas submit (POST /import/session-json — returns claimToken once); accountless delete (DELETE /sessions/:id?token=claimToken)
- Geo helpers: `src/lib/geo.ts` — Haversine distance, GeoJSON LineString builder
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `artifacts/gps-video-capture` (`@workspace/gps-video-capture`)

Geospector iOS app built with Expo SDK 54. Key contexts:

- `SettingsContext` — frame capture settings, persisted to AsyncStorage at `@gps_capture_settings`
- `RecordingContext` — live GPS capture, log entries (`LogEntry`), session tracking
- `StorageConfigContext` — Supabase / webhook cloud storage connection
- `PortalConfigContext` — Geospector Portal URL (default from `EXPO_PUBLIC_PORTAL_URL` env var, user-overridable via `@portal_url` in AsyncStorage) + published session ID tracking (`@portal_published_ids`) + Atlas submission tracking (`@atlas_submissions`). Exposes `publishSession`, `atlasSubmissions`, and `removeFromAtlas`.
  - `publishSession(sessionId, entries, jobName)` — POSTs to `/api/portal/import/session-json`. On success, stores `{ atlasId, claimToken }` to `@atlas_submissions` keyed by sessionId.
  - `removeFromAtlas(sessionId)` — DELETEs `/api/portal/sessions/:atlasId?token=<claimToken>` and clears from both `@atlas_submissions` and `@portal_published_ids`.

Log tab (`app/(tabs)/log.tsx`) features:
- Per-session **Publish** button in each `SessionHeader` — visible when `portalUrl` is set and session not yet published
- **Published** badge on already-published sessions
- **Atlas** badge (blue, tappable) on sessions submitted to Atlas — tapping shows a confirmation alert to remove from Atlas
- **Bulk Select & Publish** mode with time-period chips (Today / This Week / This Month / This Year) and a sticky confirm button

ExportModal (`components/ExportModal.tsx`) features:
- **Submit to Geospector Atlas** card — first option, blue globe icon, submits all sessions and shows inline success/error feedback

Settings screen (`app/(tabs)/settings.tsx`) features a **GEOSPECTOR PORTAL** section with a Portal URL text input.

### `artifacts/geospector-portal` (`@workspace/geospector-portal`)

Geospector companion web portal — React + Vite app served at `/geospector-portal/`. Provides session review, map visualization, and metrics for Geospector field capture sessions. The design subagent (Task #38) builds the full frontend UI.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/portal_sessions.ts` — `portal_sessions` table (Geospector sessions: GPS route, metrics, share token, `claim_token` for accountless delete)
- `src/schema/portal_frames.ts` — `portal_frames` table (individual GPS-tagged frames with image URLs)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
