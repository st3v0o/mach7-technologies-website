import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { LogEntry } from '@/contexts/RecordingContext';

export interface AtlasShareInput {
  portalBaseUrl: string;
  sessionId: string;
  entries: LogEntry[];
  jobName?: string;
  authToken?: string | null;
}

export const LOCAL_PHOTO_RELAY_LIMIT = 50;

export interface AtlasShareResult {
  shareUrl: string;
  atlasId: number;
  alreadyPublished: boolean;
  skippedLocalPhotos: number;
}

async function getLocalImageBase64(localPath: string): Promise<string | null> {
  try {
    const info = await ImageManipulator.manipulateAsync(localPath, [], {
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 1.0,
    });
    const longEdge = Math.max(info.width, info.height);
    const resizeActions = longEdge > 1024
      ? [info.width >= info.height ? { resize: { width: 1024 } } : { resize: { height: 1024 } }]
      : [];
    const result = await ImageManipulator.manipulateAsync(
      localPath,
      resizeActions,
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    const base64 = await FileSystem.readAsStringAsync(result.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch {
    return null;
  }
}

export async function shareViaAtlas(input: AtlasShareInput): Promise<AtlasShareResult> {
  const { portalBaseUrl, sessionId, entries, jobName, authToken } = input;
  const baseUrl = portalBaseUrl.replace(/\/+$/, '');

  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

  const firstTs = sorted[0]?.timestamp ?? Date.now();
  const dateLabel = new Date(firstTs).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const title = jobName ? `${jobName} — ${dateLabel}` : null;

  let localRelayCount = 0;
  let skippedLocalPhotos = 0;

  const frames = await Promise.all(
    sorted.map(async (e, i) => {
      let imageData: string | null = null;
      if (!e.supabaseUrl && e.localPath) {
        if (localRelayCount < LOCAL_PHOTO_RELAY_LIMIT) {
          localRelayCount++;
          imageData = await getLocalImageBase64(e.localPath);
        } else {
          skippedLocalPhotos++;
        }
      }
      return {
        frameIndex: i,
        capturedAt: new Date(e.timestamp).toISOString(),
        latitude: e.latitude,
        longitude: e.longitude,
        imageUrl: e.supabaseUrl ?? null,
        thumbnailUrl: e.supabaseUrl ?? null,
        uploadStatus: e.supabaseUrl ? 'uploaded' : imageData ? 'relayed' : 'local',
        ...(imageData ? { imageData } : {}),
      };
    })
  );

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
    return { shareUrl, atlasId: typeof data.id === 'number' ? data.id : 0, alreadyPublished: true, skippedLocalPhotos };
  }

  const shareToken: string = data.publicShareToken ?? '';
  if (!shareToken) {
    throw new Error('Server did not return a share token. Upload may have failed.');
  }

  const shareUrl = `${baseUrl}/share/${shareToken}`;
  const atlasId: number = typeof data.id === 'number' ? data.id : 0;

  return { shareUrl, atlasId, alreadyPublished: false, skippedLocalPhotos };
}
