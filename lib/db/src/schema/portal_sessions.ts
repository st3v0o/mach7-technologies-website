import {
  pgTable,
  serial,
  text,
  integer,
  real,
  jsonb,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const portalSessionsTable = pgTable("portal_sessions", {
  id: serial("id").primaryKey(),
  title: text("title"),
  sessionId: text("session_id").notNull().unique(), // UUID from the Geospector mobile app
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  captureMode: text("capture_mode"), // 'fixed' | 'dynamic'
  totalFrames: integer("total_frames").notNull().default(0),
  uploadedFrames: integer("uploaded_frames").notNull().default(0),
  totalDistanceMiles: real("total_distance_miles"),
  durationSeconds: integer("duration_seconds"),
  averageSpeedMph: real("average_speed_mph"),
  maxSpeedMph: real("max_speed_mph"),
  routeGeojson: jsonb("route_geojson"), // GeoJSON LineString or null; derived from frame coords if not provided
  sourceType: text("source_type").notNull().default("import"), // 'supabase' | 'webhook' | 'import' | 'atlas'
  publicShareToken: text("public_share_token").unique(), // random UUID for /share/:token links
  claimToken: text("claim_token").unique(), // secret UUID issued at submit-time; bearer can delete the session
  submitterEmail: text("submitter_email"), // optional email provided at Atlas submit time; used for email-based delete
  deleteToken: text("delete_token").unique(), // short-lived token emailed for delete-link flow
  deleteTokenExpiresAt: timestamp("delete_token_expires_at", { withTimezone: true }), // expiry for deleteToken
  status: text("status").notNull().default("active"), // 'active' | 'archived'
  thumbnailUrl: text("thumbnail_url"), // URL of first frame image used as preview
  isPublic: boolean("is_public").notNull().default(false), // whether this session appears on the public feed
  publishedAt: timestamp("published_at", { withTimezone: true }), // when it was made public
  userId: text("user_id"), // Clerk user ID of the authenticated user who submitted this session (nullable — anonymous OK)
});

export const insertPortalSessionSchema = createInsertSchema(portalSessionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPortalSession = z.infer<typeof insertPortalSessionSchema>;
export type PortalSession = typeof portalSessionsTable.$inferSelect;
