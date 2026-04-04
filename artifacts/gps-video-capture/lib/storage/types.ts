export type StorageProviderType = 'none' | 'supabase' | 'webhook';

export interface StorageConfigNone {
  provider: 'none';
}

export interface StorageConfigSupabase {
  provider: 'supabase';
  url: string;
  anonKey: string;
  bucket: string;
  table: string;
}

export interface StorageConfigWebhook {
  provider: 'webhook';
  url: string;
  bearerToken?: string;
}

export type StorageConfig =
  | StorageConfigNone
  | StorageConfigSupabase
  | StorageConfigWebhook;

export interface UploadableFrame {
  id: string;
  sessionId: string;
  filename: string;
  localPath: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  segmentName: string;
}

export interface TestResult {
  ok: boolean;
  error?: string;
}
