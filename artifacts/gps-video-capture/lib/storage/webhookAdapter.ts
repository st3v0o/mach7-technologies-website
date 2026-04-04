import { StorageConfigWebhook, UploadableFrame } from './types';

export async function uploadFrameWebhook(
  config: StorageConfigWebhook,
  item: UploadableFrame
): Promise<string> {
  const FileSystem = await import('expo-file-system/legacy');
  const base64 = await FileSystem.readAsStringAsync(item.localPath, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.bearerToken) {
    headers['Authorization'] = `Bearer ${config.bearerToken}`;
  }

  const body = JSON.stringify({
    session_id: item.sessionId,
    filename: item.filename,
    timestamp: item.timestamp,
    latitude: item.latitude,
    longitude: item.longitude,
    segment_name: item.segmentName,
    image_base64: base64,
  });

  const res = await fetch(config.url, { method: 'POST', headers, body });

  if (!res.ok) {
    throw new Error(`Webhook responded with HTTP ${res.status}`);
  }

  try {
    const json = await res.json();
    return json.url ?? json.publicUrl ?? json.location ?? '';
  } catch {
    return '';
  }
}

export async function testWebhookConnection(
  config: StorageConfigWebhook
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.bearerToken) {
      headers['Authorization'] = `Bearer ${config.bearerToken}`;
    }

    const res = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ _ping: true }),
    });

    if (res.status >= 500) {
      return { ok: false, error: `Server error: HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
