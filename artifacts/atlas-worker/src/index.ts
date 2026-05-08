import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { optionalAuth } from "./middleware/auth.js";
import portalRouter from "./routes/portal.js";
import contactRouter from "./routes/contact.js";

export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_JWT_SECRET: string;
  RESEND_EMAIL_KEY: string;
  RESEND_API_KEY: string;
  RECAPTCHA_SECRET_KEY: string;
  PORTAL_BASE_URL: string;
};

export type Variables = { userId: string | null };

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", logger());
app.use("*", cors({ origin: "*", credentials: true }));
app.use("*", optionalAuth());

app.get("/", (c) => c.json({ ok: true, service: "atlas-api" }));
app.route("/api/portal", portalRouter);
app.route("/api", contactRouter);

export default app;
