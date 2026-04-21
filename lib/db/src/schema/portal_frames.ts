import {
  pgTable,
  serial,
  integer,
  real,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { portalSessionsTable } from "./portal_sessions";

export const portalFramesTable = pgTable("portal_frames", {
  id: serial("id").primaryKey(),
  portalSessionId: integer("portal_session_id")
    .notNull()
    .references(() => portalSessionsTable.id, { onDelete: "cascade" }),
  frameIndex: integer("frame_index").notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  heading: real("heading"),
  speedMph: real("speed_mph"),
  imageUrl: text("image_url"),
  thumbnailUrl: text("thumbnail_url"),
  uploadStatus: text("upload_status").notNull().default("uploaded"), // 'pending' | 'uploaded' | 'failed'
  metadata: jsonb("metadata"), // flexible JSON for future Geospector mobile app fields
});

export const insertPortalFrameSchema = createInsertSchema(portalFramesTable).omit({
  id: true,
});
export type InsertPortalFrame = z.infer<typeof insertPortalFrameSchema>;
export type PortalFrame = typeof portalFramesTable.$inferSelect;
