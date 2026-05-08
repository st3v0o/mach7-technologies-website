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

const ALLOWED_ORIGINS = [
  "https://atlas.mach7technologies.com",
  "https://www.mach7technologies.com",
  "https://mach7technologies.com",
];

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return ALLOWED_ORIGINS[0]!;
      if (ALLOWED_ORIGINS.includes(origin)) return origin;
      // Allow any localhost / replit.dev preview origin in development
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
      if (origin.endsWith(".replit.dev") || origin.endsWith(".worf.replit.dev")) return origin;
      return null;
    },
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    maxAge: 86400,
  }),
);
app.use("*", optionalAuth());

app.get("/", (c) => c.json({ ok: true, service: "atlas-api" }));
app.route("/api/portal", portalRouter);
app.route("/api", contactRouter);

export default app;
