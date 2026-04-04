import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { useStorageConfig } from '@/contexts/StorageConfigContext';
import { LogEntry } from './RecordingContext';

export type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface UploadQueueItem {
  id: string;
  sessionId: string;
  filename: string;
  localPath: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  segmentName: string;
  retries: number;
  status: UploadStatus;
  remoteUrl?: string;
}

export interface UploadLog {
  time: number;
  level: 'info' | 'error';
  message: string;
}

interface UploadContextType {
  isCloudConfigured: boolean;
  isOnline: boolean;
  pendingCount: number;
  uploadedCount: number;
  failedCount: number;
  isProcessing: boolean;
  queue: UploadQueueItem[];
  queueLoaded: boolean;
  uploadLogs: UploadLog[];
  enqueueFrames: (entries: LogEntry[]) => void;
  retryFailed: () => void;
  clearQueue: () => void;
  clearLogs: () => void;
  getItemStatus: (id: string) => UploadStatus | null;
  getItemUrl: (id: string) => string | undefined;
}

const UploadContext = createContext<UploadContextType | null>(null);

const QUEUE_STORAGE_KEY = '@gps_upload_queue';
const MAX_RETRIES = 3;

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const { isCloudConfigured, uploadFrame } = useStorageConfig();

  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([]);
  const processingRef = useRef(false);
  const queueRef = useRef<UploadQueueItem[]>([]);

  const appendLog = useCallback((level: 'info' | 'error', message: string) => {
    setUploadLogs((prev) => [...prev, { time: Date.now(), level, message }]);
  }, []);

  const clearLogs = useCallback(() => {
    setUploadLogs([]);
  }, []);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    loadQueue();
    if (Platform.OS === 'web') {
      setQueueLoaded(true);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    import('@react-native-community/netinfo').then((NetInfo) => {
      unsubscribe = NetInfo.default.addEventListener((state) => {
        setIsOnline(state.isConnected ?? true);
      });
      NetInfo.default.fetch().then((state) => {
        setIsOnline(state.isConnected ?? true);
      });
    }).catch(() => {
      setIsOnline(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loadQueue = async () => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        const loaded: UploadQueueItem[] = JSON.parse(raw);
        const reset = loaded.map((item) =>
          item.status === 'uploading' ? { ...item, status: 'pending' as UploadStatus } : item
        );
        setQueue(reset);
      }
    } catch {}
    setQueueLoaded(true);
  };

  const persistQueue = async (q: UploadQueueItem[]) => {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(q));
    } catch {}
  };

  const updateQueue = useCallback((updater: (prev: UploadQueueItem[]) => UploadQueueItem[]) => {
    setQueue((prev) => {
      const next = updater(prev);
      persistQueue(next);
      return next;
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (!isCloudConfigured || processingRef.current || Platform.OS === 'web') return;

    processingRef.current = true;
    setIsProcessing(true);

    while (true) {
      const currentQueue = queueRef.current;
      const pendingItem = currentQueue.find((i) => i.status === 'pending' && i.retries < MAX_RETRIES);
      if (!pendingItem || !isOnline) break;

      updateQueue((prev) =>
        prev.map((i) => (i.id === pendingItem.id ? { ...i, status: 'uploading' } : i))
      );

      try {
        const remoteUrl = await uploadFrame({
          id: pendingItem.id,
          sessionId: pendingItem.sessionId,
          filename: pendingItem.filename,
          localPath: pendingItem.localPath,
          timestamp: pendingItem.timestamp,
          latitude: pendingItem.latitude,
          longitude: pendingItem.longitude,
          segmentName: pendingItem.segmentName,
        });
        updateQueue((prev) =>
          prev.map((i) =>
            i.id === pendingItem.id
              ? { ...i, status: 'uploaded', remoteUrl }
              : i
          )
        );
        appendLog('info', `✓ ${pendingItem.filename}`);
      } catch (err: unknown) {
        const nextRetries = pendingItem.retries + 1;
        const nextStatus: UploadStatus = nextRetries >= MAX_RETRIES ? 'failed' : 'pending';
        updateQueue((prev) =>
          prev.map((i) =>
            i.id === pendingItem.id
              ? { ...i, status: nextStatus, retries: nextRetries }
              : i
          )
        );
        const msg = err instanceof Error ? err.message : String(err);
        appendLog('error', `✗ ${pendingItem.filename}: ${msg}`);
      }
    }

    processingRef.current = false;
    setIsProcessing(false);
  }, [isCloudConfigured, isOnline, updateQueue, appendLog, uploadFrame]);

  useEffect(() => {
    if (isOnline && isCloudConfigured && queue.some((i) => i.status === 'pending')) {
      processQueue();
    }
  }, [isOnline, isCloudConfigured, queue, processQueue]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    AsyncStorage.removeItem(QUEUE_STORAGE_KEY).catch(() => {});
  }, []);

  const enqueueFrames = useCallback(
    (entries: LogEntry[]) => {
      if (!isCloudConfigured || Platform.OS === 'web' || !queueLoaded) return;

      const existingIds = new Set(queueRef.current.map((i) => i.id));
      const newItems: UploadQueueItem[] = entries
        .filter((e) => !existingIds.has(e.id) && Boolean(e.sessionId))
        .map((e) => ({
          id: e.id,
          sessionId: e.sessionId,
          filename: e.filename,
          localPath: e.localPath,
          timestamp: e.timestamp,
          latitude: e.latitude,
          longitude: e.longitude,
          segmentName: e.videoSegment,
          retries: 0,
          status: 'pending',
        }));

      if (newItems.length === 0) return;
      updateQueue((prev) => [...prev, ...newItems]);
    },
    [isCloudConfigured, updateQueue, queueLoaded]
  );

  const retryFailed = useCallback(() => {
    updateQueue((prev) =>
      prev.map((i) => (i.status === 'failed' ? { ...i, status: 'pending', retries: 0 } : i))
    );
  }, [updateQueue]);

  const getItemStatus = useCallback(
    (id: string): UploadStatus | null => {
      const item = queue.find((i) => i.id === id);
      return item ? item.status : null;
    },
    [queue]
  );

  const getItemUrl = useCallback(
    (id: string): string | undefined => {
      return queue.find((i) => i.id === id)?.remoteUrl;
    },
    [queue]
  );

  const pendingCount = queue.filter((i) => i.status === 'pending' || i.status === 'uploading').length;
  const uploadedCount = queue.filter((i) => i.status === 'uploaded').length;
  const failedCount = queue.filter((i) => i.status === 'failed').length;

  return (
    <UploadContext.Provider
      value={{
        isCloudConfigured,
        isOnline,
        pendingCount,
        uploadedCount,
        failedCount,
        isProcessing,
        queue,
        queueLoaded,
        uploadLogs,
        enqueueFrames,
        retryFailed,
        clearQueue,
        clearLogs,
        getItemStatus,
        getItemUrl,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUpload must be used within UploadProvider');
  return ctx;
}
