import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { uploadFrameSupabase, testSupabaseConnection } from '@/lib/storage/supabaseAdapter';
import { uploadFrameWebhook, testWebhookConnection } from '@/lib/storage/webhookAdapter';
import {
  StorageConfig,
  StorageProviderType,
  TestResult,
  UploadableFrame,
} from '@/lib/storage/types';

const STORAGE_CONFIG_KEY = '@gps_storage_config';

export const PROVIDER_LABELS: Record<StorageProviderType, string> = {
  none: 'Local Only',
  supabase: 'Supabase',
  webhook: 'Custom Webhook',
};

interface StorageConfigContextType {
  config: StorageConfig | null;
  isLoaded: boolean;
  isCloudConfigured: boolean;
  providerType: StorageProviderType;
  providerLabel: string;
  saveConfig: (config: StorageConfig) => Promise<void>;
  clearConfig: () => Promise<void>;
  uploadFrame: (frame: UploadableFrame) => Promise<string>;
  testConnection: (config: StorageConfig) => Promise<TestResult>;
}

const StorageConfigContext = createContext<StorageConfigContextType | null>(null);

export function StorageConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_CONFIG_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setConfig(JSON.parse(raw));
          } catch {}
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const saveConfig = useCallback(async (next: StorageConfig) => {
    await AsyncStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(next));
    setConfig(next);
  }, []);

  const clearConfig = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_CONFIG_KEY);
    setConfig(null);
  }, []);

  const uploadFrame = useCallback(
    async (frame: UploadableFrame): Promise<string> => {
      if (!config || config.provider === 'none') return '';
      if (config.provider === 'supabase') return uploadFrameSupabase(config, frame);
      if (config.provider === 'webhook') return uploadFrameWebhook(config, frame);
      return '';
    },
    [config]
  );

  const testConnection = useCallback(
    async (cfg: StorageConfig): Promise<TestResult> => {
      if (cfg.provider === 'none') return { ok: true };
      if (cfg.provider === 'supabase') return testSupabaseConnection(cfg);
      if (cfg.provider === 'webhook') return testWebhookConnection(cfg);
      return { ok: false, error: 'Unknown provider' };
    },
    []
  );

  const providerType: StorageProviderType = config?.provider ?? 'none';
  const isCloudConfigured = config !== null && config.provider !== 'none';

  return (
    <StorageConfigContext.Provider
      value={{
        config,
        isLoaded,
        isCloudConfigured,
        providerType,
        providerLabel: PROVIDER_LABELS[providerType],
        saveConfig,
        clearConfig,
        uploadFrame,
        testConnection,
      }}
    >
      {children}
    </StorageConfigContext.Provider>
  );
}

export function useStorageConfig() {
  const ctx = useContext(StorageConfigContext);
  if (!ctx) throw new Error('useStorageConfig must be used within StorageConfigProvider');
  return ctx;
}
