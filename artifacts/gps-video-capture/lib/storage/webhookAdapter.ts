import { AuthType, StorageConfigWebhook, UploadableFrame } from './types';

function humaniseError(status: number): string {
  if (status === 400) return 'Bad request (HTTP 400) — the server rejected the payload format.';
  if (status === 401) return 'Unauthorized (HTTP 401) — check your token or API key.';
  if (status === 403) return 'Forbidden (HTTP 403) — the server rejected your credentials.';
  if (status === 404) return 'Not found (HTTP 404) — double-check the endpoint URL.';
  if (status === 405) return 'Method not allowed (HTTP 405) — try switching POST ↔ PUT.';
  if (status === 413) return 'Payload too large (HTTP 413) — try multipart instead of JSON.';
  if (status === 415) return 'Unsupported media type (HTTP 415) — check the body format setting.';
  if (status >= 500) return `Server error (HTTP ${status}) — your endpoint is reachable but returned an error.`;
  return `HTTP ${status}`;
}

function buildHeaders(
  config: StorageConfigWebhook,
  contentType?: string
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = contentType;

  const authType: AuthType = config.authType ?? (config.bearerToken ? 'bearer' : 'none');
  const authValue = config.authValue ?? config.bearerToken ?? '';

  switch (authType) {
    case 'bearer':
      if (authValue) headers['Authorization'] = `Bearer ${authValue}`;
      break;
    case 'api-key':
      if (config.authHeader && authValue) headers[config.authHeader] = authValue;
      break;
    case 'basic': {
      const user = config.authUsername ?? '';
      if (user && authValue) {
        headers['Authorization'] = `Basic ${btoa(`${user}:${authValue}`)}`;
      }
      break;
    }
    case 'none':
    default:
      break;
  }

  for (const h of config.customHeaders ?? []) {
    if (h.key.trim() && h.value.trim()) headers[h.key.trim()] = h.value.trim();
  }

  return headers;
}

export async function uploadFrameWebhook(
  config: StorageConfigWebhook,
  item: UploadableFrame
): Promise<string> {
  const method = config.method ?? 'POST';
  const bodyFormat = config.bodyFormat ?? 'json';

  let headers: Record<string, string>;
  let body: BodyInit;

  if (bodyFormat === 'multipart') {
    headers = buildHeaders(config);
    const formData = new FormData();
    formData.append('image', {
      uri: item.localPath,
      name: item.filename,
      type: 'image/jpeg',
    } as unknown as Blob);
    formData.append('session_id', item.sessionId);
    formData.append('filename', item.filename);
    formData.append('timestamp', String(item.timestamp));
    formData.append('latitude', String(item.latitude));
    formData.append('longitude', String(item.longitude));
    formData.append('segment_name', item.segmentName);
    body = formData;
  } else {
    headers = buildHeaders(config, 'application/json');
    const FileSystem = await import('expo-file-system/legacy');
    const base64 = await (FileSystem as any).readAsStringAsync(item.localPath, {
      encoding: (FileSystem as any).EncodingType.Base64,
    });
    body = JSON.stringify({
      session_id: item.sessionId,
      filename: item.filename,
      timestamp: item.timestamp,
      latitude: item.latitude,
      longitude: item.longitude,
      segment_name: item.segmentName,
      image_base64: base64,
    });
  }

  const res = await fetch(config.url, { method, headers, body });

  if (!res.ok) {
    throw new Error(humaniseError(res.status));
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
    const method = config.method ?? 'POST';
    const bodyFormat = config.bodyFormat ?? 'json';

    let headers: Record<string, string>;
    let body: BodyInit | undefined;

    if (bodyFormat === 'multipart') {
      headers = buildHeaders(config);
      const form = new FormData();
      form.append('_ping', 'true');
      body = form;
    } else {
      headers = buildHeaders(config, 'application/json');
      body = JSON.stringify({ _ping: true });
    }

    const res = await fetch(config.url, { method, headers, body });

    if (res.status >= 500) {
      return { ok: false, error: humaniseError(res.status) };
    }
    if (res.status === 401) return { ok: false, error: humaniseError(401) };
    if (res.status === 403) return { ok: false, error: humaniseError(403) };
    if (res.status === 405) return { ok: false, error: humaniseError(405) };
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Network request failed') || msg.includes('fetch')) {
      return {
        ok: false,
        error: 'Could not reach the server. Check the URL and your internet connection.',
      };
    }
    return { ok: false, error: msg };
  }
}
