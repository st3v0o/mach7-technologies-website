import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import SuccessToast from '@/components/SuccessToast';
import UploadProgressModal from '@/components/UploadProgressModal';
import { useRecording } from '@/contexts/RecordingContext';
import { FEET_PER_METER, MPH_PER_MPS, useSettings } from '@/contexts/SettingsContext';
import { useStorageConfig } from '@/contexts/StorageConfigContext';
import { useUpload } from '@/contexts/UploadContext';

const TARGET_SEGMENT_BYTES = 250 * 1024 * 1024; // 250 MB
const DEFAULT_SEGMENT_MS = 90_000;              // initial guess before bitrate is known
const MIN_SEGMENT_MS = 30_000;
const MAX_SEGMENT_MS = 300_000;

const ZOOM_STEPS = [
  { label: '1×', value: 0.0 },
  { label: '2×', value: 0.25 },
  { label: '4×', value: 0.55 },
  { label: '8×', value: 1.0 },
] as const;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function rateLabel(frameMode: string, fixedFps: number, dynamicMeters: number, speed: number | null | undefined): string {
  if (frameMode === 'fixed') {
    if (fixedFps < 1) return `1/${Math.round(1 / fixedFps)}s`;
    return `${fixedFps} fps`;
  }
  if (speed == null || speed < 0.1) return '— fps';
  const fps = speed / dynamicMeters;
  return `~${fps.toFixed(1)} fps`;
}

function formatCoord(val: number, isLat: boolean): string {
  const dir = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
  return `${Math.abs(val).toFixed(5)}° ${dir}`;
}

function GpsStatusDot({ status }: { status: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'searching') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const color =
    status === 'locked' ? Colors.gpsGreen :
    status === 'searching' ? Colors.amber :
    Colors.textTertiary;

  return (
    <Animated.View style={[styles.statusDot, { backgroundColor: color, opacity: pulseAnim }]} />
  );
}

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  // iOS tab bar is 49pt; add the safe-area bottom inset (home indicator) on top
  const tabBarHeight = 49 + insets.bottom;
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const {
    gpsStatus,
    currentGps,
    processingStatus,
    processingProgress,
    totalFrames,
    segmentCount,
    sessionId,
    gpsPointsRef,
    startGps,
    stopGps,
    pauseGps,
    resumeGps,
    processSegment,
    savePhoto,
    exportManualGpxTrack,
  } = useRecording();

  const { pendingCount, failedCount, isCloudConfigured } = useUpload();
  const { envTestError, testConnection } = useStorageConfig();
  const [dismissedEnvError, setDismissedEnvError] = useState(false);
  const [retryingEnvTest, setRetryingEnvTest] = useState(false);
  const [showRetrySuccess, setShowRetrySuccess] = useState(false);
  const retryToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (retryToastTimer.current) clearTimeout(retryToastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (envTestError) {
      setDismissedEnvError(false);
    }
  }, [envTestError]);

  const handleRetryConnection = useCallback(async () => {
    if (retryingEnvTest) return;
    setRetryingEnvTest(true);
    const result = await testConnection();
    setRetryingEnvTest(false);
    if (result.success) {
      if (retryToastTimer.current) clearTimeout(retryToastTimer.current);
      setShowRetrySuccess(true);
      retryToastTimer.current = setTimeout(() => setShowRetrySuccess(false), 2500);
    }
  }, [retryingEnvTest, testConnection]);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showJobNameModal, setShowJobNameModal] = useState(false);
  const [jobNameDraft, setJobNameDraft] = useState('');
  const [uploadJustDone, setUploadJustDone] = useState(false);
  const prevPendingCountRef = useRef(0);
  const prevIsRecording = useRef(false);

  useEffect(() => {
    if (
      prevPendingCountRef.current > 0 &&
      pendingCount === 0 &&
      failedCount === 0 &&
      isCloudConfigured
    ) {
      setUploadJustDone(true);
      const t = setTimeout(() => setUploadJustDone(false), 3000);
      return () => clearTimeout(t);
    }
    prevPendingCountRef.current = pendingCount;
  }, [pendingCount, failedCount, isCloudConfigured]);

  const { settings, updateSettings } = useSettings();
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // ── HUD derived values ─────────────────────────────────────────────────────
  const shortSessionId = sessionId
    ? sessionId.replace(/-/g, '').slice(-8).toUpperCase()
    : '—';

  const mountLabel: Record<string, string> = {
    vehicle: 'VEHICLE',
    drone: 'DRONE',
    handheld: 'HANDHELD',
    bike: 'BIKE',
  };

  const captureModeLabel =
    settings.captureMode === 'manual' ? 'MANUAL' :
    settings.captureMode === 'photo' ? 'PHOTO' : 'AUTO';

  const cameraRef = useRef<CameraView>(null);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(0);
  const [activeStepIdx, setActiveStepIdx] = useState(0); // which preset button is lit
  const zoomRef = useRef(0);
  const zoomBaseRef = useRef(0);
  const zoomPillOpacity = useRef(new Animated.Value(0)).current;
  const zoomHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showZoomPill = useCallback(() => {
    if (zoomHideTimer.current) clearTimeout(zoomHideTimer.current);
    Animated.timing(zoomPillOpacity, { toValue: 1, duration: 120, useNativeDriver: true }).start();
    zoomHideTimer.current = setTimeout(() => {
      Animated.timing(zoomPillOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start();
    }, 1500);
  }, [zoomPillOpacity]);

  // Used by pinch — clears button highlight when between steps
  const applyZoom = useCallback((val: number) => {
    zoomRef.current = val;
    setZoom(val);
    setActiveStepIdx(-1);
    showZoomPill();
  }, [showZoomPill]);

  // Used by preset buttons
  const applyZoomStep = useCallback((idx: number) => {
    const step = ZOOM_STEPS[idx];
    zoomRef.current = step.value;
    setZoom(step.value);
    setActiveStepIdx(idx);
    showZoomPill();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [showZoomPill]);

  const resetZoom = useCallback(() => {
    zoomRef.current = 0;
    setZoom(0);
    setActiveStepIdx(0);
    showZoomPill();
  }, [showZoomPill]);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => { zoomBaseRef.current = zoomRef.current; })
    .onUpdate((e) => {
      const next = Math.max(0, Math.min(1, zoomBaseRef.current + (e.scale - 1) * 0.35));
      runOnJS(applyZoom)(next);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => { runOnJS(resetZoom)(); });

  const cameraGesture = Gesture.Simultaneous(pinchGesture, doubleTap);

  // Derive display label for pill — show preset label if on a step, else calculated
  const zoomPillLabel = activeStepIdx >= 0
    ? ZOOM_STEPS[activeStepIdx].label
    : `${(1 + zoom * 4).toFixed(1)}×`;
  // ─────────────────────────────────────────────────────────────────────────


  const isRecordingRef = useRef(false);
  const segmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentSegNumRef = useRef(0);
  const segmentDurationMsRef = useRef(DEFAULT_SEGMENT_MS);
  const micGrantedRef = useRef(micPermission?.granted ?? false);

  // ── Pause / resume ────────────────────────────────────────────────────────
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  // Resolves the promise that the recording loop waits on when paused.
  const pauseResolverRef = useRef<(() => void) | null>(null);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Auto photo mode refs ──────────────────────────────────────────────────
  const [photoCount, setPhotoCount] = useState(0);
  const photoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const photoCapturingRef = useRef(false);
  const photoDistAccumRef = useRef(0);
  const photoLastTickRef = useRef(0);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Manual photo mode ─────────────────────────────────────────────────────
  const [manualPhotoCount, setManualPhotoCount] = useState(0);
  const manualCapturingRef = useRef(false);
  const flashAnim = useRef(new Animated.Value(0)).current;

  const flashShutter = useCallback(() => {
    flashAnim.setValue(0.85);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [flashAnim]);

  const handleManualShutter = useCallback(async () => {
    if (manualCapturingRef.current || !cameraRef.current) return;
    manualCapturingRef.current = true;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    flashShutter();
    try {
      const photo = await (cameraRef.current as any).takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        const ts = Date.now();
        await savePhoto(photo.uri, ts, undefined, settingsRef.current.savePhotosToLibrary);
        setManualPhotoCount((n) => n + 1);
      }
    } catch {}
    manualCapturingRef.current = false;
  }, [savePhoto, flashShutter]);

  // ── Manual GPX track (user-controlled start/stop) ─────────────────────────
  const [isGpxTracking, setIsGpxTracking] = useState(false);
  const [gpxPointCount, setGpxPointCount] = useState(0);
  const [gpxElapsed, setGpxElapsed] = useState(0);
  const gpxStartIndexRef = useRef(0);
  const gpxElapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isGpxTrackingRef = useRef(false);

  const stopGpxInterval = useCallback(() => {
    if (gpxElapsedIntervalRef.current) {
      clearInterval(gpxElapsedIntervalRef.current);
      gpxElapsedIntervalRef.current = null;
    }
  }, []);

  const handleStartGpx = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    gpxStartIndexRef.current = gpsPointsRef.current.length;
    isGpxTrackingRef.current = true;
    setIsGpxTracking(true);
    setGpxElapsed(0);
    setGpxPointCount(0);
    gpxElapsedIntervalRef.current = setInterval(() => {
      setGpxElapsed((s) => s + 1);
      setGpxPointCount(gpsPointsRef.current.length - gpxStartIndexRef.current);
    }, 1000);
  }, [gpsPointsRef]);

  const handleStopGpx = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    stopGpxInterval();
    isGpxTrackingRef.current = false;
    setIsGpxTracking(false);
    setGpxElapsed(0);
    setGpxPointCount(0);
    const points = gpsPointsRef.current.slice(gpxStartIndexRef.current);
    if (points.length > 0) {
      // Save using the current sessionId so the Log screen's GPX button can find the file via shareGpx(sessionId).
      // stopGps('manual') will later overwrite this with all GPS points from the session, which is fine —
      // the user already gets the share sheet immediately, and the full-session GPX is more useful in the log.
      await exportManualGpxTrack(points, sessionId);
    }
  }, [gpsPointsRef, stopGpxInterval, exportManualGpxTrack, sessionId]);

  // GPS auto-starts when manual mode is active
  const captureMode = settings.captureMode;
  useEffect(() => {
    if (captureMode !== 'manual') return;
    setManualPhotoCount(0);
    startGps();
    return () => {
      // Stop any active GPX track before leaving manual mode
      if (isGpxTrackingRef.current) {
        stopGpxInterval();
        isGpxTrackingRef.current = false;
        setIsGpxTracking(false);
        setGpxElapsed(0);
        setGpxPointCount(0);
      }
      stopGps('manual');
    };
  }, [captureMode]);
  // ─────────────────────────────────────────────────────────────────────────

  // Auto-request permissions on mount so the user isn't stuck on a gate screen
  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted && cameraPermission.status !== 'denied') {
      requestCameraPermission();
    }
  }, [cameraPermission?.status]);

  useEffect(() => {
    if (micPermission && !micPermission.granted && micPermission.status !== 'denied') {
      requestMicPermission();
    }
  }, [micPermission?.status]);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentSegmentMs, setCurrentSegmentMs] = useState(DEFAULT_SEGMENT_MS);
  // Monotonically-increasing frame count shown in the HUD while recording.
  // Dynamic-mode speed fluctuates, causing naive estimates to go backward;
  // this state only ever increases so the counter never visibly drops.
  const [displayedFrameCount, setDisplayedFrameCount] = useState(0);

  // Show upload modal when recording stops
  useEffect(() => {
    if (prevIsRecording.current && !isRecording) {
      setShowUploadModal(true);
    }
    prevIsRecording.current = isRecording;
  }, [isRecording]);

  // Keep displayed frame count monotonically increasing so speed fluctuations
  // in dynamic mode never cause the counter to visibly go backward.
  useEffect(() => {
    if (!isRecording || settings.captureMode !== 'video') {
      setDisplayedFrameCount(0);
      return;
    }
    const speed = Math.max(currentGps?.speed ?? 0, 0);
    const segEst = Math.round(
      elapsedSeconds *
        (settings.frameMode === 'fixed'
          ? settings.fixedFps
          : speed / Math.max(settings.dynamicMeters, 0.1))
    );
    const newTotal = totalFrames + Math.max(segEst, 0);
    setDisplayedFrameCount((prev) => Math.max(prev, newTotal));
  }, [elapsedSeconds, currentGps?.speed, isRecording, totalFrames,
      settings.captureMode, settings.frameMode, settings.fixedFps, settings.dynamicMeters]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isRecording && !isPaused) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [isRecording, isPaused, pulseAnim]);

  const clearTimers = useCallback(() => {
    if (segmentTimerRef.current) clearTimeout(segmentTimerRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    segmentTimerRef.current = null;
    elapsedIntervalRef.current = null;
  }, []);

  // ── Photo capture loop ────────────────────────────────────────────────────
  const takeOnePhoto = useCallback(async () => {
    if (!isRecordingRef.current || photoCapturingRef.current) return;
    if (!cameraRef.current) return;
    photoCapturingRef.current = true;
    try {
      const photo = await (cameraRef.current as any).takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        const ts = Date.now();
        await savePhoto(photo.uri, ts, undefined, settingsRef.current.savePhotosToLibrary);
        setPhotoCount((n) => n + 1);
      }
    } catch {}
    photoCapturingRef.current = false;
  }, [savePhoto]);

  const startPhotoLoop = useCallback(() => {
    photoCapturingRef.current = false;
    photoDistAccumRef.current = 0;
    photoLastTickRef.current = Date.now();
    setPhotoCount(0);

    const mode = settingsRef.current.frameMode;

    if (mode === 'fixed') {
      const intervalMs = Math.round(1000 / settingsRef.current.fixedFps);
      photoIntervalRef.current = setInterval(() => { takeOnePhoto(); }, intervalMs);
    } else {
      // Dynamic: poll every 500 ms, fire when distance threshold crossed
      photoIntervalRef.current = setInterval(() => {
        if (!isRecordingRef.current) return;
        const now = Date.now();
        const elapsedSec = (now - photoLastTickRef.current) / 1000;
        photoLastTickRef.current = now;

        const pts = gpsPointsRef.current;
        let speed = 0;
        if (pts.length > 0) speed = pts[pts.length - 1].speed ?? 0;
        photoDistAccumRef.current += speed * elapsedSec;

        if (photoDistAccumRef.current >= settingsRef.current.dynamicMeters) {
          photoDistAccumRef.current = 0;
          takeOnePhoto();
        }
      }, 500);
    }
  }, [takeOnePhoto, gpsPointsRef]);

  const stopPhotoLoop = useCallback(() => {
    if (photoIntervalRef.current) {
      clearInterval(photoIntervalRef.current);
      photoIntervalRef.current = null;
    }
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  // After a segment saves, measure its actual size and adapt the duration for the
  // next segment so we target ~250 MB per chunk (instead of a fixed time guess).
  const adaptSegmentDuration = useCallback(async (uri: string, actualDurationMs: number) => {
    if (Platform.OS === 'web') return;
    try {
      const FileSystem = await import('expo-file-system/legacy');
      const info = await (FileSystem.getInfoAsync as any)(uri, { size: true });
      if (info.exists && 'size' in info && info.size > 0) {
        const bytesPerMs = info.size / actualDurationMs;
        const nextMs = Math.round(TARGET_SEGMENT_BYTES / bytesPerMs);
        segmentDurationMsRef.current = Math.max(MIN_SEGMENT_MS, Math.min(MAX_SEGMENT_MS, nextMs));
        setCurrentSegmentMs(segmentDurationMsRef.current);
      }
    } catch {}
  }, []);

  const runRecordingLoop = useCallback(async () => {
    while (isRecordingRef.current) {
      currentSegNumRef.current += 1;
      const segNum = currentSegNumRef.current;
      const segDuration = segmentDurationMsRef.current;
      const startTime = Date.now();

      setElapsedSeconds(0);
      elapsedIntervalRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);

      const autoStopTimer = setTimeout(() => {
        // Only auto-stop when not paused (pause handles its own stopRecording call)
        if (isRecordingRef.current && !isPausedRef.current) {
          cameraRef.current?.stopRecording();
        }
      }, segDuration);
      segmentTimerRef.current = autoStopTimer;

      let result: { uri: string } | undefined;
      try {
        result = await (cameraRef.current as any)?.recordAsync({ mute: !micGrantedRef.current });
      } catch {
        clearTimers();
        break;
      }

      clearTimeout(autoStopTimer);
      clearInterval(elapsedIntervalRef.current!);
      elapsedIntervalRef.current = null;

      const actualDurationMs = Date.now() - startTime;

      if (result?.uri) {
        // Adapt duration for next segment based on measured bitrate, then process
        // (both happen in background — recording loop restarts immediately)
        adaptSegmentDuration(result.uri, actualDurationMs);
        processSegment(result.uri, segNum, startTime, actualDurationMs, settingsRef.current);
      }

      if (!isRecordingRef.current) break;

      // If paused, wait here until resume() wakes us up.
      if (isPausedRef.current) {
        await new Promise<void>(resolve => { pauseResolverRef.current = resolve; });
        if (!isRecordingRef.current) break;
      }
    }

    setIsRecording(false);
    setIsPaused(false);
    setElapsedSeconds(0);
  }, [clearTimers, processSegment, adaptSegmentDuration]);

  const handleStartRecording = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    isRecordingRef.current = true;
    setIsRecording(true);
    startGps();

    if (settingsRef.current.captureMode === 'photo') {
      setElapsedSeconds(0);
      elapsedIntervalRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
      startPhotoLoop();
    } else {
      if (!micPermission?.granted) {
        const result = await requestMicPermission();
        micGrantedRef.current = result.granted;
      } else {
        micGrantedRef.current = true;
      }
      currentSegNumRef.current = segmentCount;
      runRecordingLoop();
    }
  }, [micPermission, requestMicPermission, startGps, runRecordingLoop, startPhotoLoop, segmentCount]);

  const handleStopRecording = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    isRecordingRef.current = false;
    isPausedRef.current = false;
    setIsPaused(false);
    // If the loop is waiting on a pause, release it so it can exit.
    if (pauseResolverRef.current) {
      pauseResolverRef.current();
      pauseResolverRef.current = null;
    }
    clearTimers();
    const captureMode = settingsRef.current.captureMode;
    if (captureMode === 'photo') {
      stopPhotoLoop();
      setIsRecording(false);
      setElapsedSeconds(0);
    } else {
      cameraRef.current?.stopRecording();
    }
    stopGps(captureMode);
  }, [clearTimers, stopPhotoLoop, stopGps]);

  const handlePauseRecording = useCallback(async () => {
    if (!isRecordingRef.current || isPausedRef.current) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    isPausedRef.current = true;
    setIsPaused(true);
    // Seal current GPS segment.
    pauseGps();
    const captureMode = settingsRef.current.captureMode;
    if (captureMode === 'photo') {
      stopPhotoLoop();
      clearTimers();
    } else {
      // Stop the current video segment — the loop will detect isPausedRef and wait.
      clearTimers();
      cameraRef.current?.stopRecording();
    }
  }, [pauseGps, stopPhotoLoop, clearTimers]);

  const handleResumeRecording = useCallback(async () => {
    if (!isRecordingRef.current || !isPausedRef.current) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Open a fresh GPS segment.
    resumeGps();
    isPausedRef.current = false;
    setIsPaused(false);
    const captureMode = settingsRef.current.captureMode;
    if (captureMode === 'photo') {
      setElapsedSeconds(0);
      elapsedIntervalRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
      startPhotoLoop();
    } else {
      // Wake up the recording loop — it will start a new video segment.
      if (pauseResolverRef.current) {
        pauseResolverRef.current();
        pauseResolverRef.current = null;
      }
    }
  }, [resumeGps, startPhotoLoop]);

  const segmentProgress = Math.min(elapsedSeconds / (currentSegmentMs / 1000), 1);
  // fraction of segment elapsed × 250 MB target
  const estimatedMB = Math.round((elapsedSeconds / (currentSegmentMs / 1000)) * 250);

  if (!cameraPermission || !micPermission) {
    return (
      <View style={[styles.permContainer, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.permText}>Loading...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={[styles.permContainer, { paddingTop: insets.top + 20 }]}>
        <Ionicons name="videocam-off" size={48} color={Colors.textSecondary} style={{ marginBottom: 16 }} />
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permSubtitle}>
          Geospector needs camera access to record GPS-tagged video and photos.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.permButton, pressed && { opacity: 0.8 }]}
          onPress={async () => {
            await requestCameraPermission();
            if (!micPermission.granted) await requestMicPermission();
          }}
        >
          <Text style={styles.permButtonText}>Enable Camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <GestureDetector gesture={cameraGesture}>
    <View style={styles.container}>
      {Platform.OS !== 'web' ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode={settings.captureMode !== 'video' ? 'picture' : 'video'}
          zoom={zoom}
          autofocus={settings.lockFocusAtInfinity ? 'off' : 'on'}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.webPlaceholder]}>
          <Ionicons name="videocam" size={64} color={Colors.textTertiary} />
          <Text style={styles.webText}>Camera preview unavailable on web</Text>
        </View>
      )}

      {/* ── Top HUD: flat cinematic overlay ─────────────────────────────── */}
      <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          {/* Left: GPS status + coords */}
          <View style={styles.topLeft}>
            <View style={styles.gpsRow}>
              <GpsStatusDot status={gpsStatus} />
              <Text style={[
                styles.gpsLabel,
                {
                  color: gpsStatus === 'locked' ? Colors.gpsGreen
                       : gpsStatus === 'idle' ? 'rgba(255,255,255,0.45)'
                       : Colors.amber,
                },
              ]}>
                {gpsStatus === 'locked' ? 'GPS LOCK' :
                 gpsStatus === 'searching' ? 'ACQUIRING' :
                 gpsStatus === 'denied' ? 'GPS DENIED' : 'GPS READY'}
              </Text>
            </View>
            {currentGps ? (
              <Text style={styles.coordLine}>
                {formatCoord(currentGps.latitude, true)}{'  '}
                {formatCoord(currentGps.longitude, false)}
                {currentGps.speed != null && currentGps.speed * MPH_PER_MPS > 1
                  ? `  ${(currentGps.speed * MPH_PER_MPS).toFixed(0)} mph`
                  : ''}
              </Text>
            ) : (
              <Text style={styles.noGpsLine}>
                {gpsStatus === 'searching' ? 'Acquiring…' :
                 gpsStatus === 'idle' ? 'Starts when you record' : 'Check GPS permissions'}
              </Text>
            )}
          </View>

          {/* Right: altitude + mount badge + upload badge */}
          <View style={styles.topRight}>
            {currentGps?.altitude != null && (
              <Text style={styles.altText}>
                {Math.round(currentGps.altitude * FEET_PER_METER)}ft
              </Text>
            )}
            <View style={styles.mountBadge}>
              <View style={styles.mountDot} />
              <Text style={styles.mountBadgeText}>
                {mountLabel[settings.mountType] ?? 'VEHICLE'}
              </Text>
            </View>
            {isCloudConfigured && (pendingCount > 0 || failedCount > 0 || uploadJustDone) && (
              <Pressable
                onPress={() => setShowUploadModal(true)}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.uploadBadge,
                  failedCount > 0 && styles.uploadBadgeFailed,
                  uploadJustDone && pendingCount === 0 && failedCount === 0 && styles.uploadBadgeDone,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Ionicons
                  name={
                    uploadJustDone && pendingCount === 0 && failedCount === 0
                      ? 'checkmark-circle'
                      : failedCount > 0 && pendingCount === 0
                      ? 'close-circle'
                      : 'cloud-upload-outline'
                  }
                  size={10}
                  color={
                    uploadJustDone && pendingCount === 0 && failedCount === 0
                      ? Colors.gpsGreen
                      : failedCount > 0 && pendingCount === 0
                      ? Colors.accent
                      : Colors.amber
                  }
                />
                <Text style={[
                  styles.uploadBadgeText,
                  failedCount > 0 && pendingCount === 0 && { color: Colors.accent },
                  uploadJustDone && pendingCount === 0 && failedCount === 0 && { color: Colors.gpsGreen },
                ]}>
                  {uploadJustDone && pendingCount === 0 && failedCount === 0
                    ? 'All uploaded'
                    : failedCount > 0 && pendingCount === 0
                    ? `${failedCount} failed`
                    : failedCount > 0
                    ? `${pendingCount} · ${failedCount} failed`
                    : `${pendingCount} uploading`}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {processingStatus === 'processing' && (
        <View style={styles.processingBanner}>
          <BlurView intensity={80} tint="dark" style={styles.processingBlur}>
            <Ionicons name="cog" size={14} color={Colors.amber} />
            <Text style={styles.processingText}>
              Extracting frames… {Math.round(processingProgress)}%
            </Text>
          </BlurView>
        </View>
      )}

      {envTestError && !dismissedEnvError && (
        <View style={styles.envErrorBanner}>
          <BlurView intensity={90} tint="dark" style={styles.envErrorBlur}>
            <Ionicons name="cloud-offline-outline" size={15} color={Colors.accent} style={styles.envErrorIcon} />
            <Text style={styles.envErrorText} numberOfLines={2}>
              Cloud storage unreachable: {envTestError}
            </Text>
            <Pressable
              onPress={handleRetryConnection}
              hitSlop={10}
              disabled={retryingEnvTest}
              style={({ pressed }) => [styles.envErrorRetry, pressed && { opacity: 0.6 }]}
            >
              {retryingEnvTest ? (
                <ActivityIndicator size="small" color={Colors.textSecondary} style={{ width: 16, height: 16 }} />
              ) : (
                <Text style={styles.envErrorRetryText}>Retry</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => setDismissedEnvError(true)}
              hitSlop={10}
              style={({ pressed }) => [styles.envErrorDismiss, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="close" size={16} color={Colors.textSecondary} />
            </Pressable>
          </BlurView>
        </View>
      )}

      {/* ── Bottom HUD: cinematic gradient overlay ──────────────────────── */}
      <View style={styles.bottomOverlay}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']}
          locations={[0, 0.3, 1]}
          style={[styles.bottomGradient, { paddingBottom: tabBarHeight + 12 }]}
        >
          {/* ── Job info section ────────────────────────────────────────── */}
          <View style={styles.jobInfoSection}>
            {/* Large green coordinates */}
            {currentGps ? (
              <Text style={styles.bigCoords}>
                {formatCoord(currentGps.latitude, true)}{'  /  '}{formatCoord(currentGps.longitude, false)}
              </Text>
            ) : (
              <Text style={styles.bigCoordsSearching}>Acquiring GPS…</Text>
            )}

            {/* Job name — tappable to edit */}
            <Pressable
              onPress={() => { setJobNameDraft(settings.jobName); setShowJobNameModal(true); }}
              style={styles.jobNameRow}
            >
              <Text
                style={[styles.jobName, !settings.jobName && styles.jobNamePlaceholder]}
                numberOfLines={1}
              >
                {settings.jobName
                  ? settings.jobName.toUpperCase()
                  : 'TAP TO NAME THIS JOB  ✎'}
              </Text>
            </Pressable>

            {/* Rate / speed / file-size info line */}
            <Text style={styles.infoLine}>
              {rateLabel(settings.frameMode, settings.fixedFps, settings.dynamicMeters, currentGps?.speed)}
              {currentGps?.speed != null && currentGps.speed * MPH_PER_MPS > 1
                ? `  ·  ${(currentGps.speed * MPH_PER_MPS).toFixed(0)} mph`
                : ''}
              {isRecording && settings.captureMode === 'video' && estimatedMB > 0
                ? `  ·  ~${estimatedMB} MB`
                : ''}
            </Text>

            {/* SESSION | MODE | FRAMES stats */}
            <View style={styles.statsRow}>
              <View style={styles.statsCol}>
                <Text style={styles.statsLabel}>SESSION</Text>
                <Text style={styles.statsValue}>{shortSessionId}</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsCol}>
                <Text style={styles.statsLabel}>MODE</Text>
                <Text style={styles.statsValue}>{captureModeLabel}</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsCol}>
                <Text style={styles.statsLabel}>
                  {settings.captureMode === 'video' ? 'FRAMES' : 'PHOTOS'}
                </Text>
                <Text style={styles.statsValue}>
                  {'#'}
                  {settings.captureMode === 'video'
                    ? (isRecording ? displayedFrameCount : totalFrames)
                    : settings.captureMode === 'manual'
                    ? manualPhotoCount
                    : photoCount}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Segment / progress info (video only while recording) ─── */}
          {isRecording && settings.captureMode === 'video' && (
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${Math.round(segmentProgress * 100)}%` as `${number}%` },
                ]}
              />
            </View>
          )}

          <View style={styles.zoomStepRow}>
            {ZOOM_STEPS.map((step, idx) => (
              <Pressable
                key={step.label}
                onPress={() => applyZoomStep(idx)}
                style={({ pressed }) => [
                  styles.zoomStepBtn,
                  activeStepIdx === idx && styles.zoomStepBtnActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[
                  styles.zoomStepText,
                  activeStepIdx === idx && styles.zoomStepTextActive,
                ]}>
                  {step.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.controlsRow}>
            <View style={styles.controlSide}>
              {isRecording && !isPaused ? (
                <View style={styles.recIndicator}>
                  <View style={styles.recDot} />
                  <Text style={styles.recLabel}>REC</Text>
                </View>
              ) : isRecording && isPaused ? (
                <View style={styles.recIndicator}>
                  <View style={[styles.recDot, { backgroundColor: Colors.amber }]} />
                  <Text style={[styles.recLabel, { color: Colors.amber }]}>PAUSED</Text>
                </View>
              ) : (
                <Text style={styles.readyLabel}>READY</Text>
              )}
            </View>

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              {settings.captureMode === 'manual' ? (
                <Pressable
                  onPress={handleManualShutter}
                  style={({ pressed }) => [
                    styles.recordButton,
                    styles.recordButtonManual,
                    pressed && { opacity: 0.75 },
                  ]}
                  testID="record-button"
                >
                  <Ionicons name="camera" size={28} color="#000" />
                </Pressable>
              ) : (
                <Pressable
                  onPress={isRecording ? handleStopRecording : handleStartRecording}
                  style={({ pressed }) => [
                    styles.recordButton,
                    isRecording && styles.recordButtonActive,
                    pressed && { opacity: 0.85 },
                  ]}
                  testID="record-button"
                >
                  {isRecording ? (
                    <View style={styles.stopSquare} />
                  ) : (
                    <View style={styles.recordInner} />
                  )}
                </Pressable>
              )}
            </Animated.View>

            <View style={styles.controlSide}>
              {/* Pause / resume button — shown while a video/photo session is active */}
              {isRecording && settings.captureMode !== 'manual' && (
                <Pressable
                  onPress={isPaused ? handleResumeRecording : handlePauseRecording}
                  style={({ pressed }) => [
                    styles.pauseButton,
                    isPaused && styles.pauseButtonActive,
                    pressed && { opacity: 0.7 },
                  ]}
                  testID="pause-button"
                >
                  <Ionicons
                    name={isPaused ? 'play' : 'pause'}
                    size={16}
                    color={isPaused ? Colors.background : Colors.amber}
                  />
                </Pressable>
              )}

              {/* GPX track button — manual mode only */}
              {settings.captureMode === 'manual' && (
                <Pressable
                  onPress={isGpxTracking ? handleStopGpx : handleStartGpx}
                  style={({ pressed }) => [
                    styles.gpxButton,
                    isGpxTracking && styles.gpxButtonActive,
                    pressed && { opacity: 0.7 },
                  ]}
                  testID="gpx-button"
                >
                  <Ionicons
                    name={isGpxTracking ? 'stop' : 'navigate'}
                    size={14}
                    color={isGpxTracking ? Colors.background : Colors.gpsGreen}
                  />
                  <Text style={[
                    styles.gpxButtonLabel,
                    isGpxTracking && { color: Colors.background },
                  ]}>
                    {isGpxTracking ? 'STOP\nGPX' : 'START\nGPX'}
                  </Text>
                </Pressable>
              )}

              {/* Segment count badge — hidden while pause button is shown */}
              {!isRecording && settings.captureMode !== 'manual' && (segmentCount > 0 || processingStatus === 'processing') && (
                <View style={styles.segCountBadge}>
                  <Ionicons name="layers-outline" size={12} color={Colors.textSecondary} />
                  <Text style={styles.segCountText}>{segmentCount}</Text>
                </View>
              )}
            </View>
          </View>

        </LinearGradient>
      </View>

      {/* ── Job name edit modal ──────────────────────────────────────────── */}
      <Modal
        visible={showJobNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJobNameModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowJobNameModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalCard}
          >
            <Pressable onPress={() => {}}>
              <Text style={styles.modalTitle}>JOB NAME</Text>
              <Text style={styles.modalSubtitle}>
                Sessions captured while this name is active will be grouped under the same project.
              </Text>
              <TextInput
                style={styles.jobNameInput}
                value={jobNameDraft}
                onChangeText={setJobNameDraft}
                placeholder="e.g. Highway – Surface Condition Survey"
                placeholderTextColor="rgba(255,255,255,0.25)"
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={() => {
                  updateSettings({ jobName: jobNameDraft.trim() });
                  setShowJobNameModal(false);
                }}
              />
              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.modalBtnSecondary}
                  onPress={() => setShowJobNameModal(false)}
                >
                  <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.modalBtnPrimary}
                  onPress={() => {
                    updateSettings({ jobName: jobNameDraft.trim() });
                    setShowJobNameModal(false);
                  }}
                >
                  <Text style={styles.modalBtnPrimaryText}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Zoom level pill */}
      <Animated.View
        style={[styles.zoomPill, { opacity: zoomPillOpacity }]}
        pointerEvents="none"
      >
        <Text style={styles.zoomPillText}>{zoomPillLabel}</Text>
      </Animated.View>

      {/* Manual mode — white flash on shutter press */}
      {settings.captureMode === 'manual' && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.flashOverlay, { opacity: flashAnim }]}
          pointerEvents="none"
        />
      )}

      {/* Session complete — upload progress modal */}
      <UploadProgressModal
        visible={showUploadModal}
        sessionId={sessionId}
        onClose={() => setShowUploadModal(false)}
      />

      {/* Connection retry success toast */}
      <SuccessToast visible={showRetrySuccess} message="Connection successful" />
    </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    gap: 12,
  },
  webText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  permContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  permTitle: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    textAlign: 'center',
  },
  permSubtitle: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  permText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  permButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  permButtonText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  // ── Top HUD ────────────────────────────────────────────────────────────────
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topLeft: {
    flex: 1,
    gap: 3,
  },
  topRight: {
    alignItems: 'flex-end',
    gap: 5,
    paddingLeft: 12,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  gpsLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  coordLine: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  noGpsLine: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    fontStyle: 'italic',
  },
  altText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  mountDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  mountBadgeText: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    letterSpacing: 1,
  },
  uploadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.amberDim,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,184,0,0.10)',
  },
  uploadBadgeFailed: {
    borderColor: 'rgba(255,59,48,0.35)',
    backgroundColor: 'rgba(255,59,48,0.10)',
  },
  uploadBadgeDone: {
    borderColor: 'rgba(0,255,136,0.3)',
    backgroundColor: 'rgba(0,255,136,0.08)',
  },
  uploadBadgeText: {
    color: Colors.amber,
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    letterSpacing: 0.3,
  },
  processingBanner: {
    position: 'absolute',
    top: 130,
    left: 16,
    right: 16,
  },
  processingBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.amberDim,
  },
  processingText: {
    color: Colors.amber,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  envErrorBanner: {
    position: 'absolute',
    top: 160,
    left: 16,
    right: 16,
  },
  envErrorBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.accentDim,
  },
  envErrorIcon: {
    marginRight: 6,
    flexShrink: 0,
  },
  envErrorText: {
    flex: 1,
    color: Colors.accent,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 17,
  },
  envErrorRetry: {
    paddingLeft: 10,
    paddingRight: 2,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 16,
  },
  envErrorRetryText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  envErrorDismiss: {
    paddingLeft: 8,
    flexShrink: 0,
  },
  // ── Bottom HUD ─────────────────────────────────────────────────────────────
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomGradient: {
    paddingHorizontal: 18,
    paddingTop: 36,
    paddingBottom: 12,
  },
  jobInfoSection: {
    gap: 4,
    marginBottom: 14,
  },
  bigCoords: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  bigCoordsSearching: {
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    fontStyle: 'italic',
  },
  jobNameRow: {
    marginTop: 2,
  },
  jobName: {
    color: '#ffffff',
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    letterSpacing: 1.2,
    lineHeight: 22,
  },
  jobNamePlaceholder: {
    color: 'rgba(255,255,255,0.28)',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  infoLine: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statsCol: {
    flex: 1,
    gap: 2,
  },
  statsDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 12,
  },
  statsLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Inter_500Medium',
    fontSize: 8,
    letterSpacing: 1.5,
  },
  statsValue: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  // ── Job name modal ──────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: 2,
    marginBottom: 8,
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  jobNameInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalBtnSecondaryText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.gpsGreen,
  },
  modalBtnPrimaryText: {
    color: '#000',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  controlSide: {
    width: 60,
    alignItems: 'center',
  },
  recIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  recLabel: {
    color: Colors.accent,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  readyLabel: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    letterSpacing: 1,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentDim,
  },
  recordButtonManual: {
    borderColor: Colors.gpsGreen,
    backgroundColor: Colors.gpsGreen,
  },
  flashOverlay: {
    backgroundColor: '#fff',
    zIndex: 20,
  },
  recordInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent,
  },
  stopSquare: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.accent,
  },
  segCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  segCountText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  pauseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,184,0,0.12)',
  },
  pauseButtonActive: {
    backgroundColor: Colors.amber,
    borderColor: Colors.amber,
  },
  gpxButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.gpsGreen,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,232,122,0.10)',
    gap: 2,
  },
  gpxButtonActive: {
    backgroundColor: Colors.gpsGreen,
    borderColor: Colors.gpsGreen,
  },
  gpxButtonLabel: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  hintRow: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
  },
  hintText: {
    textAlign: 'center',
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  zoomStepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  zoomStepBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  zoomStepBtnActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  zoomStepText: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  zoomStepTextActive: {
    color: '#000',
  },
  zoomPill: {
    position: 'absolute',
    alignSelf: 'center',
    top: '42%',
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  zoomPillText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
