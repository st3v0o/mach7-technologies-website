import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type StorageProviderType = 'none' | 'supabase' | 'webhook';

export const PROVIDER_LABELS: Record<StorageProviderType, string> = {
  none: 'Local Only',
  supabase: 'Supabase',
  webhook: 'Webhook',
};

interface UploadFrameParams {
  id: string;
  sessionId: string;
  filename: string;
  localPath: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  segmentName: string;
}

interface StorageConfigContextType {
  providerType: StorageProviderType;
  providerLabel: string;
  isCloudConfigured: boolean;
  uploadFrame: (params: UploadFrameParams) => Promise<string>;
  clearConfig: () => void;
}

const StorageConfigContext = createContext<StorageConfigContextType | null>(null);

const CONFIG_STORAGE_KEY = '@gps_storage_config';

interface StorageConfig {
  providerType: StorageProviderType;
  supabaseUrl?: string;
  supabaseKey?: string;
  supabaseBucket?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export function StorageConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<StorageConfig>({ providerType: 'none' });

  useEffect(() => {
    AsyncStorage.getItem(CONFIG_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed: StorageConfig = JSON.parse(raw);
          setConfig(parsed);
        }
      })
      .catch(() => {});
  }, []);

  const isCloudConfigured =
    (config.providerType === 'supabase' &&
      Boolean(config.supabaseUrl) &&
      Boolean(config.supabaseKey) &&
      Boolean(config.supabaseBucket)) ||
    (config.providerType === 'webhook' && Boolean(config.webhookUrl));

  const uploadFrame = useCallback(
    async (params: UploadFrameParams): Promise<string> => {
      if (!isCloudConfigured) throw new Error('No cloud storage configured');

      if (config.providerType === 'supabase') {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(config.supabaseUrl!, config.supabaseKey!);
        const FileSystem = await import('expo-file-system/legacy');
        const base64 = await FileSystem.readAsStringAsync(params.localPath, {
          encoding: 'base64',
        });
        const path = `${params.sessionId}/${params.filename}`;
        const { error } = await supabase.storage
          .from(config.supabaseBucket!)
          .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from(config.supabaseBucket!).getPublicUrl(path);
        return data.publicUrl;
      }

      if (config.providerType === 'webhook') {
        const FileSystem = await import('expo-file-system/legacy');
        const base64 = await FileSystem.readAsStringAsync(params.localPath, {
          encoding: 'base64',
        });
        const body = JSON.stringify({ ...params, imageBase64: base64 });
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (config.webhookSecret) headers['x-webhook-secret'] = config.webhookSecret;
        const res = await fetch(config.webhookUrl!, { method: 'POST', headers, body });
        if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
        const json = await res.json();
        return typeof json?.url === 'string' ? json.url : '';
      }

      throw new Error('Unsupported provider');
    },
    [config, isCloudConfigured]
  );

  const clearConfig = useCallback(() => {
    const cleared: StorageConfig = { providerType: 'none' };
    setConfig(cleared);
    AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cleared)).catch(() => {});
  }, []);

  const providerLabel = PROVIDER_LABELS[config.providerType] ?? 'Unknown';

  return (
    <StorageConfigContext.Provider
      value={{
        providerType: config.providerType,
        providerLabel,
        isCloudConfigured,
        uploadFrame,
        clearConfig,
      }}
    >
      {children}
    </StorageConfigContext.Provider>
  );
}

export function useStorageConfig(): StorageConfigContextType {
  const ctx = useContext(StorageConfigContext);
  if (!ctx) throw new Error('useStorageConfig must be used within StorageConfigProvider');
  return ctx;
}

function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
