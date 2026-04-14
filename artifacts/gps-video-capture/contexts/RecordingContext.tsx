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
import { Alert, Platform } from 'react-native';

import { buildGpxXml } from '@/lib/gpx';
import { FrameSettings } from './SettingsContext';

export interface GpsPoint {
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  altitude: number | null;
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
  sessionId: string;
  supabaseUrl?: string;
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
  sessionId: string;
  gpsPointsRef: React.MutableRefObject<GpsPoint[]>;
  startGps: () => Promise<void>;
  stopGps: (mode?: 'video' | 'photo' | 'manual') => void;
  pauseGps: () => void;
  resumeGps: () => void;
  shareGpx: (sessionId: string) => Promise<void>;
  exportManualGpxTrack: (points: GpsPoint[], trackName: string) => Promise<void>;
  processSegment: (
    uri: string,
    segmentNum: number,
    startTime: number,
    durationMs: number,
    frameSettings: FrameSettings,
    onFrameReady?: (frameUri: string, timestamp: number) => void
  ) => Promise<void>;
  savePhoto: (
    uri: string,
    timestamp: number,
    onFrameReady?: (frameUri: string, timestamp: number) => void,
    saveToLibrary?: boolean
  ) => Promise<void>;
  updateFrameUrl: (id: string, url: string) => Promise<void>;
  shareLog: () => Promise<void>;
  clearLog: () => Promise<void>;
}

const RecordingContext = createContext<RecordingContextType | null>(null);
const STORAGE_KEY = '@gps_capture_log';
const CSV_HEADER = 'filename,timestamp,latitude,longitude,video_segment,local_path,video_path,session_id,supabase_url\n';

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

function makeSessionId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `session_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function getOrCreatePaths(): Promise<{
  framesDir: string;
  videosDir: string;
  csvPath: string;
  gpxDir: string;
  logJsonPath: string;
}> {
  const FileSystem = await import('expo-file-system/legacy');
  const base = FileSystem.documentDirectory + 'gps-capture/';
  const framesDir = base + 'frames/';
  const videosDir = base + 'segments/';
  const csvPath = base + 'log.csv';
  const gpxDir = base + 'gpx/';
  const logJsonPath = base + 'log.json';

  const framesDirInfo = await FileSystem.getInfoAsync(framesDir);
  if (!framesDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(framesDir, { intermediates: true });
  }
  const videosDirInfo = await FileSystem.getInfoAsync(videosDir);
  if (!videosDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(videosDir, { intermediates: true });
  }
  const gpxDirInfo = await FileSystem.getInfoAsync(gpxDir);
  if (!gpxDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(gpxDir, { intermediates: true });
  }
  const csvInfo = await FileSystem.getInfoAsync(csvPath);
  if (!csvInfo.exists) {
    await FileSystem.writeAsStringAsync(csvPath, CSV_HEADER);
  }
  return { framesDir, videosDir, csvPath, gpxDir, logJsonPath };
}

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [currentGps, setCurrentGps] = useState<GpsPoint | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [segmentCount, setSegmentCount] = useState(0);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [sessionId, setSessionId] = useState<string>('');

  // ── GPS refs ────────────────────────────────────────────────────────────────
  // Flat array used for frame-matching (distance calculations, photo matching).
  const gpsPointsRef = useRef<GpsPoint[]>([]);

  // Segmented arrays: each sub-array is one continuous GPS track segment.
  // A new segment is opened on resume after a pause.
  const gpsSegmentsRef = useRef<GpsPoint[][]>([]);
  // Points being collected in the current (open) segment.
  const currentSegmentRef = useRef<GpsPoint[]>([]);
  // Whether GPS is currently paused (don't add to current segment).
  const isPausedRef = useRef(false);

  const sessionIdRef = useRef<string>('');
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const nativePathsRef = useRef<{ framesDir: string; videosDir: string; csvPath: string; gpxDir: string; logJsonPath: string } | null>(null);

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
      // On-device: prefer the JSON file in documentDirectory — it survives Expo Go
      // bundle reloads reliably, unlike AsyncStorage which can lag or be cleared.
      if (Platform.OS !== 'web') {
        const FileSystem = await import('expo-file-system/legacy');
        if (!nativePathsRef.current) {
          nativePathsRef.current = await getOrCreatePaths();
        }
        const { logJsonPath } = nativePathsRef.current;
        const info = await FileSystem.getInfoAsync(logJsonPath);
        if (info.exists) {
          const raw = await FileSystem.readAsStringAsync(logJsonPath);
          if (raw) {
            const entries: LogEntry[] = JSON.parse(raw);
            setLogEntries(entries);
            // Restore photo counter so new photos pick up after existing ones
            const photoCount = entries.filter((e) => e.videoSegment === 'photo').length;
            photoIndexRef.current = photoCount;
            return;
          }
        }
      }
      // Fallback: AsyncStorage (primary on web; backup on native for old installs)
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const entries: LogEntry[] = JSON.parse(raw);
        setLogEntries(entries);
        if (Platform.OS !== 'web') {
          const photoCount = entries.filter((e) => e.videoSegment === 'photo').length;
          photoIndexRef.current = photoCount;
        }
      }
    } catch {}
  };

  const saveLog = async (entries: LogEntry[]) => {
    const jsonStr = JSON.stringify(entries);
    // AsyncStorage write (fast, works on web too)
    try {
      await AsyncStorage.setItem(STORAGE_KEY, jsonStr);
    } catch {}
    // FileSystem write — primary persistence on device; survives Expo Go reloads
    if (Platform.OS !== 'web') {
      try {
        const FileSystem = await import('expo-file-system/legacy');
        if (!nativePathsRef.current) {
          nativePathsRef.current = await getOrCreatePaths();
        }
        await FileSystem.writeAsStringAsync(nativePathsRef.current.logJsonPath, jsonStr);
      } catch {}
    }
  };

  const startGps = useCallback(async () => {
    if (Platform.OS === 'web') return;
    setGpsStatus('searching');
    // Reset all segment tracking
    gpsPointsRef.current = [];
    gpsSegmentsRef.current = [];
    currentSegmentRef.current = [];
    isPausedRef.current = false;

    const sid = makeSessionId();
    sessionIdRef.current = sid;
    setSessionId(sid);

    const fgPerm = await Location.requestForegroundPermissionsAsync();
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
            altitude: loc.coords.altitude,
          };
          // Always push to flat ref (used for frame-time GPS matching).
          gpsPointsRef.current.push(point);
          // Only add to the active segment when not paused.
          if (!isPausedRef.current) {
            currentSegmentRef.current.push(point);
          }
          setCurrentGps(point);
          setGpsStatus('locked');
        }
      );
    } catch {
      setGpsStatus('denied');
    }
  }, []);

  // ── Pause GPS tracking (seal current segment) ───────────────────────────────
  const pauseGps = useCallback(() => {
    if (isPausedRef.current) return;
    isPausedRef.current = true;
    // Seal the current open segment.
    if (currentSegmentRef.current.length > 0) {
      gpsSegmentsRef.current.push([...currentSegmentRef.current]);
      currentSegmentRef.current = [];
    }
  }, []);

  // ── Resume GPS tracking (open a fresh segment) ──────────────────────────────
  const resumeGps = useCallback(() => {
    if (!isPausedRef.current) return;
    isPausedRef.current = false;
    currentSegmentRef.current = [];
  }, []);

  // ── Internal: save segments as a GPX file ───────────────────────────────────
  const saveGpx = useCallback(async (
    sid: string,
    segments: GpsPoint[][],
    mode: 'video' | 'photo' | 'manual'
  ) => {
    const allPoints = segments.flat();
    if (Platform.OS === 'web' || allPoints.length === 0 || !sid) return;
    try {
      const FileSystem = await import('expo-file-system/legacy');
      if (!nativePathsRef.current) {
        nativePathsRef.current = await getOrCreatePaths();
      }
      const gpxPath = nativePathsRef.current.gpxDir + sid + '.gpx';
      const xml = buildGpxXml(sid, segments, mode);
      await FileSystem.writeAsStringAsync(gpxPath, xml, {
        encoding: 'utf8',
      });
    } catch {}
  }, []);

  // ── Stop GPS, finalize all segments, write GPX ──────────────────────────────
  const stopGps = useCallback((mode?: 'video' | 'photo' | 'manual') => {
    const sid = sessionIdRef.current;
    locationSubRef.current?.remove();
    locationSubRef.current = null;
    setGpsStatus('idle');
    setCurrentGps(null);

    // Reset pause state
    isPausedRef.current = false;

    // Seal any open segment before stopping.
    if (currentSegmentRef.current.length > 0) {
      gpsSegmentsRef.current.push([...currentSegmentRef.current]);
      currentSegmentRef.current = [];
    }

    const segments = [...gpsSegmentsRef.current];
    gpsSegmentsRef.current = [];

    if (mode && sid && segments.some((seg) => seg.length > 0)) {
      saveGpx(sid, segments, mode);
    }
  }, [saveGpx]);

  const shareGpx = useCallback(async (sid: string) => {
    if (Platform.OS === 'web') return;
    try {
      if (!nativePathsRef.current) {
        nativePathsRef.current = await getOrCreatePaths();
      }
      const gpxPath = nativePathsRef.current.gpxDir + sid + '.gpx';
      const FileSystem = await import('expo-file-system/legacy');
      const info = await FileSystem.getInfoAsync(gpxPath);
      if (!info.exists) {
        Alert.alert(
          'No GPX Track',
          'No GPS track file was found for this session. Use the START GPX button on the Capture tab while in Manual mode to record a route.',
          [{ text: 'OK' }]
        );
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(gpxPath, {
          mimeType: 'application/gpx+xml',
          dialogTitle: 'Share GPX Track',
          UTI: 'com.topografix.gpx',
        });
      }
    } catch {}
  }, []);

  const exportManualGpxTrack = useCallback(async (points: GpsPoint[], trackName: string) => {
    if (Platform.OS === 'web' || points.length === 0) return;
    try {
      const FileSystem = await import('expo-file-system/legacy');
      if (!nativePathsRef.current) {
        nativePathsRef.current = await getOrCreatePaths();
      }
      const gpxPath = nativePathsRef.current.gpxDir + trackName + '.gpx';
      const xml = buildGpxXml(trackName, [points], 'manual');
      await FileSystem.writeAsStringAsync(gpxPath, xml, {
        encoding: 'utf8',
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(gpxPath, {
          mimeType: 'application/gpx+xml',
          dialogTitle: 'Export GPX Route',
          UTI: 'com.topografix.gpx',
        });
      }
    } catch (e: unknown) {
      if (e instanceof Error) console.warn('exportManualGpxTrack:', e.message);
    }
  }, []);

  const processSegment = useCallback(
    async (
      uri: string,
      segmentNum: number,
      startTime: number,
      durationMs: number,
      frameSettings: FrameSettings,
      onFrameReady?: (frameUri: string, timestamp: number) => void
    ) => {
      if (Platform.OS === 'web') return;

      setProcessingStatus('processing');
      setProcessingProgress(0);
      setSegmentCount((n) => n + 1);

      const snapshotPoints = [...gpsPointsRef.current];
      const segmentName = `seg_${String(segmentNum).padStart(3, '0')}`;
      const currentSession = sessionIdRef.current;
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

        // Build the list of timestamps at which to extract frames
        const extractTimesMs: number[] = [];

        if (frameSettings.frameMode === 'fixed') {
          // Fixed rate: step by the interval between frames
          const stepMs = Math.round(1000 / frameSettings.fixedFps);
          for (let t = 0; t <= durationMs; t += stepMs) {
            extractTimesMs.push(t);
          }
        } else {
          // Dynamic: accumulate GPS distance and extract once per target meters
          let distanceAccumulator = 0;
          extractTimesMs.push(0); // always capture first frame
          for (let t = 1000; t <= durationMs; t += 1000) {
            const absTimestamp = startTime + t;
            const nearest = findNearestGps(absTimestamp, snapshotPoints);
            const speed = nearest?.speed ?? 0; // m/s
            distanceAccumulator += speed * 1; // 1 second interval
            if (distanceAccumulator >= frameSettings.dynamicMeters) {
              extractTimesMs.push(t);
              distanceAccumulator = 0;
            }
          }
        }

        let csvAppend = '';
        let frameIndex = 0;

        for (const t of extractTimesMs) {
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

              // Fire detection callback with the saved frame (non-blocking)
              if (onFrameReady) {
                onFrameReady(destPath, absTimestamp);
              }

              const entry: LogEntry = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
                filename,
                timestamp: absTimestamp,
                latitude: nearest.latitude,
                longitude: nearest.longitude,
                videoSegment: segmentName,
                localPath: destPath,
                videoPath: videoDestPath,
                sessionId: currentSession,
              };
              newEntries.push(entry);

              const lat = nearest.latitude.toFixed(7);
              const lon = nearest.longitude.toFixed(7);
              const ts = new Date(absTimestamp).toISOString();
              csvAppend += `${filename},${ts},${lat},${lon},${segmentName},${destPath},${videoDestPath},${currentSession},\n`;

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

  const photoIndexRef = useRef(0);

  const savePhoto = useCallback(
    async (
      uri: string,
      timestamp: number,
      onFrameReady?: (frameUri: string, timestamp: number) => void,
      saveToLibrary?: boolean
    ) => {
      if (Platform.OS === 'web') return;

      const snapshotPoints = [...gpsPointsRef.current];
      const nearest = findNearestGps(timestamp, snapshotPoints);

      try {
        const FileSystem = await import('expo-file-system/legacy');

        if (!nativePathsRef.current) {
          nativePathsRef.current = await getOrCreatePaths();
        }
        const { framesDir, csvPath } = nativePathsRef.current;

        const idx = photoIndexRef.current++;
        const filename = `photo_${String(idx).padStart(5, '0')}_${timestamp}.jpg`;
        const destPath = framesDir + filename;

        await FileSystem.copyAsync({ from: uri, to: destPath });

        if (onFrameReady) onFrameReady(destPath, timestamp);

        if (saveToLibrary) {
          try {
            const MediaLibrary = await import('expo-media-library');
            const perm = await MediaLibrary.requestPermissionsAsync();
            if (perm.granted) {
              await MediaLibrary.saveToLibraryAsync(destPath);
            }
          } catch {}
        }

        const gpsLat = nearest?.latitude ?? 0;
        const gpsLon = nearest?.longitude ?? 0;

        const entry: LogEntry = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
          filename,
          timestamp,
          latitude: gpsLat,
          longitude: gpsLon,
          videoSegment: 'photo',
          localPath: destPath,
          videoPath: '',
          sessionId: sessionIdRef.current,
        };

        const lat = gpsLat.toFixed(7);
        const lon = gpsLon.toFixed(7);
        const ts = new Date(timestamp).toISOString();
        const csvRow = `${filename},${ts},${lat},${lon},photo,${destPath},,${sessionIdRef.current},,\n`;

        const existing = await FileSystem.readAsStringAsync(csvPath).catch(() => CSV_HEADER);
        await FileSystem.writeAsStringAsync(csvPath, existing + csvRow);

        setLogEntries((prev) => {
          const updated = [...prev, entry];
          saveLog(updated);
          return updated;
        });
        setTotalFrames((n) => n + 1);
      } catch {}
    },
    []
  );

  const updateFrameUrl = useCallback(async (id: string, url: string) => {
    let updatedFilename = '';

    setLogEntries((prev) => {
      const updated = prev.map((e) => {
        if (e.id === id) {
          updatedFilename = e.filename;
          return { ...e, supabaseUrl: url };
        }
        return e;
      });
      saveLog(updated);
      return updated;
    });

    if (!updatedFilename || Platform.OS === 'web' || !nativePathsRef.current) return;

    try {
      const FileSystem = await import('expo-file-system/legacy');
      const { csvPath } = nativePathsRef.current;
      const content = await FileSystem.readAsStringAsync(csvPath).catch(() => '');
      const lines = content.split('\n');
      const updated = lines.map((line) => {
        if (line.startsWith(updatedFilename + ',') && line.endsWith(',')) {
          return line.slice(0, -1) + url;
        }
        return line;
      });
      await FileSystem.writeAsStringAsync(csvPath, updated.join('\n'));
    } catch {}
  }, []);

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
    photoIndexRef.current = 0;
    await AsyncStorage.removeItem(STORAGE_KEY);
    if (Platform.OS !== 'web') {
      try {
        const FileSystem = await import('expo-file-system/legacy');
        if (nativePathsRef.current) {
          await FileSystem.deleteAsync(nativePathsRef.current.csvPath, { idempotent: true });
          await FileSystem.deleteAsync(nativePathsRef.current.framesDir, { idempotent: true });
          await FileSystem.deleteAsync(nativePathsRef.current.videosDir, { idempotent: true });
          await FileSystem.deleteAsync(nativePathsRef.current.gpxDir, { idempotent: true });
          await FileSystem.deleteAsync(nativePathsRef.current.logJsonPath, { idempotent: true });
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
        sessionId,
        gpsPointsRef,
        startGps,
        stopGps,
        pauseGps,
        resumeGps,
        shareGpx,
        exportManualGpxTrack,
        processSegment,
        savePhoto,
        updateFrameUrl,
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
