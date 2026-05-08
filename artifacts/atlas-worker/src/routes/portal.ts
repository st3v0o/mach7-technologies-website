import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";
import { Resend } from "resend";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { toCamel, rowsToCamel, omitSensitive } from "../lib/case.js";
import {
  haversineDistanceMiles,
  buildLineString,
  escapeHtml,
} from "../lib/geo.js";
import type { Bindings, Variables } from "../index.js";

const portal = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ── DB client helpers ─────────────────────────────────────────────────────────
// readDb  — anon key; subject to Row Level Security (least privilege for reads)
// writeDb — service role key; bypasses RLS for trusted server-side mutations

function readDb(env: Bindings) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

function writeDb(env: Bindings) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ── Sensitive field omission ─────────────────────────────────────────────────

type SessionRow = Record<string, unknown>;

function safeSession(row: SessionRow) {
  return toCamel(omitSensitive(row));
}

function safeSessionList(rows: SessionRow[]) {
  return rows.map(safeSession);
}

// ── Metrics helper ───────────────────────────────────────────────────────────

function computeMetrics(
  frames: Array<{
    latitude: number;
    longitude: number;
    speed_mph: number | null;
    captured_at: string;
  }>,
) {
  if (frames.length === 0) {
    return {
      total_distance_miles: null,
      duration_seconds: null,
      average_speed_mph: null,
      max_speed_mph: null,
    };
  }

  const coords = frames.map((f): [number, number] => [f.latitude, f.longitude]);
  const dist = haversineDistanceMiles(coords);

  const sorted = [...frames].sort(
    (a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime(),
  );
  const durationSeconds = Math.round(
    (new Date(sorted[sorted.length - 1]!.captured_at).getTime() -
      new Date(sorted[0]!.captured_at).getTime()) /
      1000,
  );

  const speeds = frames.map((f) => f.speed_mph).filter((s): s is number => s !== null);
  const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null;
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : null;

  return {
    total_distance_miles: dist,
    duration_seconds: durationSeconds,
    average_speed_mph: avgSpeed,
    max_speed_mph: maxSpeed,
  };
}

// ── GET /portal/stats ────────────────────────────────────────────────────────

portal.get("/stats", async (c) => {
  const { data: rows, error } = await db(c.env)
    .from("portal_sessions")
    .select("total_frames, total_distance_miles");

  if (error) return c.json({ error: error.message }, 500);

  const totalSessions = rows?.length ?? 0;
  const totalFrames = (rows ?? []).reduce((s, r) => s + (Number(r.total_frames) || 0), 0);
  const totalDistanceMiles = (rows ?? []).reduce(
    (s, r) => s + (Number(r.total_distance_miles) || 0),
    0,
  );

  return c.json({ totalSessions, totalFrames, totalDistanceMiles });
});

// ── GET /portal/sessions ─────────────────────────────────────────────────────

portal.get("/sessions", async (c) => {
  const status = c.req.query("status");
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);

  let query = db(c.env)
    .from("portal_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  return c.json(safeSessionList(data ?? []));
});

// ── GET /portal/sessions/delete-confirm/:token ───────────────────────────────

portal.get("/sessions/delete-confirm/:token", async (c) => {
  const token = c.req.param("token");
  if (!token) return c.json({ error: "token is required" }, 400);

  const { data: rows } = await db(c.env)
    .from("portal_sessions")
    .select("*")
    .eq("delete_token", token)
    .limit(1);

  const session = rows?.[0];
  if (!session) return c.json({ error: "Delete link not found or already used." }, 404);

  const expiresAt = session.delete_token_expires_at
    ? new Date(session.delete_token_expires_at as string)
    : null;
  if (!expiresAt || expiresAt < new Date()) {
    return c.json({ error: "This delete link has expired. Please request a new one." }, 410);
  }

  await db(c.env).from("portal_sessions").delete().eq("id", session.id);

  return c.json({ deleted: true, id: session.id });
});

// ── GET /portal/sessions/:id ─────────────────────────────────────────────────

portal.get("/sessions/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid session id" }, 400);

  const { data: rows } = await db(c.env)
    .from("portal_sessions")
    .select("*")
    .eq("id", id)
    .limit(1);

  const session = rows?.[0];
  if (!session) return c.json({ error: "Session not found" }, 404);

  const userId = c.get("userId");
  return c.json({
    ...safeSession(session),
    isOwnedByCurrentUser: userId != null ? session.user_id === userId : false,
  });
});

// ── GET /portal/sessions/:id/frames ─────────────────────────────────────────

portal.get("/sessions/:id/frames", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid session id" }, 400);

  const limit = Math.min(Number(c.req.query("limit") ?? 200), 1000);
  const offset = Number(c.req.query("offset") ?? 0);

  const { data: sessionRows } = await db(c.env)
    .from("portal_sessions")
    .select("id")
    .eq("id", id)
    .limit(1);

  if (!sessionRows?.[0]) return c.json({ error: "Session not found" }, 404);

  const [{ data: frames }, { count }] = await Promise.all([
    db(c.env)
      .from("portal_frames")
      .select("*")
      .eq("portal_session_id", id)
      .order("frame_index", { ascending: true })
      .range(offset, offset + limit - 1),
    db(c.env)
      .from("portal_frames")
      .select("*", { count: "exact", head: true })
      .eq("portal_session_id", id),
  ]);

  return c.json({
    frames: rowsToCamel((frames ?? []) as Record<string, unknown>[]),
    total: count ?? 0,
  });
});

// ── GET /portal/sessions/:id/summary ────────────────────────────────────────

portal.get("/sessions/:id/summary", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid session id" }, 400);

  const { data: sessionRows } = await db(c.env)
    .from("portal_sessions")
    .select("*")
    .eq("id", id)
    .limit(1);

  const session = sessionRows?.[0];
  if (!session) return c.json({ error: "Session not found" }, 404);

  const { data: frames } = await db(c.env)
    .from("portal_frames")
    .select("*")
    .eq("portal_session_id", id)
    .order("frame_index", { ascending: true });

  const uploadedFrames = (frames ?? []).filter((f) => f.upload_status === "uploaded");
  const sorted = [...(frames ?? [])].sort(
    (a, b) =>
      new Date(a.captured_at as string).getTime() -
      new Date(b.captured_at as string).getTime(),
  );

  return c.json({
    sessionId: session.id,
    totalFrames: session.total_frames,
    uploadedFrames: session.uploaded_frames,
    totalDistanceMiles: session.total_distance_miles,
    durationSeconds: session.duration_seconds,
    averageSpeedMph: session.average_speed_mph,
    maxSpeedMph: session.max_speed_mph,
    firstFrameAt: sorted[0]?.captured_at ?? null,
    lastFrameAt: sorted[sorted.length - 1]?.captured_at ?? null,
    frameCount: (frames ?? []).length,
    uploadedCount: uploadedFrames.length,
  });
});

// ── GET /portal/sessions/:id/route ──────────────────────────────────────────

portal.get("/sessions/:id/route", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid session id" }, 400);

  const { data: sessionRows } = await db(c.env)
    .from("portal_sessions")
    .select("*")
    .eq("id", id)
    .limit(1);

  const session = sessionRows?.[0];
  if (!session) return c.json({ error: "Session not found" }, 404);

  if (session.route_geojson) {
    return c.json({ geojson: session.route_geojson });
  }

  const { data: frames } = await db(c.env)
    .from("portal_frames")
    .select("latitude, longitude")
    .eq("portal_session_id", id)
    .order("frame_index", { ascending: true });

  const coords = (frames ?? []).map((f): [number, number] => [
    f.latitude as number,
    f.longitude as number,
  ]);
  return c.json({ geojson: buildLineString(coords) });
});

// ── GET /portal/share/:token ─────────────────────────────────────────────────

portal.get("/share/:token", async (c) => {
  const token = c.req.param("token");
  if (!token) return c.json({ error: "Invalid token" }, 400);

  const { data: rows } = await db(c.env)
    .from("portal_sessions")
    .select("*")
    .eq("public_share_token", token)
    .limit(1);

  const session = rows?.[0];
  if (!session) return c.json({ error: "Share link not found" }, 404);

  const userId = c.get("userId");
  return c.json({
    ...safeSession(session),
    isOwnedByCurrentUser: userId != null ? session.user_id === userId : false,
  });
});

// ── POST /portal/import/mock ─────────────────────────────────────────────────

portal.post("/import/mock", async (c) => {
  const sessionUUID = crypto.randomUUID();
  const shareToken = crypto.randomUUID();

  const routePoints: Array<{ lat: number; lon: number; heading: number }> = [
    { lat: 37.3382, lon: -121.8863, heading: 350 },
    { lat: 37.3392, lon: -121.887, heading: 345 },
    { lat: 37.3403, lon: -121.8878, heading: 340 },
    { lat: 37.3415, lon: -121.8884, heading: 335 },
    { lat: 37.3427, lon: -121.8891, heading: 330 },
    { lat: 37.344, lon: -121.8899, heading: 325 },
    { lat: 37.3452, lon: -121.8904, heading: 320 },
    { lat: 37.3465, lon: -121.891, heading: 315 },
    { lat: 37.3477, lon: -121.8917, heading: 312 },
    { lat: 37.349, lon: -121.8923, heading: 308 },
    { lat: 37.3502, lon: -121.8929, heading: 305 },
    { lat: 37.3515, lon: -121.8935, heading: 300 },
  ];

  const baseTime = new Date("2026-04-15T10:30:00-07:00");
  const speeds = [18, 22, 20, 25, 23, 21, 19, 24, 22, 26, 20, 18];
  const coords = routePoints.map((p): [number, number] => [p.lat, p.lon]);
  const dist = haversineDistanceMiles(coords);
  const durationSec = routePoints.length * 3;
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const maxSpeed = Math.max(...speeds);
  const geojson = buildLineString(coords);

  const startedAt = baseTime.toISOString();
  const endedAt = new Date(baseTime.getTime() + durationSec * 1000).toISOString();

  const { data: sessionRows, error } = await db(c.env)
    .from("portal_sessions")
    .insert({
      session_id: sessionUUID,
      title: "Guadalupe River Trail Survey — Demo",
      started_at: startedAt,
      ended_at: endedAt,
      capture_mode: "fixed",
      total_frames: routePoints.length,
      uploaded_frames: routePoints.length,
      total_distance_miles: dist,
      duration_seconds: durationSec,
      average_speed_mph: avgSpeed,
      max_speed_mph: maxSpeed,
      route_geojson: geojson,
      source_type: "import",
      public_share_token: shareToken,
      status: "active",
      thumbnail_url: null,
    })
    .select()
    .single();

  if (error || !sessionRows) return c.json({ error: "Failed to create session" }, 500);

  const frameValues = routePoints.map((pt, i) => ({
    portal_session_id: sessionRows.id,
    frame_index: i,
    captured_at: new Date(baseTime.getTime() + i * 3000).toISOString(),
    latitude: pt.lat,
    longitude: pt.lon,
    heading: pt.heading,
    speed_mph: speeds[i] ?? 20,
    image_url: null,
    thumbnail_url: null,
    upload_status: "uploaded",
    metadata: null,
  }));

  await db(c.env).from("portal_frames").insert(frameValues);

  return c.json(toCamel(sessionRows as Record<string, unknown>));
});

// ── POST /portal/import/session-json ────────────────────────────────────────

const ImportSessionJsonBody = z.object({
  session: z.record(z.unknown()),
  frames: z.array(z.record(z.unknown())),
});

portal.post("/import/session-json", requireAuth(), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = ImportSessionJsonBody.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);

  const { session: rawSession, frames: rawFrames } = parsed.data;

  const incomingSessionId =
    (rawSession["session_id"] ?? rawSession["sessionId"]) as string | undefined;

  if (incomingSessionId) {
    const { data: existing } = await db(c.env)
      .from("portal_sessions")
      .select("*")
      .eq("session_id", String(incomingSessionId))
      .limit(1);
    if (existing?.[0]) {
      return c.json({ ...safeSession(existing[0]), alreadyPublished: true });
    }
  }

  const mappedFrames = rawFrames.map((f, i) => {
    const rawImageUrl = (f["image_url"] ?? f["imageUrl"] ?? null) as string | null;
    const rawImageData = (f["image_data"] ?? f["imageData"] ?? null) as string | null;
    let imageUrl: string | null = rawImageUrl;
    if (!imageUrl && rawImageData) {
      imageUrl = rawImageData.startsWith("data:")
        ? rawImageData
        : `data:image/jpeg;base64,${rawImageData}`;
    }
    return {
      lat: Number(f["latitude"] ?? f["lat"] ?? 0),
      lon: Number(f["longitude"] ?? f["lon"] ?? 0),
      speed: (f["speed_mph"] ?? f["speedMph"] ?? f["speed"] ?? null) as number | null,
      heading: (f["heading"] ?? null) as number | null,
      imageUrl,
      thumbnailUrl: (imageUrl ??
        f["thumbnail_url"] ??
        f["thumbnailUrl"] ??
        null) as string | null,
      capturedAt: new Date(
        String(f["timestamp"] ?? f["captured_at"] ?? f["capturedAt"] ?? new Date()),
      ),
      frameIndex: Number(f["frame_index"] ?? f["frameIndex"] ?? i),
      uploadStatus: String(f["upload_status"] ?? f["uploadStatus"] ?? "uploaded"),
    };
  });

  const coords = mappedFrames.map((f): [number, number] => [f.lat, f.lon]);
  const geojson = buildLineString(coords);
  const sortedFrames = [...mappedFrames].sort(
    (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
  );
  const metrics = computeMetrics(
    mappedFrames.map((f) => ({
      latitude: f.lat,
      longitude: f.lon,
      speed_mph: f.speed !== null ? Number(f.speed) : null,
      captured_at: f.capturedAt.toISOString(),
    })),
  );

  const s = rawSession;
  const sessionId = String(s["session_id"] ?? s["sessionId"] ?? crypto.randomUUID());
  const shareToken = crypto.randomUUID();
  const makePublic = s["isPublic"] === true || s["is_public"] === true;
  const submitterEmail = (s["submitterEmail"] ?? s["submitter_email"] ?? null) as
    | string
    | null;
  const userId = c.get("userId");

  const { data: sessionRow, error } = await db(c.env)
    .from("portal_sessions")
    .insert({
      session_id: sessionId,
      title: (s["title"] as string | undefined) ?? null,
      started_at: sortedFrames[0]?.capturedAt.toISOString() ?? null,
      ended_at: sortedFrames[sortedFrames.length - 1]?.capturedAt.toISOString() ?? null,
      capture_mode:
        ((s["capture_mode"] ?? s["captureMode"]) as string | undefined) ?? null,
      total_frames: mappedFrames.length,
      uploaded_frames: mappedFrames.filter((f) => f.uploadStatus === "uploaded").length,
      ...metrics,
      route_geojson: geojson,
      source_type: "atlas",
      public_share_token: shareToken,
      submitter_email: submitterEmail,
      status: "active",
      thumbnail_url: mappedFrames[0]?.imageUrl ?? null,
      is_public: makePublic,
      published_at: makePublic ? new Date().toISOString() : null,
      user_id: userId ?? null,
    })
    .select()
    .single();

  if (error || !sessionRow) return c.json({ error: "Failed to create session" }, 500);

  const frameValues = mappedFrames.map((f) => ({
    portal_session_id: sessionRow.id,
    frame_index: f.frameIndex,
    captured_at: f.capturedAt.toISOString(),
    latitude: f.lat,
    longitude: f.lon,
    heading: f.heading !== null ? Number(f.heading) : null,
    speed_mph: f.speed !== null ? Number(f.speed) : null,
    image_url: f.imageUrl,
    thumbnail_url: f.thumbnailUrl,
    upload_status: f.uploadStatus,
    metadata: null,
  }));

  await db(c.env).from("portal_frames").insert(frameValues);

  return c.json(safeSession(sessionRow as Record<string, unknown>));
});

// ── POST /portal/import/gpx ──────────────────────────────────────────────────

const ImportGpxBody = z.object({
  gpx: z.string(),
  title: z.string().optional(),
  frames: z.array(z.record(z.unknown())).optional(),
});

portal.post("/import/gpx", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = ImportGpxBody.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request body — gpx field required" }, 400);

  const { gpx: gpxXml, title, frames: supplementalFrames } = parsed.data;

  let trkpts: Array<{ lat: number; lon: number; time?: string }>;
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const gpxParsed = parser.parse(gpxXml);
    const trk = gpxParsed?.gpx?.trk;
    const trkseg = trk?.trkseg ?? trk;
    const rawPts: unknown[] = Array.isArray(trkseg?.trkpt)
      ? trkseg.trkpt
      : trkseg?.trkpt
        ? [trkseg.trkpt]
        : [];
    trkpts = rawPts.map((p: unknown) => {
      const pt = p as Record<string, unknown>;
      return {
        lat: Number(pt["@_lat"]),
        lon: Number(pt["@_lon"]),
        time: pt["time"] as string | undefined,
      };
    });
  } catch {
    return c.json({ error: "Failed to parse GPX XML" }, 400);
  }

  if (trkpts.length === 0) return c.json({ error: "No trackpoints found in GPX file" }, 400);

  const baseTime = new Date();
  const coords = trkpts.map((p): [number, number] => [p.lat, p.lon]);
  const geojson = buildLineString(coords);
  const dist = haversineDistanceMiles(coords);

  const mappedFrames = trkpts.map((pt, i) => {
    const capturedAt = pt.time ? new Date(pt.time) : new Date(baseTime.getTime() + i * 3000);
    const sup = ((supplementalFrames ?? []) as Array<Record<string, unknown>>)[i] ?? {};
    return {
      frameIndex: i,
      capturedAt,
      latitude: pt.lat,
      longitude: pt.lon,
      heading: sup["heading"] ? Number(sup["heading"]) : null,
      speedMph:
        sup["speed_mph"] || sup["speedMph"]
          ? Number(sup["speed_mph"] ?? sup["speedMph"])
          : null,
      imageUrl: (sup["image_url"] ?? sup["imageUrl"] ?? null) as string | null,
      thumbnailUrl: (sup["thumbnail_url"] ?? sup["thumbnailUrl"] ?? null) as string | null,
      uploadStatus: "uploaded",
    };
  });

  const sortedFrames = [...mappedFrames].sort(
    (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
  );
  const durationSec =
    sortedFrames.length >= 2
      ? Math.round(
          (sortedFrames[sortedFrames.length - 1]!.capturedAt.getTime() -
            sortedFrames[0]!.capturedAt.getTime()) /
            1000,
        )
      : null;

  const { data: sessionRow, error } = await db(c.env)
    .from("portal_sessions")
    .insert({
      session_id: crypto.randomUUID(),
      title: title ?? null,
      started_at: sortedFrames[0]?.capturedAt.toISOString() ?? null,
      ended_at: sortedFrames[sortedFrames.length - 1]?.capturedAt.toISOString() ?? null,
      capture_mode: null,
      total_frames: mappedFrames.length,
      uploaded_frames: mappedFrames.length,
      total_distance_miles: dist,
      duration_seconds: durationSec,
      average_speed_mph: null,
      max_speed_mph: null,
      route_geojson: geojson,
      source_type: "import",
      public_share_token: crypto.randomUUID(),
      status: "active",
      thumbnail_url: mappedFrames[0]?.imageUrl ?? null,
    })
    .select()
    .single();

  if (error || !sessionRow) return c.json({ error: "Failed to create session" }, 500);

  const frameValues = mappedFrames.map((f) => ({
    portal_session_id: sessionRow.id,
    frame_index: f.frameIndex,
    captured_at: f.capturedAt.toISOString(),
    latitude: f.latitude,
    longitude: f.longitude,
    heading: f.heading,
    speed_mph: f.speedMph,
    image_url: f.imageUrl,
    thumbnail_url: f.thumbnailUrl,
    upload_status: f.uploadStatus,
    metadata: null,
  }));

  await db(c.env).from("portal_frames").insert(frameValues);

  return c.json(toCamel(sessionRow as Record<string, unknown>));
});

// ── GET /portal/feed ─────────────────────────────────────────────────────────

portal.get("/feed", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);

  const [{ data: sessions }, { count }] = await Promise.all([
    db(c.env)
      .from("portal_sessions")
      .select("*")
      .eq("is_public", true)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1),
    db(c.env)
      .from("portal_sessions")
      .select("*", { count: "exact", head: true })
      .eq("is_public", true),
  ]);

  const publicRows = sessions ?? [];
  const totalPublicDistanceMiles = publicRows.reduce(
    (s, r) => s + (Number(r.total_distance_miles) || 0),
    0,
  );

  return c.json({
    sessions: safeSessionList(publicRows),
    totalPublic: count ?? 0,
    totalPublicDistanceMiles,
  });
});

// ── PATCH /portal/sessions/:id/publish ───────────────────────────────────────

portal.patch("/sessions/:id/publish", requireAuth(), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid session id" }, 400);

  const body = await c.req.json().catch(() => null);
  if (typeof body?.isPublic !== "boolean") {
    return c.json({ error: "Invalid request body — isPublic required" }, 400);
  }

  const userId = c.get("userId");

  const { data: existing } = await db(c.env)
    .from("portal_sessions")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId!)
    .limit(1);

  if (!existing?.[0]) {
    return c.json({ error: "Session not found or not owned by you" }, 404);
  }

  const { data: updated, error } = await db(c.env)
    .from("portal_sessions")
    .update({
      is_public: body.isPublic,
      published_at: body.isPublic ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) return c.json({ error: "Update failed" }, 500);

  return c.json(safeSession(updated as Record<string, unknown>));
});

// ── POST /portal/sessions/:id/request-delete ─────────────────────────────────

const RequestDeleteBody = z.object({ email: z.string().email() });

portal.post("/sessions/:id/request-delete", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid session id" }, 400);

  const body = await c.req.json().catch(() => null);
  const parsed = RequestDeleteBody.safeParse(body);
  if (!parsed.success) return c.json({ error: "email is required" }, 400);

  const { email } = parsed.data;
  const portalBaseUrl = (c.env.PORTAL_BASE_URL ?? "https://atlas.mach7technologies.com").replace(
    /\/$/,
    "",
  );
  const genericOk = {
    sent: true,
    message: "If that email matches our records, you'll receive a delete link shortly.",
  };

  const { data: rows } = await db(c.env)
    .from("portal_sessions")
    .select("*")
    .eq("id", id)
    .limit(1);

  const session = rows?.[0];
  if (!session || !session.submitter_email) return c.json(genericOk);
  if (
    (session.submitter_email as string).toLowerCase() !== email.toLowerCase()
  ) {
    return c.json(genericOk);
  }

  const deleteToken = crypto.randomUUID();
  const deleteTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await db(c.env)
    .from("portal_sessions")
    .update({ delete_token: deleteToken, delete_token_expires_at: deleteTokenExpiresAt })
    .eq("id", id);

  const resendKey = c.env.RESEND_EMAIL_KEY ?? c.env.RESEND_API_KEY;
  if (!resendKey) return c.json(genericOk);

  const deleteUrl = `${portalBaseUrl}/delete/${deleteToken}`;
  const sessionTitle = escapeHtml(
    ((session.title as string | null) ?? (session.session_id as string)),
  );

  const resend = new Resend(resendKey);
  try {
    await resend.emails.send({
      from: "Geospector Atlas <noreply@mach7technologies.com>",
      to: [email],
      subject: `Delete your Geospector Atlas session — ${sessionTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #1e293b;">
          <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 700;">Delete Atlas session</h2>
          <p style="margin: 0 0 16px; color: #64748b; font-size: 14px;">
            You requested to delete <strong>${sessionTitle}</strong> from Geospector Atlas.
          </p>
          <a href="${deleteUrl}"
            style="display: inline-block; padding: 12px 24px; background: #dc2626; color: #fff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
            Delete this session permanently
          </a>
          <p style="margin: 20px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
            This link expires in 1 hour. If you didn't request this, ignore this email — your session is safe.<br>
            Do not share this link with anyone.
          </p>
        </div>
      `,
    });
  } catch {
    // Silent failure — user sees generic OK
  }

  return c.json(genericOk);
});

// ── DELETE /portal/sessions/:id ─────────────────────────────────────────────

portal.delete("/sessions/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid session id" }, 400);

  const { data: rows } = await db(c.env)
    .from("portal_sessions")
    .select("*")
    .eq("id", id)
    .limit(1);

  const session = rows?.[0];
  if (!session) return c.json({ error: "Session not found" }, 404);

  if (session.user_id) {
    const userId = c.get("userId");
    if (!userId || userId !== session.user_id) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  }

  await db(c.env).from("portal_sessions").delete().eq("id", id);

  return c.json({ deleted: true, id });
});

// ── GET /portal/my-sessions ──────────────────────────────────────────────────

portal.get("/my-sessions", requireAuth(), async (c) => {
  const userId = c.get("userId");

  const { data, error } = await db(c.env)
    .from("portal_sessions")
    .select("*")
    .eq("user_id", userId!)
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);

  return c.json(safeSessionList((data ?? []) as Record<string, unknown>[]));
});

// ── DELETE /portal/my-sessions/:id ──────────────────────────────────────────

portal.delete("/my-sessions/:id", requireAuth(), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid session id" }, 400);

  const userId = c.get("userId");

  const { data: rows } = await db(c.env)
    .from("portal_sessions")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId!)
    .limit(1);

  if (!rows?.[0]) return c.json({ error: "Session not found or not owned by you" }, 404);

  await db(c.env).from("portal_frames").delete().eq("portal_session_id", id);
  await db(c.env).from("portal_sessions").delete().eq("id", id);

  return c.json({ deleted: true, id });
});

export default portal;
