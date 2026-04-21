import {
  pgTable,
  serial,
  text,
  integer,
  real,
  jsonb,
  timestamp,
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
  sourceType: text("source_type").notNull().default("import"), // 'supabase' | 'webhook' | 'import'
  publicShareToken: text("public_share_token").unique(), // random UUID for /share/:token links
  status: text("status").notNull().default("active"), // 'active' | 'archived'
  thumbnailUrl: text("thumbnail_url"), // URL of first frame image used as preview
});

export const insertPortalSessionSchema = createInsertSchema(portalSessionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPortalSession = z.infer<typeof insertPortalSessionSchema>;
export type PortalSession = typeof portalSessionsTable.$inferSelect;
