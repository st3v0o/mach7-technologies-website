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

export interface TestResult {
  success: boolean;
  error?: string;
  testedAt: number;
}

interface StorageConfigContextType {
  providerType: StorageProviderType;
  providerLabel: string;
  isCloudConfigured: boolean;
  connectionVerified: boolean;
  lastTestResult: TestResult | null;
  isEnvPreconfigured: boolean;
  uploadFrame: (params: UploadFrameParams) => Promise<string>;
  testConnection: () => Promise<{ success: boolean; error?: string }>;
  reloadConfig: () => Promise<void>;
  clearConfig: () => void;
}

const StorageConfigContext = createContext<StorageConfigContextType | null>(null);

const CONFIG_STORAGE_KEY = '@gps_storage_config';
const TEST_RESULT_KEY = '@gps_storage_test_result';

export interface StorageConfig {
  providerType: StorageProviderType;
  supabaseUrl?: string;
  supabaseKey?: string;
  supabaseBucket?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

const ENV_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const ENV_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const ENV_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_BUCKET ?? '';
const HAS_ENV_CONFIG = Boolean(ENV_URL && ENV_KEY && ENV_BUCKET);

const ENV_CONFIG: StorageConfig = {
  providerType: 'supabase',
  supabaseUrl: ENV_URL,
  supabaseKey: ENV_KEY,
  supabaseBucket: ENV_BUCKET,
};

export async function testCredentials(config: StorageConfig): Promise<{ success: boolean; error?: string }> {
  try {
    if (config.providerType === 'supabase') {
      if (!config.supabaseUrl || !config.supabaseKey || !config.supabaseBucket) {
        return { success: false, error: 'Missing Supabase credentials' };
      }
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(config.supabaseUrl, config.supabaseKey);
      const { error } = await supabase.storage
        .from(config.supabaseBucket)
        .list('', { limit: 1 });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    if (config.providerType === 'webhook') {
      if (!config.webhookUrl) return { success: false, error: 'Missing webhook URL' };
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.webhookSecret) headers['x-webhook-secret'] = config.webhookSecret;
      const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ test: true, timestamp: Date.now() }),
      });
      if (!res.ok) return { success: false, error: `Endpoint returned HTTP ${res.status}` };
      return { success: true };
    }

    return { success: false, error: 'No provider configured' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

type ConfigSource = 'env' | 'user' | 'none';

export function StorageConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<StorageConfig>({ providerType: 'none' });
  const [configSource, setConfigSource] = useState<ConfigSource>('none');
  const [lastTestResult, setLastTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CONFIG_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          setConfig(JSON.parse(raw) as StorageConfig);
          setConfigSource('user');
        } else if (HAS_ENV_CONFIG) {
          setConfig(ENV_CONFIG);
          setConfigSource('env');
        }
      })
      .catch(() => {});

    AsyncStorage.getItem(TEST_RESULT_KEY)
      .then((raw) => {
        if (raw) setLastTestResult(JSON.parse(raw) as TestResult);
      })
      .catch(() => {});
  }, []);

  const isCloudConfigured =
    (config.providerType === 'supabase' &&
      Boolean(config.supabaseUrl) &&
      Boolean(config.supabaseKey) &&
      Boolean(config.supabaseBucket)) ||
    (config.providerType === 'webhook' && Boolean(config.webhookUrl));

  const connectionVerified = lastTestResult?.success === true;

  const isEnvPreconfigured = HAS_ENV_CONFIG && configSource === 'env';

  const testConnection = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const result = await testCredentials(config);
    const testResult: TestResult = { ...result, testedAt: Date.now() };
    setLastTestResult(testResult);
    AsyncStorage.setItem(TEST_RESULT_KEY, JSON.stringify(testResult)).catch(() => {});
    return result;
  }, [config]);

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

  const reloadConfig = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
      if (raw) {
        setConfig(JSON.parse(raw) as StorageConfig);
        setConfigSource('user');
      } else if (HAS_ENV_CONFIG) {
        setConfig(ENV_CONFIG);
        setConfigSource('env');
      } else {
        setConfig({ providerType: 'none' });
        setConfigSource('none');
      }
    } catch {}
    try {
      const raw = await AsyncStorage.getItem(TEST_RESULT_KEY);
      setLastTestResult(raw ? (JSON.parse(raw) as TestResult) : null);
    } catch {}
  }, []);

  const clearConfig = useCallback(() => {
    AsyncStorage.removeItem(CONFIG_STORAGE_KEY).catch(() => {});
    AsyncStorage.removeItem(TEST_RESULT_KEY).catch(() => {});
    setLastTestResult(null);
    if (HAS_ENV_CONFIG) {
      setConfig(ENV_CONFIG);
      setConfigSource('env');
    } else {
      setConfig({ providerType: 'none' });
      setConfigSource('none');
    }
  }, []);

  const providerLabel = PROVIDER_LABELS[config.providerType] ?? 'Unknown';

  return (
    <StorageConfigContext.Provider
      value={{
        providerType: config.providerType,
        providerLabel,
        isCloudConfigured,
        connectionVerified,
        lastTestResult,
        isEnvPreconfigured,
        uploadFrame,
        testConnection,
        reloadConfig,
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
