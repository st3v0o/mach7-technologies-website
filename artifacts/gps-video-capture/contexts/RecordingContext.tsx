import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Sharing from 'expo-sharing';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

export interface GpsPoint {
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
}

export interface LogEntry {
  id: string;
  filename: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  videoSegment: string;
  localPath: string;
  videoPath: string;
}

export type GpsStatus = 'idle' | 'searching' | 'locked' | 'denied';
export type ProcessingStatus = 'idle' | 'processing' | 'error';

interface RecordingContextType {
  gpsStatus: GpsStatus;
  currentGps: GpsPoint | null;
  processingStatus: ProcessingStatus;
  processingProgress: number;
  totalFrames: number;
  segmentCount: number;
  logEntries: LogEntry[];
  gpsPointsRef: React.MutableRefObject<GpsPoint[]>;
  startGps: () => Promise<void>;
  stopGps: () => void;
  processSegment: (
    uri: string,
    segmentNum: number,
    startTime: number,
    durationMs: number
  ) => Promise<void>;
  shareLog: () => Promise<void>;
  clearLog: () => Promise<void>;
}

const RecordingContext = createContext<RecordingContextType | null>(null);
const STORAGE_KEY = '@gps_capture_log';
const CSV_HEADER = 'filename,timestamp,latitude,longitude,video_segment,local_path,video_path\n';

function findNearestGps(timestamp: number, points: GpsPoint[]): GpsPoint | null {
  if (points.length === 0) return null;
  let nearest = points[0];
  let minDiff = Math.abs(timestamp - points[0].timestamp);
  for (const p of points) {
    const diff = Math.abs(timestamp - p.timestamp);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = p;
    }
  }
  return nearest;
}

async function getOrCreatePaths(): Promise<{ framesDir: string; videosDir: string; csvPath: string }> {
  const FileSystem = await import('expo-file-system/legacy');
  const base = FileSystem.documentDirectory + 'gps-capture/';
  const framesDir = base + 'frames/';
  const videosDir = base + 'segments/';
  const csvPath = base + 'log.csv';

  const framesDirInfo = await FileSystem.getInfoAsync(framesDir);
  if (!framesDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(framesDir, { intermediates: true });
  }
  const videosDirInfo = await FileSystem.getInfoAsync(videosDir);
  if (!videosDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(videosDir, { intermediates: true });
  }
  const csvInfo = await FileSystem.getInfoAsync(csvPath);
  if (!csvInfo.exists) {
    await FileSystem.writeAsStringAsync(csvPath, CSV_HEADER);
  }
  return { framesDir, videosDir, csvPath };
}

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [currentGps, setCurrentGps] = useState<GpsPoint | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [segmentCount, setSegmentCount] = useState(0);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  const gpsPointsRef = useRef<GpsPoint[]>([]);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const nativePathsRef = useRef<{ framesDir: string; videosDir: string; csvPath: string } | null>(null);

  useEffect(() => {
    loadLog();
    if (Platform.OS !== 'web') {
      getOrCreatePaths()
        .then((p) => { nativePathsRef.current = p; })
        .catch(() => {});
    }
  }, []);

  const loadLog = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setLogEntries(JSON.parse(raw));
    } catch {}
  };

  const saveLog = async (entries: LogEntry[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {}
  };

  const startGps = useCallback(async () => {
    if (Platform.OS === 'web') return;
    setGpsStatus('searching');
    gpsPointsRef.current = [];

    const [fgPerm] = await Location.requestForegroundPermissionsAsync();
    if (!fgPerm.granted) {
      setGpsStatus('denied');
      return;
    }

    try {
      locationSubRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (loc) => {
          const point: GpsPoint = {
            timestamp: loc.timestamp,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            speed: loc.coords.speed,
          };
          gpsPointsRef.current.push(point);
          setCurrentGps(point);
          setGpsStatus('locked');
        }
      );
    } catch {
      setGpsStatus('denied');
    }
  }, []);

  const stopGps = useCallback(() => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
    setGpsStatus('idle');
    setCurrentGps(null);
  }, []);

  const processSegment = useCallback(
    async (uri: string, segmentNum: number, startTime: number, durationMs: number) => {
      if (Platform.OS === 'web') return;

      setProcessingStatus('processing');
      setProcessingProgress(0);
      setSegmentCount((n) => n + 1);

      const snapshotPoints = [...gpsPointsRef.current];
      const segmentName = `seg_${String(segmentNum).padStart(3, '0')}`;
      const newEntries: LogEntry[] = [];

      try {
        const FileSystem = await import('expo-file-system/legacy');
        const VideoThumbnails = await import('expo-video-thumbnails');

        if (!nativePathsRef.current) {
          nativePathsRef.current = await getOrCreatePaths();
        }
        const { framesDir, videosDir, csvPath } = nativePathsRef.current;

        // Persist the video segment to named permanent storage
        const videoDestPath = videosDir + `${segmentName}.mp4`;
        await FileSystem.copyAsync({ from: uri, to: videoDestPath });

        // Extract frames at 1fps over exact segment duration
        const step = 1000;
        let csvAppend = '';
        let frameIndex = 0;

        for (let t = 0; t <= durationMs; t += step) {
          try {
            const thumb = await VideoThumbnails.getThumbnailAsync(uri, {
              time: t,
              quality: 0.7,
            });

            const absTimestamp = startTime + t;
            const nearest = findNearestGps(absTimestamp, snapshotPoints);

            if (nearest) {
              const filename = `${segmentName}_f${String(frameIndex).padStart(4, '0')}_${absTimestamp}.jpg`;
              const destPath = framesDir + filename;

              await FileSystem.copyAsync({ from: thumb.uri, to: destPath });

              const entry: LogEntry = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
                filename,
                timestamp: absTimestamp,
                latitude: nearest.latitude,
                longitude: nearest.longitude,
                videoSegment: segmentName,
                localPath: destPath,
                videoPath: videoDestPath,
              };
              newEntries.push(entry);

              const lat = nearest.latitude.toFixed(7);
              const lon = nearest.longitude.toFixed(7);
              const ts = new Date(absTimestamp).toISOString();
              csvAppend += `${filename},${ts},${lat},${lon},${segmentName},${destPath},${videoDestPath}\n`;

              frameIndex++;
              setProcessingProgress(Math.min((t / durationMs) * 100, 99));
              setTotalFrames((n) => n + 1);
            }
          } catch {
            // Frame at this timestamp unavailable — stop extraction
            break;
          }
        }

        if (csvAppend) {
          const existing = await FileSystem.readAsStringAsync(csvPath).catch(() => CSV_HEADER);
          await FileSystem.writeAsStringAsync(csvPath, existing + csvAppend);
        }

        if (newEntries.length > 0) {
          setLogEntries((prev) => {
            const updated = [...prev, ...newEntries];
            saveLog(updated);
            return updated;
          });
        }
      } catch {
        setProcessingStatus('error');
        return;
      }

      setProcessingStatus('idle');
      setProcessingProgress(0);
    },
    []
  );

  const shareLog = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      if (!nativePathsRef.current) {
        nativePathsRef.current = await getOrCreatePaths();
      }
      const { csvPath } = nativePathsRef.current;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(csvPath, {
          mimeType: 'text/csv',
          dialogTitle: 'Share GPS Frame Log',
        });
      }
    } catch {}
  }, []);

  const clearLog = useCallback(async () => {
    setLogEntries([]);
    setTotalFrames(0);
    setSegmentCount(0);
    await AsyncStorage.removeItem(STORAGE_KEY);
    if (Platform.OS !== 'web') {
      try {
        const FileSystem = await import('expo-file-system/legacy');
        if (nativePathsRef.current) {
          await FileSystem.deleteAsync(nativePathsRef.current.csvPath, { idempotent: true });
          await FileSystem.deleteAsync(nativePathsRef.current.framesDir, { idempotent: true });
          await FileSystem.deleteAsync(nativePathsRef.current.videosDir, { idempotent: true });
        }
        nativePathsRef.current = await getOrCreatePaths();
      } catch {}
    }
  }, []);

  return (
    <RecordingContext.Provider
      value={{
        gpsStatus,
        currentGps,
        processingStatus,
        processingProgress,
        totalFrames,
        segmentCount,
        logEntries,
        gpsPointsRef,
        startGps,
        stopGps,
        processSegment,
        shareLog,
        clearLog,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error('useRecording must be used within RecordingProvider');
  return ctx;
}
