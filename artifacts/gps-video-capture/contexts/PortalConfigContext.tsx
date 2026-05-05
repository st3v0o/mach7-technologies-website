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
    jobName?: string
  ) => Promise<{ alreadyPublished: boolean; claimToken?: string; atlasId?: number }>;
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
        title: jobName ? `${jobName} — ${new Date(sorted[0]?.timestamp ?? Date.now()).toLocaleDateString(getCurrentLocale(), { month: 'short', day: 'numeric', year: 'numeric' })}` : null,
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

      if (data.claimToken && typeof data.id === 'number') {
        await storeAtlasSubmission(sessionId, { atlasId: data.id, claimToken: data.claimToken });
      }

      return {
        alreadyPublished: data.alreadyPublished === true,
        claimToken: typeof data.claimToken === 'string' ? data.claimToken : undefined,
        atlasId: typeof data.id === 'number' ? data.id : undefined,
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
