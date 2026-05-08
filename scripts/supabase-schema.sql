-- ============================================================
-- Geospector Atlas — Supabase schema migration
-- Run this entire script in:
--   Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ── portal_sessions ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_sessions (
  id                     SERIAL PRIMARY KEY,
  title                  TEXT,
  session_id             TEXT        NOT NULL UNIQUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at             TIMESTAMPTZ,
  ended_at               TIMESTAMPTZ,
  capture_mode           TEXT,
  total_frames           INTEGER     NOT NULL DEFAULT 0,
  uploaded_frames        INTEGER     NOT NULL DEFAULT 0,
  total_distance_miles   REAL,
  duration_seconds       INTEGER,
  average_speed_mph      REAL,
  max_speed_mph          REAL,
  route_geojson          JSONB,
  source_type            TEXT        NOT NULL DEFAULT 'import',
  public_share_token     TEXT        UNIQUE,
  submitter_email        TEXT,
  delete_token           TEXT        UNIQUE,
  delete_token_expires_at TIMESTAMPTZ,
  status                 TEXT        NOT NULL DEFAULT 'active',
  thumbnail_url          TEXT,
  is_public              BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at           TIMESTAMPTZ,
  user_id                TEXT
);

COMMENT ON COLUMN portal_sessions.session_id       IS 'UUID from the Geospector mobile app';
COMMENT ON COLUMN portal_sessions.source_type      IS '''supabase'' | ''webhook'' | ''import'' | ''atlas''';
COMMENT ON COLUMN portal_sessions.public_share_token IS 'Random UUID for /share/:token links';
COMMENT ON COLUMN portal_sessions.delete_token     IS 'Short-lived token emailed for the delete-link flow';
COMMENT ON COLUMN portal_sessions.status           IS '''active'' | ''archived''';
COMMENT ON COLUMN portal_sessions.user_id          IS 'Auth user ID of the authenticated submitter (nullable — anonymous OK)';

-- ── portal_frames ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_frames (
  id                 SERIAL PRIMARY KEY,
  portal_session_id  INTEGER     NOT NULL REFERENCES portal_sessions(id) ON DELETE CASCADE,
  frame_index        INTEGER     NOT NULL,
  captured_at        TIMESTAMPTZ NOT NULL,
  latitude           REAL        NOT NULL,
  longitude          REAL        NOT NULL,
  heading            REAL,
  speed_mph          REAL,
  image_url          TEXT,
  thumbnail_url      TEXT,
  upload_status      TEXT        NOT NULL DEFAULT 'uploaded',
  metadata           JSONB
);

COMMENT ON COLUMN portal_frames.upload_status IS '''pending'' | ''uploaded'' | ''failed''';

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_portal_sessions_session_id
  ON portal_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_portal_sessions_public_share_token
  ON portal_sessions(public_share_token);

CREATE INDEX IF NOT EXISTS idx_portal_sessions_user_id
  ON portal_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_portal_sessions_is_public
  ON portal_sessions(is_public);

CREATE INDEX IF NOT EXISTS idx_portal_frames_portal_session_id
  ON portal_frames(portal_session_id);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_frames   ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS automatically in Supabase — no policy needed.

-- anon (and authenticated) may SELECT sessions that have been made public.
-- Required for: Atlas public feed, /share/:token pages.
CREATE POLICY "anon can read public sessions"
  ON portal_sessions
  FOR SELECT
  TO anon, authenticated
  USING (is_public = TRUE);

-- anon (and authenticated) may SELECT frames whose parent session is public.
-- Required for: share page map + frame list rendering.
CREATE POLICY "anon can read frames of public sessions"
  ON portal_frames
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_sessions ps
      WHERE ps.id = portal_frames.portal_session_id
        AND ps.is_public = TRUE
    )
  );

-- ── Role grants ──────────────────────────────────────────────
-- Required because "Automatically expose new tables" is disabled.
-- Without these, PostgREST returns "permission denied" even for service_role.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON portal_sessions TO service_role;
GRANT ALL ON portal_frames TO service_role;
GRANT USAGE, SELECT ON SEQUENCE portal_sessions_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE portal_frames_id_seq TO service_role;

GRANT SELECT ON portal_sessions TO anon, authenticated;
GRANT SELECT ON portal_frames TO anon, authenticated;

-- ── Done ──────────────────────────────────────────────────────
-- After running this script:
--   1. Go to Supabase Dashboard → Settings → API
--   2. Copy the "service_role" legacy key (eyJ... format)
--   3. Add it as SUPABASE_SERVICE_ROLE_KEY in your Replit secrets
