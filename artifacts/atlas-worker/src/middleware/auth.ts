import type { Context, MiddlewareHandler, Next } from "hono";
import type { Bindings } from "../index.js";

export type AuthVariables = { userId: string | null };

async function verifyJwt(
  token: string,
  secret: string,
): Promise<{ sub?: string; exp?: number } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const b64urlToBytes = (b64url: string): Uint8Array => {
      const std = b64url.replace(/-/g, "+").replace(/_/g, "/");
      const padded = std + "=".repeat((4 - (std.length % 4)) % 4);
      const binary = atob(padded);
      return Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    };

    const b64urlToString = (b64url: string): string => {
      const std = b64url.replace(/-/g, "+").replace(/_/g, "/");
      const padded = std + "=".repeat((4 - (std.length % 4)) % 4);
      return atob(padded);
    };

    const signedData = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = b64urlToBytes(sigB64);

    const valid = await crypto.subtle.verify("HMAC", cryptoKey, signature, signedData);
    if (!valid) return null;

    const payload = JSON.parse(b64urlToString(payloadB64));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function optionalAuth(): MiddlewareHandler<{
  Bindings: Bindings;
  Variables: AuthVariables;
}> {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const payload = await verifyJwt(token, c.env.SUPABASE_JWT_SECRET);
      c.set("userId", payload?.sub ?? null);
    } else {
      c.set("userId", null);
    }
    await next();
  };
}

export function requireAuth(): MiddlewareHandler<{
  Bindings: Bindings;
  Variables: AuthVariables;
}> {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.slice(7);
    const payload = await verifyJwt(token, c.env.SUPABASE_JWT_SECRET);
    if (!payload?.sub) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("userId", payload.sub);
    await next();
  };
}
