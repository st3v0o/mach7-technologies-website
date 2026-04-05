import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CaptureSession } from './types';

const SESSIONS_KEY = '@external_camera_sessions';
const MAX_SESSIONS = 200;

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function loadSessions(): Promise<CaptureSession[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CaptureSession[];
  } catch {
    return [];
  }
}

export async function loadSession(sessionId: string): Promise<CaptureSession | null> {
  const all = await loadSessions();
  return all.find(s => s.sessionId === sessionId) ?? null;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function saveSession(session: CaptureSession): Promise<void> {
  const all = await loadSessions();
  const idx = all.findIndex(s => s.sessionId === session.sessionId);
  if (idx >= 0) {
    all[idx] = session;
  } else {
    all.push(session);
  }
  // Trim to MAX_SESSIONS (oldest first)
  const trimmed = all.slice(-MAX_SESSIONS);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
}

export async function deleteSession(sessionId: string): Promise<void> {
  const all = await loadSessions();
  const filtered = all.filter(s => s.sessionId !== sessionId);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
}

export async function clearAllSessions(): Promise<void> {
  await AsyncStorage.removeItem(SESSIONS_KEY);
}

// ─── Session ID ───────────────────────────────────────────────────────────────

export function generateSessionId(): string {
  const now = new Date();
  const ts = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '_')
    .slice(0, 15);
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `ext_session_${ts}_${rand}`;
}
