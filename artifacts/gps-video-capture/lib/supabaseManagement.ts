const BASE = 'https://api.supabase.com/v1';

export interface SupabaseProject {
  id: string;
  name: string;
  region: string;
  status: string;
  organization_id: string;
}

export interface SupabaseBucket {
  id: string;
  name: string;
  public: boolean;
}

async function mgmtFetch<T>(pat: string, path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.message ?? body?.error ?? '';
    } catch {}
    throw new Error(detail || `Request failed (HTTP ${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function listProjects(pat: string): Promise<SupabaseProject[]> {
  const data = await mgmtFetch<SupabaseProject[]>(pat, '/projects');
  if (!Array.isArray(data)) throw new Error('Unexpected response from Supabase API');
  return data;
}

export async function getAnonKey(pat: string, projectRef: string): Promise<string> {
  const keys = await mgmtFetch<Array<{ name: string; api_key: string }>>(
    pat,
    `/projects/${projectRef}/api-keys`
  );
  const anon = keys.find((k) => k.name === 'anon');
  if (!anon) throw new Error('No anon key found for this project');
  return anon.api_key;
}

export async function listBuckets(pat: string, projectRef: string): Promise<SupabaseBucket[]> {
  const data = await mgmtFetch<SupabaseBucket[]>(
    pat,
    `/projects/${projectRef}/storage/buckets`
  );
  if (!Array.isArray(data)) return [];
  return data;
}
