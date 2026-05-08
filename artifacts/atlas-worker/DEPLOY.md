# Deploying Geospector to Cloudflare

## Overview

- **Atlas API Worker** (`atlas-worker`) → Cloudflare Workers
- **Geospector Portal** (`geospector-portal`) → Cloudflare Pages at `atlas.mach7technologies.com`

---

## 1 — Deploy the Atlas API Worker

### Prerequisites

```bash
npm install -g wrangler
wrangler login          # opens browser OAuth flow
```

### Set secrets (one-time)

Run each command and paste the value when prompted:

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_JWT_SECRET        # Legacy JWT Secret from Supabase dashboard
wrangler secret put RESEND_API_KEY             # Canonical key name — use this one
wrangler secret put RECAPTCHA_SECRET_KEY
```

> **Note:** `RESEND_API_KEY` is the canonical secret name. The Worker also accepts the
> legacy name `RESEND_EMAIL_KEY` as a fallback, but set `RESEND_API_KEY` for new deployments.

`SUPABASE_URL` and `PORTAL_BASE_URL` are already set as non-secret `[vars]` in `wrangler.toml`.

### Deploy

```bash
cd artifacts/atlas-worker
wrangler deploy
```

The Worker will be live at:
`https://atlas-api.<your-cf-subdomain>.workers.dev`

### Optional: custom route

In the Cloudflare dashboard → **Workers & Pages** → your Worker → **Settings** → **Triggers**,
add a custom route such as `atlas-api.mach7technologies.com/*` and point it to your domain's zone.

---

## 2 — Deploy the Portal to Cloudflare Pages

### Build settings (set in Cloudflare Pages dashboard)

| Setting | Value |
|---|---|
| Build command | `pnpm --filter @workspace/geospector-portal run build` |
| Build output directory | `artifacts/geospector-portal/dist/public` |
| Root directory | *(leave blank — repo root)* |
| Node.js version | `20` |

### Environment variables (set in Pages dashboard → Settings → Environment variables)

| Variable | Value |
|---|---|
| `BASE_PATH` | `/` |
| `VITE_SUPABASE_URL` | `https://unfddiecgfyzpincussj.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(your Supabase anon key)* |
| `VITE_API_BASE_URL` | `https://atlas-api.<your-cf-subdomain>.workers.dev` |

> `PORT` is not required for Cloudflare Pages builds.

### SPA routing

`artifacts/geospector-portal/public/_redirects` already contains `/* /index.html 200`
which Cloudflare Pages reads automatically to handle client-side routing.

### Custom domain

In the Cloudflare Pages dashboard → your project → **Custom domains**,
add `atlas.mach7technologies.com`. Cloudflare will handle DNS and TLS automatically
if your domain's DNS is already managed by Cloudflare.

---

## 3 — Updating secrets

To rotate a secret:
```bash
wrangler secret put SECRET_NAME
```

To list current secrets:
```bash
wrangler secret list
```

---

## 4 — Local development

The existing Express API server (`artifacts/api-server`) remains the local dev target.
The Cloudflare Worker is production-only and does not replace the dev server.

```bash
pnpm --filter @workspace/api-server run dev      # Express API (local)
pnpm --filter @workspace/geospector-portal run dev  # Vite dev server (local)
```
