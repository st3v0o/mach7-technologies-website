import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogEntry } from '@/contexts/RecordingContext';

const ATLAS_SUBMISSIONS_KEY = '@atlas_submissions';

export interface AtlasShareInput {
  portalBaseUrl: string;
  sessionId: string;
  entries: LogEntry[];
  jobName?: string;
  submitterEmail?: string | null;
  authToken?: string | null;
}

export interface AtlasShareResult {
  shareUrl: string;
  claimToken: string;
  atlasId: number;
  alreadyPublished: boolean;
}

export async function shareViaAtlas(input: AtlasShareInput): Promise<AtlasShareResult> {
  const { portalBaseUrl, sessionId, entries, jobName, submitterEmail, authToken } = input;
  const baseUrl = portalBaseUrl.replace(/\/+$/, '');

  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

  const firstTs = sorted[0]?.timestamp ?? Date.now();
  const dateLabel = new Date(firstTs).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const title = jobName ? `${jobName} — ${dateLabel}` : null;

  const frames = sorted.map((e, i) => ({
    frameIndex: i,
    capturedAt: new Date(e.timestamp).toISOString(),
    latitude: e.latitude,
    longitude: e.longitude,
    imageUrl: e.supabaseUrl ?? null,
    thumbnailUrl: e.supabaseUrl ?? null,
    uploadStatus: e.supabaseUrl ? 'uploaded' : 'local',
  }));

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${baseUrl}/api/portal/import/session-json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      session: {
        sessionId,
        title,
        captureMode: null,
        isPublic: true,
        submitterEmail: submitterEmail ?? null,
      },
      frames,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  if (data.alreadyPublished) {
    const shareToken: string = data.publicShareToken ?? '';
    const shareUrl = shareToken ? `${baseUrl}/share/${shareToken}` : '';
    return {
      shareUrl,
      claimToken: '',
      atlasId: typeof data.id === 'number' ? data.id : 0,
      alreadyPublished: true,
    };
  }

  const shareToken: string = data.publicShareToken ?? '';
  if (!shareToken) {
    throw new Error('Server did not return a share token. Upload may have failed.');
  }

  const shareUrl = `${baseUrl}/share/${shareToken}`;
  const claimToken: string = typeof data.claimToken === 'string' ? data.claimToken : '';
  const atlasId: number = typeof data.id === 'number' ? data.id : 0;

  if (claimToken && atlasId) {
    try {
      const existing = await AsyncStorage.getItem(ATLAS_SUBMISSIONS_KEY);
      const submissions: Record<string, { atlasId: number; claimToken: string }> = existing
        ? JSON.parse(existing)
        : {};
      submissions[sessionId] = { atlasId, claimToken };
      await AsyncStorage.setItem(ATLAS_SUBMISSIONS_KEY, JSON.stringify(submissions));
    } catch {
      // non-fatal — token also returned to caller
    }
  }

  return { shareUrl, claimToken, atlasId, alreadyPublished: false };
}
