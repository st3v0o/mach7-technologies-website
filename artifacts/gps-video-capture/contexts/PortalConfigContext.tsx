import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { LogEntry } from '@/contexts/RecordingContext';
import { getCurrentLocale } from '@/src/i18n';
import { shareViaAtlas } from '@/lib/atlas-share';

const PORTAL_URL_KEY = '@portal_url';
const PORTAL_PUBLISHED_IDS_KEY = '@portal_published_ids';
const ATLAS_SUBMISSIONS_KEY = '@atlas_submissions';

const DEFAULT_PORTAL_URL: string = (() => {
  if (process.env.EXPO_PUBLIC_PORTAL_URL) return process.env.EXPO_PUBLIC_PORTAL_URL;
  if (process.env.EXPO_PUBLIC_EXPO_DEV_DOMAIN)
    return `https://${process.env.EXPO_PUBLIC_EXPO_DEV_DOMAIN}`;
  if (process.env.EXPO_PUBLIC_DOMAIN) return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  return '';
})();

export interface AtlasSubmission {
  atlasId: number;
  claimToken: string;
}

interface PortalConfigContextType {
  portalUrl: string;
  setPortalUrl: (url: string) => Promise<void>;
  publishedSessionIds: Set<string>;
  isPublished: (sessionId: string) => boolean;
  publishSession: (
    sessionId: string,
    entries: LogEntry[],
    jobName?: string,
    submitterEmail?: string
  ) => Promise<{ alreadyPublished: boolean; claimToken?: string; atlasId?: number; shareUrl?: string }>;
  atlasSubmissions: Record<string, AtlasSubmission>;
  removeFromAtlas: (sessionId: string) => Promise<void>;
  importAtlasSubmissions: (incoming: Record<string, AtlasSubmission>) => Promise<{ added: number; skipped: number }>;
}

const PortalConfigContext = createContext<PortalConfigContextType | null>(null);

export function PortalConfigProvider({ children }: { children: React.ReactNode }) {
  const [portalUrl, setPortalUrlState] = useState<string>(DEFAULT_PORTAL_URL);
  const [publishedSessionIds, setPublishedSessionIds] = useState<Set<string>>(new Set());
  const [atlasSubmissions, setAtlasSubmissions] = useState<Record<string, AtlasSubmission>>({});

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PORTAL_URL_KEY),
      AsyncStorage.getItem(PORTAL_PUBLISHED_IDS_KEY),
      AsyncStorage.getItem(ATLAS_SUBMISSIONS_KEY),
    ]).then(([storedUrl, storedIds, storedAtlas]) => {
      if (storedUrl !== null) setPortalUrlState(storedUrl);
      if (storedIds) {
        try {
          const ids: string[] = JSON.parse(storedIds);
          setPublishedSessionIds(new Set(ids));
        } catch {
          // ignore corrupt data
        }
      }
      if (storedAtlas) {
        try {
          setAtlasSubmissions(JSON.parse(storedAtlas));
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

  const storeAtlasSubmission = useCallback(async (sessionId: string, sub: AtlasSubmission) => {
    setAtlasSubmissions((prev) => {
      const next = { ...prev, [sessionId]: sub };
      AsyncStorage.setItem(ATLAS_SUBMISSIONS_KEY, JSON.stringify(next)).catch(() => {});
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
      submitterEmail?: string
    ): Promise<{ alreadyPublished: boolean; claimToken?: string; atlasId?: number; shareUrl?: string }> => {
      const baseUrl = portalUrl.replace(/\/+$/, '');
      if (!baseUrl) throw new Error('Portal URL is not configured. Set it in Settings.');

      const result = await shareViaAtlas({
        portalBaseUrl: baseUrl,
        sessionId,
        entries,
        jobName,
        submitterEmail,
      });

      await markPublished(sessionId);

      if (result.claimToken && result.atlasId) {
        await storeAtlasSubmission(sessionId, {
          atlasId: result.atlasId,
          claimToken: result.claimToken,
        });
      }

      return {
        alreadyPublished: result.alreadyPublished,
        claimToken: result.claimToken || undefined,
        atlasId: result.atlasId || undefined,
        shareUrl: result.shareUrl || undefined,
      };
    },
    [portalUrl, markPublished, storeAtlasSubmission]
  );

  const importAtlasSubmissions = useCallback(
    async (incoming: Record<string, AtlasSubmission>): Promise<{ added: number; skipped: number }> => {
      let added = 0;
      let skipped = 0;
      setAtlasSubmissions((prev) => {
        const next = { ...prev };
        for (const [sessionId, sub] of Object.entries(incoming)) {
          if (
            sub &&
            typeof sub.atlasId === 'number' &&
            typeof sub.claimToken === 'string' &&
            sub.claimToken.length > 0
          ) {
            if (next[sessionId]) {
              skipped++;
            } else {
              next[sessionId] = sub;
              added++;
            }
          }
        }
        AsyncStorage.setItem(ATLAS_SUBMISSIONS_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      return { added, skipped };
    },
    []
  );

  const removeFromAtlas = useCallback(
    async (sessionId: string) => {
      const submission = atlasSubmissions[sessionId];
      if (!submission) throw new Error('No Atlas submission found for this session.');

      const baseUrl = portalUrl.replace(/\/+$/, '');
      if (!baseUrl) throw new Error('Portal URL is not configured.');

      const response = await fetch(
        `${baseUrl}/api/portal/sessions/${submission.atlasId}?token=${encodeURIComponent(submission.claimToken)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(`Remove failed (${response.status}): ${text}`);
      }

      setAtlasSubmissions((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        AsyncStorage.setItem(ATLAS_SUBMISSIONS_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });

      setPublishedSessionIds((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        AsyncStorage.setItem(PORTAL_PUBLISHED_IDS_KEY, JSON.stringify([...next])).catch(() => {});
        return next;
      });
    },
    [atlasSubmissions, portalUrl]
  );

  return (
    <PortalConfigContext.Provider
      value={{
        portalUrl,
        setPortalUrl,
        publishedSessionIds,
        isPublished,
        publishSession,
        atlasSubmissions,
        removeFromAtlas,
        importAtlasSubmissions,
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
