# Geospector / MACH 7 Workspace

Monorepo for the Geospector field-capture ecosystem: iOS/Android app, web portal, shared API, and MACH 7 marketing site.

## Run & Operate

| Command | Purpose |
|---|---|
| `pnpm run typecheck` | `tsc --build --emitDeclarationOnly` across all packages |
| `pnpm run build` | typecheck → build all packages |
| `pnpm --filter @workspace/api-server run dev` | API server dev (port from `PORT`) |
| `pnpm --filter @workspace/geospector-portal run dev` | Portal dev (port 24441) |
| `pnpm --filter @workspace/gps-video-capture run dev` | Expo Metro (requires `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY`) |
| `pnpm --filter @workspace/db run push` | Apply schema changes to dev DB |

**Required secrets**: `DATABASE_URL` (auto-provided), `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (all auto-set by Replit Clerk provisioning), `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `RECAPTCHA_SECRET_KEY`.

## Stack

- **Monorepo**: pnpm workspaces, Node 24, TypeScript 5.9
- **API**: Express 5 + Drizzle ORM (PostgreSQL) + Zod + Clerk (`@clerk/express`)
- **Portal (web)**: React 19 + Vite + Tailwind v4 + Wouter + Clerk (`@clerk/react`)
- **Mobile**: Expo SDK 54 + Expo Router + Clerk (`@clerk/expo`)
- **Auth**: Replit-managed Clerk (whitelabel). Dev = `pk_test_*` keys; prod = `pk_live_*` + proxy
- **Codegen**: Orval (OpenAPI → React Query hooks + Zod schemas)

## Where things live

```
artifacts/api-server/      Express API, routes in src/routes/, Clerk middleware in src/middlewares/
artifacts/geospector-portal/  React+Vite portal at /geospector-portal/, Clerk SignIn/SignUp/MyMaps pages
artifacts/gps-video-capture/  Expo app; auth screens at app/(auth)/; PortalConfigContext
artifacts/mach7-website/   Astro marketing site at /mach7/
lib/db/                    Drizzle schema (portal_sessions, portal_frames) + DB connection
lib/api-spec/              openapi.yaml + Orval config
lib/api-client-react/      Generated React Query hooks (setBaseUrl, setAuthTokenGetter)
lib/api-zod/               Generated Zod schemas
```

Source-of-truth files: `lib/db/src/schema/`, `lib/api-spec/openapi.yaml`, `artifacts/api-server/src/app.ts`

## Architecture decisions

- **Clerk whitelabel auth**: API server mounts `clerkProxyMiddleware` at `/api/__clerk` (production only); `clerkMiddleware` reads the publishable key from the forwarded host via `publishableKeyFromHost`. Portal uses `VITE_CLERK_PROXY_URL` (empty in dev, auto-set in prod). Expo uses `EXPO_PUBLIC_CLERK_PROXY_URL` similarly.
- **Path-based routing**: Replit proxy routes `/api` → API server (port 8080), `/geospector-portal` → portal (port 24441). Portal API calls use relative `/api/...` URLs — no base URL needed.
- **Anonymous + authenticated**: All portal sessions support accountless `claimToken` flow; Clerk `userId` is stored on import/session but not required. `GET /api/portal/my-sessions` requires auth.
- **Expo token auth**: Mobile app uses `useAuth().getToken()` as a Bearer token via `setAuthTokenGetter` in `PortalConfigContext`. Web portal relies on cookies (no explicit token needed for fetch calls).
- **Drizzle-kit push hangs**: Use `executeSql` from `code_execution` for future migrations instead of `drizzle-kit push`.

## Product

- **Geospector app** (iOS/Android): GPS video capture with frame logging, Supabase upload, Atlas submission, and Clerk sign-in (email+password + Google SSO).
- **Geospector Atlas portal** (web): View/share GPS sessions on Leaflet maps; signed-in users see "My Maps" dashboard; anonymous share links always work.
- **API server**: Portal sessions CRUD, frames, share tokens, GeoJSON routes, Atlas import, authenticated user-session listing and deletion.
- **MACH 7 website**: Astro marketing site at `/mach7/`.

## User preferences

- Dark slate theme (#0f172a background, #3b82f6 accent) used consistently across portal and mobile app.
- Anonymous/guest use is always preserved — never gate public share links behind auth.

## Gotchas

- **Clerk in screenshots**: The internal screenshot tool's headless browser cannot reach Clerk's servers, so `isLoaded` stays false and auth-gated UI appears blank. This is expected — actual user browsers work fine.
- **Expo `_layout.tsx`**: `ClerkProvider` must wrap `ClerkLoaded` which wraps everything else; `clerkPublishableKey` comes from `process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- **Portal `<SignIn>`/`<SignUp>`**: Must use `routing="path"` and `path={\`${basePath}/sign-in\`}` (full browser path, not base-relative).
- **`optionalAuth` middleware**: Applied at router level in `portal.ts`; `requireAuth` used only on `GET /my-sessions` and `DELETE /my-sessions/:id`.
- **Metro blocklist**: `metro.config.js` blocks `_tmp_\d+` dirs to prevent ENOENT crashes on temp file watch.

## Pointers

- Clerk setup: `.local/skills/clerk-auth/SKILL.md` + `references/setup-and-customization.md`
- Expo auth APIs: `.local/skills/clerk-auth/references/custom-ui/expo-sdk-email-password.md` + `expo-sdk-oauth.md`
- GitHub remote: `origin` → `https://github.com/st3v0o/gps-video-capture.git`
