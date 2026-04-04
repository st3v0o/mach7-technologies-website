import { StorageConfigSupabase, UploadableFrame } from './types';

export async function uploadFrameSupabase(
  config: StorageConfigSupabase,
  item: UploadableFrame
): Promise<string> {
  const { createClient } = await import('@supabase/supabase-js');
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

  const client = createClient(config.url, config.anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  const FileSystem = await import('expo-file-system/legacy');
  const base64 = await FileSystem.readAsStringAsync(item.localPath, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const storagePath = `${item.sessionId}/${item.filename}`;

  const { error: uploadError } = await client.storage
    .from(config.bucket)
    .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: false });

  const alreadyExists =
    uploadError &&
    (uploadError.message?.toLowerCase().includes('already exists') ||
      (uploadError as any)?.statusCode === 409 ||
      (uploadError as any)?.statusCode === '409' ||
      (uploadError as any)?.error === 'Duplicate');

  if (uploadError && !alreadyExists) {
    throw new Error(`[storage] ${uploadError.message}`);
  }

  const { data: urlData } = client.storage
    .from(config.bucket)
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  const { error: dbError } = await client.from(config.table).insert({
    session_id: item.sessionId,
    filename: item.filename,
    url: publicUrl,
    timestamp: item.timestamp,
    latitude: item.latitude,
    longitude: item.longitude,
    segment_name: item.segmentName,
  });

  if (dbError) throw new Error(`[db] ${dbError.message}`);

  return publicUrl;
}

export async function testSupabaseConnection(
  config: StorageConfigSupabase
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

    const client = createClient(config.url, config.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { error } = await client.storage.getBucket(config.bucket);
    if (error) {
      if (error.message?.toLowerCase().includes('not found')) {
        return { ok: false, error: `Bucket "${config.bucket}" not found. Check bucket name.` };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
