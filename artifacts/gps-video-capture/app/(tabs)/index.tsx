import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import UploadProgressModal from '@/components/UploadProgressModal';
import { useRecording } from '@/contexts/RecordingContext';
import { FEET_PER_METER, MPH_PER_MPS, useSettings } from '@/contexts/SettingsContext';

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
    processSegment,
    savePhoto,
  } = useRecording();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const prevIsRecording = useRef(false);

  const { settings } = useSettings();
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

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

  // ── Photo mode refs ───────────────────────────────────────────────────────
  const [photoCount, setPhotoCount] = useState(0);
  const photoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const photoCapturingRef = useRef(false);
  const photoDistAccumRef = useRef(0);
  const photoLastTickRef = useRef(0);
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

  // Show upload modal when recording stops
  useEffect(() => {
    if (prevIsRecording.current && !isRecording) {
      setShowUploadModal(true);
    }
    prevIsRecording.current = isRecording;
  }, [isRecording]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isRecording) {
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
  }, [isRecording, pulseAnim]);

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
        await savePhoto(photo.uri, ts);
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
        if (isRecordingRef.current) {
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

      // No artificial delay — restart the next segment immediately
      if (!isRecordingRef.current) break;
    }

    setIsRecording(false);
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
          GPS Video Capture needs camera access to record video for GPS frame tagging.
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
          mode={settings.captureMode === 'photo' ? 'picture' : 'video'}
          zoom={zoom}
          autofocus={settings.lockFocusAtInfinity ? 'off' : 'on'}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.webPlaceholder]}>
          <Ionicons name="videocam" size={64} color={Colors.textTertiary} />
          <Text style={styles.webText}>Camera preview unavailable on web</Text>
        </View>
      )}

      <View style={[styles.topOverlay, { paddingTop: insets.top + 4 }]}>
        <BlurView intensity={60} tint="dark" style={styles.blurCard}>
          <View style={styles.gpsRow}>
            <GpsStatusDot status={gpsStatus} />
            <Text style={styles.gpsLabel}>
              {gpsStatus === 'locked' ? 'GPS LOCK' :
               gpsStatus === 'searching' ? 'ACQUIRING' :
               gpsStatus === 'denied' ? 'GPS DENIED' : 'GPS OFF'}
            </Text>
            {gpsStatus === 'searching' && (
              <Text style={styles.gpsHint}>Recording runs — GPS matches when locked</Text>
            )}
            {currentGps?.accuracy != null && gpsStatus === 'locked' && (
              <Text style={styles.gpsAccuracy}>±{Math.round(currentGps.accuracy * FEET_PER_METER)}ft</Text>
            )}
          </View>
          {currentGps ? (
            <View style={styles.coordRow}>
              <Text style={styles.coord}>{formatCoord(currentGps.latitude, true)}</Text>
              <Text style={styles.coordDivider}>  </Text>
              <Text style={styles.coord}>{formatCoord(currentGps.longitude, false)}</Text>
              {currentGps.speed != null && currentGps.speed > 0 && (
                <Text style={styles.speed}>
                  {'  '}{(currentGps.speed * MPH_PER_MPS).toFixed(1)} mph
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.noGps}>
              {gpsStatus === 'searching'
                ? 'Searching… works best outdoors'
                : 'Waiting for GPS signal...'}
            </Text>
          )}
        </BlurView>
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

      <View style={[styles.bottomOverlay, { paddingBottom: tabBarHeight + 12 }]}>
        <BlurView intensity={60} tint="dark" style={styles.bottomBlur}>
          {isRecording && settings.captureMode === 'photo' && (
            <View style={styles.segmentInfoRow}>
              <View style={styles.segInfoItem}>
                <Text style={styles.segLabel}>MODE</Text>
                <Text style={styles.segValue}>PHOTO</Text>
              </View>
              <View style={styles.segInfoDivider} />
              <View style={styles.segInfoItem}>
                <Text style={styles.segLabel}>ELAPSED</Text>
                <Text style={styles.segValue}>{formatTime(elapsedSeconds)}</Text>
              </View>
              <View style={styles.segInfoDivider} />
              <View style={styles.segInfoItem}>
                <Text style={styles.segLabel}>RATE</Text>
                <Text style={styles.segValue}>
                  {rateLabel(settings.frameMode, settings.fixedFps, settings.dynamicMeters, currentGps?.speed)}
                </Text>
              </View>
              <View style={styles.segInfoDivider} />
              <View style={styles.segInfoItem}>
                <Text style={styles.segLabel}>PHOTOS</Text>
                <Text style={styles.segValue}>{photoCount}</Text>
              </View>
            </View>
          )}

          {isRecording && settings.captureMode === 'video' && (
            <View style={styles.segmentInfoRow}>
              <View style={styles.segInfoItem}>
                <Text style={styles.segLabel}>SEGMENT</Text>
                <Text style={styles.segValue}>{String(currentSegNumRef.current).padStart(3, '0')}</Text>
              </View>
              <View style={styles.segInfoDivider} />
              <View style={styles.segInfoItem}>
                <Text style={styles.segLabel}>ELAPSED</Text>
                <Text style={styles.segValue}>{formatTime(elapsedSeconds)}</Text>
              </View>
              <View style={styles.segInfoDivider} />
              <View style={styles.segInfoItem}>
                <Text style={styles.segLabel}>EST. SIZE</Text>
                <Text style={styles.segValue}>{estimatedMB} MB</Text>
              </View>
              <View style={styles.segInfoDivider} />
              <View style={styles.segInfoItem}>
                <Text style={styles.segLabel}>RATE</Text>
                <Text style={styles.segValue}>
                  {rateLabel(settings.frameMode, settings.fixedFps, settings.dynamicMeters, currentGps?.speed)}
                </Text>
              </View>
              <View style={styles.segInfoDivider} />
              <View style={styles.segInfoItem}>
                <Text style={styles.segLabel}>FRAMES</Text>
                <Text style={styles.segValue}>{totalFrames}</Text>
              </View>
            </View>
          )}

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
              {isRecording ? (
                <View style={styles.recIndicator}>
                  <View style={styles.recDot} />
                  <Text style={styles.recLabel}>REC</Text>
                </View>
              ) : (
                <Text style={styles.readyLabel}>READY</Text>
              )}
            </View>

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
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
            </Animated.View>

            <View style={styles.controlSide}>
              {(segmentCount > 0 || processingStatus === 'processing') && (
                <View style={styles.segCountBadge}>
                  <Ionicons name="layers-outline" size={12} color={Colors.textSecondary} />
                  <Text style={styles.segCountText}>{segmentCount}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.hintRow}>
            <Text style={styles.hintText}>
              {settings.captureMode === 'photo'
                ? 'Photos saved directly · GPS tagged'
                : 'Auto-saves every ~250 MB · frames tagged with GPS'}
            </Text>
          </View>
        </BlurView>
      </View>

      {/* Zoom level pill */}
      <Animated.View
        style={[styles.zoomPill, { opacity: zoomPillOpacity }]}
        pointerEvents="none"
      >
        <Text style={styles.zoomPillText}>{zoomPillLabel}</Text>
      </Animated.View>

      {/* Session complete — upload progress modal */}
      <UploadProgressModal
        visible={showUploadModal}
        sessionId={sessionId}
        onClose={() => setShowUploadModal(false)}
      />
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
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  blurCard: {
    borderRadius: 14,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsLabel: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  gpsHint: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    flex: 1,
  },
  gpsAccuracy: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginLeft: 'auto',
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coord: {
    color: Colors.text,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  coordDivider: {
    color: Colors.textTertiary,
    fontSize: 13,
  },
  speed: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  noGps: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    fontStyle: 'italic',
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
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  bottomBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  segmentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  segInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  segInfoDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  segLabel: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 2,
  },
  segValue: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
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
