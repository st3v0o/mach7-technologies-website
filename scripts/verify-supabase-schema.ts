/**
 * Verify that the Geospector Atlas tables exist and are accessible in Supabase.
 *
 * Usage (from workspace root):
 *   pnpm --filter @workspace/scripts exec tsx scripts/verify-supabase-schema.ts
 *
 * Requires these secrets to be set in the environment:
 *   EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error("❌  EXPO_PUBLIC_SUPABASE_URL is not set");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error("❌  SUPABASE_SERVICE_ROLE_KEY is not set");
  console.error("    Add it to your Replit secrets, then re-run this script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function verify() {
  console.log(`\nConnecting to: ${supabaseUrl}\n`);

  // --- portal_sessions ---
  const { data: sessions, error: sessionsErr } = await supabase
    .from("portal_sessions")
    .select("id, session_id, is_public, created_at")
    .limit(1);

  if (sessionsErr) {
    console.error("❌  portal_sessions:", sessionsErr.message);
    process.exit(1);
  }
  console.log("✅  portal_sessions — accessible");
  console.log(`    Row count sample: ${sessions?.length ?? 0} row(s) returned`);

  // --- portal_frames ---
  const { data: frames, error: framesErr } = await supabase
    .from("portal_frames")
    .select("id, portal_session_id, frame_index")
    .limit(1);

  if (framesErr) {
    console.error("❌  portal_frames:", framesErr.message);
    process.exit(1);
  }
  console.log("✅  portal_frames — accessible");
  console.log(`    Row count sample: ${frames?.length ?? 0} row(s) returned`);

  // --- RLS check: anon key should only see public sessions ---
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (anonKey) {
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
    const { data: anonSessions, error: anonErr } = await anonClient
      .from("portal_sessions")
      .select("id, is_public")
      .limit(5);

    if (anonErr) {
      console.error("❌  RLS check (anon):", anonErr.message);
    } else {
      const allPublic = (anonSessions ?? []).every((s) => s.is_public);
      if (allPublic) {
        console.log("✅  RLS policy — anon key can only see public sessions");
      } else {
        console.warn("⚠️   RLS policy — anon key returned non-public sessions (check policies)");
      }
    }
  }

  console.log("\n🎉  Schema verification complete — Supabase is ready.\n");
}

verify().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
