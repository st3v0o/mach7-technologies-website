import { Router, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  portalSessionsTable,
  portalFramesTable,
  type InsertPortalSession,
  type InsertPortalFrame,
} from "@workspace/db";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { Resend } from "resend";
import { z } from "zod";
import {
  ListPortalSessionsQueryParams,
  GetPortalSessionParams,
  GetPortalSessionFramesParams,
  GetPortalSessionFramesQueryParams,
  GetPortalSessionSummaryParams,
  GetPortalSessionRouteParams,
  GetPortalShareSessionParams,
  ImportPortalSessionJsonBody,
  ImportPortalGpxBody,
  GetPortalFeedQueryParams,
  PublishPortalSessionParams,
  PublishPortalSessionBody,
} from "@workspace/api-zod";
import { haversineDistanceMiles, buildLineString } from "../lib/geo.js";
import { XMLParser } from "fast-xml-parser";

/** Express Request extended with the Clerk userId resolved by auth middleware. */
interface AuthedRequest extends Request {
  userId?: string | null;
}

const router = Router();

// ── Auth helpers ─────────────────────────────────────────────────────────────

function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  try {
    const auth = getAuth(req);
    req.userId = auth?.userId ?? null;
  } catch {
    req.userId = null;
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.userId = auth.userId;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// Apply optional auth to all portal routes so req.userId is always available
router.use(optionalAuth);

// ── Helper: strip sensitive fields before sending sessions to clients ────────

function omitSensitiveFields<T extends {
  submitterEmail?: string | null;
  deleteToken?: string | null;
  deleteTokenExpiresAt?: Date | null;
}>(session: T): Omit<T, "submitterEmail" | "deleteToken" | "deleteTokenExpiresAt"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { submitterEmail: _se, deleteToken: _dt, deleteTokenExpiresAt: _dtea, ...rest } = session;
  return rest;
}

// Keep backward-compat alias used throughout this file
const omitClaimToken = omitSensitiveFields;

// ── Helper: compute session metrics from frames ─────────────────────────────

function computeMetrics(frames: Array<{ latitude: number; longitude: number; speedMph: number | null; capturedAt: Date }>) {
  if (frames.length === 0) {
    return { totalDistanceMiles: null, durationSeconds: null, averageSpeedMph: null, maxSpeedMph: null };
  }

  const coords = frames.map((f): [number, number] => [f.latitude, f.longitude]);
  const dist = haversineDistanceMiles(coords);

  const sorted = [...frames].sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
  const durationSeconds = Math.round(
    (sorted[sorted.length - 1]!.capturedAt.getTime() - sorted[0]!.capturedAt.getTime()) / 1000,
  );

  const speeds = frames.map((f) => f.speedMph).filter((s): s is number => s !== null);
  const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null;
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : null;

  return {
    totalDistanceMiles: dist,
    durationSeconds,
    averageSpeedMph: avgSpeed,
    maxSpeedMph: maxSpeed,
  };
}

// ── GET /portal/stats ────────────────────────────────────────────────────────

router.get("/stats", async (req, res) => {
  const [sessionStats] = await db
    .select({
      totalSessions: count(),
      totalFrames: sql<number>`coalesce(sum(${portalSessionsTable.totalFrames}), 0)`,
      totalDistanceMiles: sql<number>`coalesce(sum(${portalSessionsTable.totalDistanceMiles}), 0)`,
    })
    .from(portalSessionsTable);

  res.json({
    totalSessions: sessionStats?.totalSessions ?? 0,
    totalFrames: Number(sessionStats?.totalFrames ?? 0),
    totalDistanceMiles: Number(sessionStats?.totalDistanceMiles ?? 0),
  });
});

// ── GET /portal/sessions ─────────────────────────────────────────────────────

router.get("/sessions", async (req, res) => {
  const parsed = ListPortalSessionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const { status, limit = 50, offset = 0 } = parsed.data;

  const whereClause = status ? eq(portalSessionsTable.status, status) : undefined;

  const sessions = await db
    .select()
    .from(portalSessionsTable)
    .where(whereClause)
    .orderBy(desc(portalSessionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(sessions.map(omitClaimToken));
});

// ── GET /portal/sessions/delete-confirm/:token ───────────────────────────────
// Called by the portal delete-confirmation page when the user clicks the
// emailed link. Validates the one-time token and deletes the session.
// Must be registered BEFORE /sessions/:id to avoid route collision.

router.get("/sessions/delete-confirm/:token", async (req, res) => {
  const token = req.params.token;
  if (!token) {
    res.status(400).json({ error: "token is required" });
    return;
  }

  const [session] = await db
    .select()
    .from(portalSessionsTable)
    .where(eq(portalSessionsTable.deleteToken, token));

  if (!session) {
    res.status(404).json({ error: "Delete link not found or already used." });
    return;
  }

  if (!session.deleteTokenExpiresAt || session.deleteTokenExpiresAt < new Date()) {
    res.status(410).json({ error: "This delete link has expired. Please request a new one." });
    return;
  }

  await db.delete(portalSessionsTable).where(eq(portalSessionsTable.id, session.id));

  res.json({ deleted: true, id: session.id });
});

// ── GET /portal/sessions/:id ─────────────────────────────────────────────────

router.get("/sessions/:id", async (req, res) => {
  const parsed = GetPortalSessionParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const [session] = await db
    .select()
    .from(portalSessionsTable)
    .where(eq(portalSessionsTable.id, parsed.data.id));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const authedUserId = (req as AuthedRequest).userId;
  res.json({
    ...omitClaimToken(session),
    isOwnedByCurrentUser: authedUserId != null ? session.userId === authedUserId : false,
  });
});

// ── GET /portal/sessions/:id/frames ─────────────────────────────────────────

router.get("/sessions/:id/frames", async (req, res) => {
  const paramParsed = GetPortalSessionFramesParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const queryParsed = GetPortalSessionFramesQueryParams.safeParse(req.query);
  const limit = queryParsed.success ? (queryParsed.data.limit ?? 200) : 200;
  const offset = queryParsed.success ? (queryParsed.data.offset ?? 0) : 0;

  const [sessionExists] = await db
    .select({ id: portalSessionsTable.id })
    .from(portalSessionsTable)
    .where(eq(portalSessionsTable.id, paramParsed.data.id));

  if (!sessionExists) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [frames, [totalRow]] = await Promise.all([
    db
      .select()
      .from(portalFramesTable)
      .where(eq(portalFramesTable.portalSessionId, paramParsed.data.id))
      .orderBy(portalFramesTable.frameIndex)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(portalFramesTable)
      .where(eq(portalFramesTable.portalSessionId, paramParsed.data.id)),
  ]);

  res.json({ frames, total: totalRow?.total ?? 0 });
});

// ── GET /portal/sessions/:id/summary ────────────────────────────────────────

router.get("/sessions/:id/summary", async (req, res) => {
  const parsed = GetPortalSessionSummaryParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const [session] = await db
    .select()
    .from(portalSessionsTable)
    .where(eq(portalSessionsTable.id, parsed.data.id));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const frames = await db
    .select()
    .from(portalFramesTable)
    .where(eq(portalFramesTable.portalSessionId, parsed.data.id))
    .orderBy(portalFramesTable.frameIndex);

  const uploadedFrames = frames.filter((f) => f.uploadStatus === "uploaded");
  const sorted = [...frames].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
  );

  res.json({
    sessionId: session.id,
    totalFrames: session.totalFrames,
    uploadedFrames: session.uploadedFrames,
    totalDistanceMiles: session.totalDistanceMiles,
    durationSeconds: session.durationSeconds,
    averageSpeedMph: session.averageSpeedMph,
    maxSpeedMph: session.maxSpeedMph,
    firstFrameAt: sorted[0]?.capturedAt ?? null,
    lastFrameAt: sorted[sorted.length - 1]?.capturedAt ?? null,
    frameCount: frames.length,
    uploadedCount: uploadedFrames.length,
  });
});

// ── GET /portal/sessions/:id/route ──────────────────────────────────────────

router.get("/sessions/:id/route", async (req, res) => {
  const parsed = GetPortalSessionRouteParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const [session] = await db
    .select()
    .from(portalSessionsTable)
    .where(eq(portalSessionsTable.id, parsed.data.id));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Use stored route_geojson if available; otherwise derive from frame coordinates
  if (session.routeGeojson) {
    res.json({ geojson: session.routeGeojson });
    return;
  }

  const frames = await db
    .select({ latitude: portalFramesTable.latitude, longitude: portalFramesTable.longitude })
    .from(portalFramesTable)
    .where(eq(portalFramesTable.portalSessionId, parsed.data.id))
    .orderBy(portalFramesTable.frameIndex);

  const coords = frames.map((f): [number, number] => [f.latitude, f.longitude]);
  res.json({ geojson: buildLineString(coords) });
});

// ── GET /portal/share/:token ─────────────────────────────────────────────────

router.get("/share/:token", async (req, res) => {
  const parsed = GetPortalShareSessionParams.safeParse({ token: req.params.token });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  const [session] = await db
    .select()
    .from(portalSessionsTable)
    .where(eq(portalSessionsTable.publicShareToken, parsed.data.token));

  if (!session) {
    res.status(404).json({ error: "Share link not found" });
    return;
  }

  const authedUserId = (req as AuthedRequest).userId;
  res.json({
    ...omitClaimToken(session),
    isOwnedByCurrentUser: authedUserId != null ? session.userId === authedUserId : false,
  });
});

// ── POST /portal/import/mock ─────────────────────────────────────────────────
// Generates a realistic demo Geospector session with 12 frames along
// the Guadalupe River Trail in San Jose, CA.
// Geospector mobile app integration point: this endpoint mirrors the shape of
// data the app will eventually POST via /portal/publish/session.

router.post("/import/mock", async (req, res) => {
  const sessionUUID = randomUUID();
  const shareToken = randomUUID();

  // Sample route: Guadalupe River Trail, San Jose, CA
  // Coordinates ordered south→north along the trail
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

  // Compute metrics
  const coords = routePoints.map((p): [number, number] => [p.lat, p.lon]);
  const dist = haversineDistanceMiles(coords);
  const durationSec = routePoints.length * 3; // 3 seconds between frames
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const maxSpeed = Math.max(...speeds);
  const geojson = buildLineString(coords);

  // Insert session
  const startedAt = baseTime;
  const endedAt = new Date(baseTime.getTime() + durationSec * 1000);
  // No random photos for demo sessions — real captures come from the app
  const thumbnailUrl = null;

  const [session] = await db
    .insert(portalSessionsTable)
    .values({
      sessionId: sessionUUID,
      title: "Guadalupe River Trail Survey — Demo",
      startedAt,
      endedAt,
      captureMode: "fixed",
      totalFrames: routePoints.length,
      uploadedFrames: routePoints.length,
      totalDistanceMiles: dist,
      durationSeconds: durationSec,
      averageSpeedMph: avgSpeed,
      maxSpeedMph: maxSpeed,
      routeGeojson: geojson as unknown as Record<string, unknown>,
      sourceType: "import",
      publicShareToken: shareToken,
      status: "active",
      thumbnailUrl,
    } satisfies InsertPortalSession)
    .returning();

  if (!session) {
    res.status(500).json({ error: "Failed to create session" });
    return;
  }

  // Insert frames
  const frameValues: InsertPortalFrame[] = routePoints.map((pt, i) => ({
    portalSessionId: session.id,
    frameIndex: i,
    capturedAt: new Date(baseTime.getTime() + i * 3000),
    latitude: pt.lat,
    longitude: pt.lon,
    heading: pt.heading,
    speedMph: speeds[i] ?? 20,
    imageUrl: null,
    thumbnailUrl: null,
    uploadStatus: "uploaded",
    metadata: null,
  }));

  await db.insert(portalFramesTable).values(frameValues);

  res.json(session);
});

// ── POST /portal/import/session-json ────────────────────────────────────────
// Accepts { session, frames } JSON — mirrors the shape Geospector mobile app
// will eventually use for direct publishing via /portal/publish/session.

router.post("/import/session-json", requireAuth, async (req, res) => {
  const parsed = ImportPortalSessionJsonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { session: rawSession, frames: rawFrames } = parsed.data;
  const s0 = rawSession as Record<string, unknown>;
  const incomingSessionId = s0["session_id"] ?? s0["sessionId"];

  // Deduplication: if we already have a session with this sessionId, return it
  if (incomingSessionId) {
    const [existing] = await db
      .select()
      .from(portalSessionsTable)
      .where(eq(portalSessionsTable.sessionId, String(incomingSessionId)));
    if (existing) {
      res.status(200).json({ ...omitClaimToken(existing), alreadyPublished: true });
      return;
    }
  }

  // Map raw frame objects to typed frames
  const mappedFrames = (rawFrames as Array<Record<string, unknown>>).map((f, i) => {
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
      speed: f["speed_mph"] ?? f["speedMph"] ?? f["speed"] ?? null,
      heading: f["heading"] ?? null,
      imageUrl,
      thumbnailUrl: imageUrl ?? (f["thumbnail_url"] ?? f["thumbnailUrl"] ?? null) as string | null,
      capturedAt: new Date(String(f["timestamp"] ?? f["captured_at"] ?? f["capturedAt"] ?? new Date())),
      frameIndex: Number(f["frame_index"] ?? f["frameIndex"] ?? i),
      uploadStatus: String(f["upload_status"] ?? f["uploadStatus"] ?? "uploaded"),
    };
  });

  const coords = mappedFrames.map((f): [number, number] => [f.lat, f.lon]);
  const geojson = buildLineString(coords);
  const sortedFrames = [...mappedFrames].sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
  const metrics = computeMetrics(
    mappedFrames.map((f) => ({
      latitude: f.lat,
      longitude: f.lon,
      speedMph: f.speed !== null ? Number(f.speed) : null,
      capturedAt: f.capturedAt,
    })),
  );

  const s = rawSession as Record<string, unknown>;
  const sessionId = String(s["session_id"] ?? s["sessionId"] ?? randomUUID());
  const shareToken = randomUUID();
  const makePublic = s["isPublic"] === true || s["is_public"] === true;
  const submitterEmail = (s["submitterEmail"] ?? s["submitter_email"] ?? null) as string | null;

  const [session] = await db
    .insert(portalSessionsTable)
    .values({
      sessionId,
      title: (s["title"] as string | undefined) ?? null,
      startedAt: sortedFrames[0]?.capturedAt ?? null,
      endedAt: sortedFrames[sortedFrames.length - 1]?.capturedAt ?? null,
      captureMode: (s["capture_mode"] ?? s["captureMode"]) as string | null ?? null,
      totalFrames: mappedFrames.length,
      uploadedFrames: mappedFrames.filter((f) => f.uploadStatus === "uploaded").length,
      ...metrics,
      routeGeojson: geojson as unknown as Record<string, unknown>,
      sourceType: "atlas",
      publicShareToken: shareToken,
      submitterEmail: submitterEmail ?? undefined,
      status: "active",
      thumbnailUrl: mappedFrames[0]?.imageUrl ?? null,
      isPublic: makePublic,
      publishedAt: makePublic ? new Date() : null,
      userId: (req as AuthedRequest).userId ?? undefined,
    } satisfies InsertPortalSession)
    .returning();

  if (!session) {
    res.status(500).json({ error: "Failed to create session" });
    return;
  }

  const frameValues: InsertPortalFrame[] = mappedFrames.map((f) => ({
    portalSessionId: session.id,
    frameIndex: f.frameIndex,
    capturedAt: f.capturedAt,
    latitude: f.lat,
    longitude: f.lon,
    heading: f.heading !== null ? Number(f.heading) : null,
    speedMph: f.speed !== null ? Number(f.speed) : null,
    imageUrl: f.imageUrl,
    thumbnailUrl: f.thumbnailUrl,
    uploadStatus: f.uploadStatus,
    metadata: null,
  }));

  await db.insert(portalFramesTable).values(frameValues);

  res.json(omitClaimToken(session));
});

// ── POST /portal/import/gpx ──────────────────────────────────────────────────
// Parses a GPX XML string and creates a session from its <trkpt> elements.
// TODO: For large files, stream parsing and batch-insert frames for performance.

router.post("/import/gpx", async (req, res) => {
  const parsed = ImportPortalGpxBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body — gpx field required" });
    return;
  }

  const { gpx: gpxXml, title, frames: supplementalFrames } = parsed.data;

  let trkpts: Array<{ lat: number; lon: number; time?: string; ele?: number }>;
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed = parser.parse(gpxXml as string);
    const trk = parsed?.gpx?.trk;
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
        ele: pt["ele"] ? Number(pt["ele"]) : undefined,
      };
    });
  } catch {
    res.status(400).json({ error: "Failed to parse GPX XML" });
    return;
  }

  if (trkpts.length === 0) {
    res.status(400).json({ error: "No trackpoints found in GPX file" });
    return;
  }

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
      speedMph: sup["speed_mph"] ?? sup["speedMph"] ? Number(sup["speed_mph"] ?? sup["speedMph"]) : null,
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

  const shareToken = randomUUID();
  const sessionId = randomUUID();

  const [session] = await db
    .insert(portalSessionsTable)
    .values({
      sessionId,
      title: title ?? null,
      startedAt: sortedFrames[0]?.capturedAt ?? null,
      endedAt: sortedFrames[sortedFrames.length - 1]?.capturedAt ?? null,
      captureMode: null,
      totalFrames: mappedFrames.length,
      uploadedFrames: mappedFrames.length,
      totalDistanceMiles: dist,
      durationSeconds: durationSec,
      averageSpeedMph: null,
      maxSpeedMph: null,
      routeGeojson: geojson as unknown as Record<string, unknown>,
      sourceType: "import",
      publicShareToken: shareToken,
      status: "active",
      thumbnailUrl: mappedFrames[0]?.imageUrl ?? null,
    } satisfies InsertPortalSession)
    .returning();

  if (!session) {
    res.status(500).json({ error: "Failed to create session" });
    return;
  }

  const frameValues: InsertPortalFrame[] = mappedFrames.map((f) => ({
    portalSessionId: session.id,
    frameIndex: f.frameIndex,
    capturedAt: f.capturedAt,
    latitude: f.latitude,
    longitude: f.longitude,
    heading: f.heading,
    speedMph: f.speedMph,
    imageUrl: f.imageUrl,
    thumbnailUrl: f.thumbnailUrl,
    uploadStatus: f.uploadStatus,
    metadata: null,
  }));

  await db.insert(portalFramesTable).values(frameValues);

  res.json(session);
});

// ── GET /portal/feed ─────────────────────────────────────────────────────────

router.get("/feed", async (req, res) => {
  const parsed = GetPortalFeedQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const limit = parsed.data.limit ?? 50;
  const offset = parsed.data.offset ?? 0;

  const [sessions, [statsRow]] = await Promise.all([
    db
      .select()
      .from(portalSessionsTable)
      .where(eq(portalSessionsTable.isPublic, true))
      .orderBy(desc(portalSessionsTable.publishedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({
        totalPublic: count(),
        totalPublicDistanceMiles: sql<number>`coalesce(sum(${portalSessionsTable.totalDistanceMiles}), 0)`,
      })
      .from(portalSessionsTable)
      .where(eq(portalSessionsTable.isPublic, true)),
  ]);

  res.json({
    sessions: sessions.map(omitClaimToken),
    totalPublic: statsRow?.totalPublic ?? 0,
    totalPublicDistanceMiles: Number(statsRow?.totalPublicDistanceMiles ?? 0),
  });
});

// ── PATCH /portal/sessions/:id/publish ───────────────────────────────────────

router.patch("/sessions/:id/publish", async (req, res) => {
  const paramParsed = PublishPortalSessionParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const bodyParsed = PublishPortalSessionBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body — isPublic required" });
    return;
  }

  const { isPublic } = bodyParsed.data;

  const [session] = await db
    .update(portalSessionsTable)
    .set({
      isPublic,
      publishedAt: isPublic ? new Date() : null,
    })
    .where(eq(portalSessionsTable.id, paramParsed.data.id))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(omitClaimToken(session));
});

// ── POST /portal/sessions/:id/request-delete ─────────────────────────────────
// Sends a one-time delete link to the email that was provided at submit time.
// Always responds with the same generic message regardless of match to prevent
// email enumeration.

const RequestDeleteBody = z.object({
  email: z.string().email(),
});

/**
 * Returns the trusted portal base URL, derived entirely from server-side
 * environment variables. Never uses client-supplied data.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function getPortalBaseUrl(): string {
  if (process.env.PORTAL_BASE_URL) {
    return process.env.PORTAL_BASE_URL.replace(/\/$/, "");
  }
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  if (replitDomain) {
    return `https://${replitDomain}/geospector-portal`;
  }
  return "https://geospector.mach7technologies.com";
}

router.post("/sessions/:id/request-delete", async (req, res) => {
  const paramParsed = GetPortalSessionParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const bodyParsed = RequestDeleteBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const { email } = bodyParsed.data;
  const portalBaseUrl = getPortalBaseUrl();
  const genericOk = { sent: true, message: "If that email matches our records, you'll receive a delete link shortly." };

  const [session] = await db
    .select()
    .from(portalSessionsTable)
    .where(eq(portalSessionsTable.id, paramParsed.data.id));

  if (!session || !session.submitterEmail) {
    // No session or no email stored — respond generically (no enumeration)
    res.json(genericOk);
    return;
  }

  if (session.submitterEmail.toLowerCase() !== email.toLowerCase()) {
    res.json(genericOk);
    return;
  }

  // Generate a 1-hour delete token
  const deleteToken = randomUUID();
  const deleteTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db
    .update(portalSessionsTable)
    .set({ deleteToken, deleteTokenExpiresAt })
    .where(eq(portalSessionsTable.id, session.id));

  const resendKey = process.env.RESEND_EMAIL_KEY;
  if (!resendKey) {
    // Email not configured — still return OK so UI doesn't expose server state
    res.json(genericOk);
    return;
  }

  const base = portalBaseUrl.replace(/\/$/, "");
  const deleteUrl = `${base}/delete/${deleteToken}`;
  const sessionTitle = escapeHtml(session.title ?? session.sessionId);

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
    // Email send failure is silent — user sees generic OK
  }

  res.json(genericOk);
});

// ── DELETE /portal/sessions/:id ─────────────────────────────────────────────
// Sessions with a userId (atlas): require matching Clerk auth.
// Import/demo sessions (no userId): deleted directly with no auth required.

router.delete("/sessions/:id", async (req, res) => {
  const paramParsed = GetPortalSessionParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const [session] = await db
    .select()
    .from(portalSessionsTable)
    .where(eq(portalSessionsTable.id, paramParsed.data.id));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Sessions with an owner require matching Clerk auth
  if (session.userId) {
    const authedReq = req as AuthedRequest;
    if (!authedReq.userId || authedReq.userId !== session.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  await db
    .delete(portalSessionsTable)
    .where(eq(portalSessionsTable.id, session.id));

  res.json({ deleted: true, id: session.id });
});

// ── TODO: Future publish endpoints ───────────────────────────────────────────
// These will be added once the Geospector mobile app supports direct publishing.
//
// TODO: POST /api/publish/session
//   — Direct publish from Geospector mobile app
//   — Body: { sessionId, title, captureMode, startedAt, endedAt, frameCount }
//   — Creates a portal session record and returns an upload token
//
// TODO: POST /api/publish/frame-batch
//   — Batch frame upload from Geospector mobile app
//   — Body: { sessionId, frames: FrameMetadata[] }
//   — Associates uploaded Supabase Storage image URLs with frame records
//
// TODO: POST /api/ingest/supabase-manifest
//   — Pull session data from a Supabase Storage manifest file
//   — Body: { supabaseUrl, bucketName, manifestPath, anonKey }
//   — Downloads manifest JSON, parses sessions/frames, inserts into portal DB

// ── Authenticated user endpoints ─────────────────────────────────────────────

router.get("/my-sessions", requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  const sessions = await db
    .select()
    .from(portalSessionsTable)
    .where(eq(portalSessionsTable.userId, authedReq.userId!))
    .orderBy(desc(portalSessionsTable.createdAt));
  res.json(sessions.map(omitSensitiveFields));
});

router.delete("/my-sessions/:id", requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const [session] = await db
    .select()
    .from(portalSessionsTable)
    .where(
      and(
        eq(portalSessionsTable.id, id),
        eq(portalSessionsTable.userId, authedReq.userId!)
      )
    );

  if (!session) {
    res.status(404).json({ error: "Session not found or not owned by you" });
    return;
  }

  await db.delete(portalFramesTable).where(eq(portalFramesTable.portalSessionId, id));
  await db.delete(portalSessionsTable).where(eq(portalSessionsTable.id, id));

  res.json({ deleted: true, id });
});

export default router;
