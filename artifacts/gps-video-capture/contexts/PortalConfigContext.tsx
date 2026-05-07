import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useAuth } from '@clerk/expo';

import { LogEntry } from '@/contexts/RecordingContext';
import { shareViaAtlas } from '@/lib/atlas-share';

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
    jobName?: string,
  ) => Promise<{ alreadyPublished: boolean; atlasId?: number; shareUrl?: string }>;
}

const PortalConfigContext = createContext<PortalConfigContextType | null>(null);

export function PortalConfigProvider({ children }: { children: React.ReactNode }) {
  const [portalUrl, setPortalUrlState] = useState<string>(DEFAULT_PORTAL_URL);
  const [publishedSessionIds, setPublishedSessionIds] = useState<Set<string>>(new Set());

  const { getToken, isSignedIn } = useAuth();

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
      jobName?: string,
    ): Promise<{ alreadyPublished: boolean; atlasId?: number; shareUrl?: string }> => {
      if (!isSignedIn) {
        throw new Error('You must be signed in to publish to Atlas.');
      }

      const baseUrl = portalUrl.replace(/\/+$/, '');
      if (!baseUrl) throw new Error('Portal URL is not configured. Set it in Settings.');

      let authToken: string | null = null;
      try {
        authToken = await getToken();
      } catch {
        // non-fatal — API will reject with 401 if auth fails
      }

      const result = await shareViaAtlas({
        portalBaseUrl: baseUrl,
        sessionId,
        entries,
        jobName,
        authToken,
      });

      await markPublished(sessionId);

      return {
        alreadyPublished: result.alreadyPublished,
        atlasId: result.atlasId || undefined,
        shareUrl: result.shareUrl || undefined,
      };
    },
    [portalUrl, markPublished, getToken, isSignedIn]
  );

  return (
    <PortalConfigContext.Provider
      value={{
        portalUrl,
        setPortalUrl,
        publishedSessionIds,
        isPublished,
        publishSession,
      }}
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
