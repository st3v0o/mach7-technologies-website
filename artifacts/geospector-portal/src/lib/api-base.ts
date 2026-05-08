/**
 * Returns the API base URL for the portal.
 *
 * Priority:
 * 1. VITE_API_BASE_URL env var — set this in Cloudflare Pages dashboard to point
 *    at the deployed atlas-api Worker (e.g. https://atlas-api.mach7technologies.workers.dev)
 * 2. Falls back to same-origin relative path derived from Vite BASE_URL (local dev)
 */
export function getApiBase(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (explicit) return explicit.replace(/\/$/, "");
  return import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/geospector-portal$/, "");
}
