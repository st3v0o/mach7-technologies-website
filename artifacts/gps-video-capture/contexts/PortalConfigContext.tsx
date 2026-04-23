import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { LogEntry } from '@/contexts/RecordingContext';

const PORTAL_URL_KEY = '@portal_url';
const PORTAL_PUBLISHED_IDS_KEY = '@portal_published_ids';

const DEFAULT_PORTAL_URL: string = (() => {
  if (process.env.EXPO_PUBLIC_PORTAL_URL) return process.env.EXPO_PUBLIC_PORTAL_URL;
  if (process.env.EXPO_PUBLIC_EXPO_DEV_DOMAIN)
    return `https://${process.env.EXPO_PUBLIC_EXPO_DEV_DOMAIN}`;
  if (process.env.EXPO_PUBLIC_DOMAIN) return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  return '';
})();

interface PortalConfigContextType {
  portalUrl: string;
  setPortalUrl: (url: string) => Promise<void>;
  publishedSessionIds: Set<string>;
  isPublished: (sessionId: string) => boolean;
  publishSession: (
    sessionId: string,
    entries: LogEntry[],
    jobName?: string
  ) => Promise<{ alreadyPublished: boolean }>;
}

const PortalConfigContext = createContext<PortalConfigContextType | null>(null);

export function PortalConfigProvider({ children }: { children: React.ReactNode }) {
  const [portalUrl, setPortalUrlState] = useState<string>(DEFAULT_PORTAL_URL);
  const [publishedSessionIds, setPublishedSessionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PORTAL_URL_KEY),
      AsyncStorage.getItem(PORTAL_PUBLISHED_IDS_KEY),
    ]).then(([storedUrl, storedIds]) => {
      if (storedUrl !== null) setPortalUrlState(storedUrl);
      if (storedIds) {
        try {
          const ids: string[] = JSON.parse(storedIds);
          setPublishedSessionIds(new Set(ids));
        } catch {
          // ignore corrupt data
        }
      }
    }).catch(() => {});
  }, []);

  const setPortalUrl = useCallback(async (url: string) => {
    const trimmed = url.trim();
    setPortalUrlState(trimmed);
    await AsyncStorage.setItem(PORTAL_URL_KEY, trimmed);
  }, []);

  const markPublished = useCallback(async (sessionId: string) => {
    setPublishedSessionIds((prev) => {
      const next = new Set(prev);
      next.add(sessionId);
      AsyncStorage.setItem(PORTAL_PUBLISHED_IDS_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const isPublished = useCallback(
    (sessionId: string) => publishedSessionIds.has(sessionId),
    [publishedSessionIds]
  );

  const publishSession = useCallback(
    async (
      sessionId: string,
      entries: LogEntry[],
      jobName?: string
    ): Promise<{ alreadyPublished: boolean }> => {
      const baseUrl = portalUrl.replace(/\/+$/, '');
      if (!baseUrl) throw new Error('Portal URL is not configured. Set it in Settings.');

      const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

      const frames = sorted.map((e, i) => ({
        frameIndex: i,
        capturedAt: new Date(e.timestamp).toISOString(),
        latitude: e.latitude,
        longitude: e.longitude,
        imageUrl: e.supabaseUrl ?? null,
        thumbnailUrl: e.supabaseUrl ?? null,
        uploadStatus: e.supabaseUrl ? 'uploaded' : 'local',
      }));

      const session = {
        sessionId,
        title: jobName ? `${jobName} — ${new Date(sorted[0]?.timestamp ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : null,
        captureMode: null,
        isPublic: true,
      };

      const response = await fetch(`${baseUrl}/api/portal/import/session-json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, frames }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(`Portal returned ${response.status}: ${text}`);
      }

      const data = await response.json();
      await markPublished(sessionId);
      return { alreadyPublished: data.alreadyPublished === true };
    },
    [portalUrl, markPublished]
  );

  return (
    <PortalConfigContext.Provider
      value={{ portalUrl, setPortalUrl, publishedSessionIds, isPublished, publishSession }}
    >
      {children}
    </PortalConfigContext.Provider>
  );
}

export function usePortalConfig() {
  const ctx = useContext(PortalConfigContext);
  if (!ctx) throw new Error('usePortalConfig must be used within PortalConfigProvider');
  return ctx;
}
