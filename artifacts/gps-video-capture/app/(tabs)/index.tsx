import { Feather, Ionicons } from '@expo/vector-icons';
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
  useWindowDimensions,
  View,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { useDetection } from '@/contexts/DetectionContext';
import { useRecording } from '@/contexts/RecordingContext';
import { FEET_PER_METER, MPH_PER_MPS, useSettings } from '@/contexts/SettingsContext';
import { Detection, runDetection } from '@/lib/detectionModel';

const TARGET_SEGMENT_BYTES = 250 * 1024 * 1024; // 250 MB
const DEFAULT_SEGMENT_MS = 90_000;              // initial guess before bitrate is known
const MIN_SEGMENT_MS = 30_000;
const MAX_SEGMENT_MS = 300_000;

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

const CORNER_ARM = 22;
const CORNER_THICK = 3;
const LOCK_COLOR = '#00FF88';
const LOCK_GLOW = 'rgba(0,255,136,0.45)';

function LockOnOverlay({
  detection,
  screenW,
  screenH,
}: {
  detection: Detection | null;
  screenW: number;
  screenH: number;
}) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const prevActive = useRef(false);

  useEffect(() => {
    const active = !!detection;
    if (active === prevActive.current) return;
    prevActive.current = active;
    if (active) {
      Animated.spring(enterAnim, {
        toValue: 1,
        friction: 5,
        tension: 110,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(enterAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [!!detection, enterAnim]);

  useEffect(() => {
    if (!detection) {
      sweepAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweepAnim, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(sweepAnim, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [!!detection, sweepAnim]);

  const scaleInterp = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] });

  const bbox = detection?.bbox ?? { x: 0.15, y: 0.15, width: 0.7, height: 0.7 };
  const bLeft = bbox.x * screenW;
  const bTop = bbox.y * screenH;
  const bW = Math.max(bbox.width * screenW, 40);
  const bH = Math.max(bbox.height * screenH, 40);

  const sweepY = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, bH - 2],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { opacity: enterAnim, transform: [{ scale: scaleInterp }] },
      ]}
    >
      <View style={{ position: 'absolute', left: bLeft, top: bTop, width: bW, height: bH }}>
        <View style={[loStyles.cornerTL]} />
        <View style={[loStyles.cornerTR]} />
        <View style={[loStyles.cornerBL]} />
        <View style={[loStyles.cornerBR]} />

        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: LOCK_GLOW,
            transform: [{ translateY: sweepY }],
          }}
        />

        {detection && (
          <View style={loStyles.labelChip}>
            <Animated.View
              style={[
                loStyles.labelDot,
                { opacity: sweepAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.4, 1] }) },
              ]}
            />
            <Text style={loStyles.labelText} numberOfLines={1}>
              {detection.label.toUpperCase()}
            </Text>
            <View style={loStyles.labelDivider} />
            <Text style={loStyles.confText}>{Math.round(detection.confidence * 100)}%</Text>
            <Text style={loStyles.lockedTag}>LOCKED</Text>
          </View>
        )}
      </View>

      {detection && (
        <>
          <View style={[loStyles.crossH, { top: bTop + bH / 2 - 0.5, left: bLeft + bW / 2 - 10 }]} />
          <View style={[loStyles.crossV, { top: bTop + bH / 2 - 10, left: bLeft + bW / 2 - 0.5 }]} />
        </>
      )}
    </Animated.View>
  );
}

const loStyles = StyleSheet.create({
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CORNER_ARM,
    height: CORNER_ARM,
    borderTopWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderTopColor: LOCK_COLOR,
    borderLeftColor: LOCK_COLOR,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: CORNER_ARM,
    height: CORNER_ARM,
    borderTopWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderTopColor: LOCK_COLOR,
    borderRightColor: LOCK_COLOR,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: CORNER_ARM,
    height: CORNER_ARM,
    borderBottomWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderBottomColor: LOCK_COLOR,
    borderLeftColor: LOCK_COLOR,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: CORNER_ARM,
    height: CORNER_ARM,
    borderBottomWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderBottomColor: LOCK_COLOR,
    borderRightColor: LOCK_COLOR,
  },
  labelChip: {
    position: 'absolute',
    bottom: -40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderWidth: 1.5,
    borderColor: LOCK_COLOR,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'center',
  },
  labelDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: LOCK_COLOR,
  },
  labelText: {
    color: LOCK_COLOR,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: 0.8,
    flexShrink: 1,
  },
  labelDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(0,255,136,0.35)',
  },
  confText: {
    color: LOCK_COLOR,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  lockedTag: {
    color: 'rgba(0,255,136,0.6)',
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    letterSpacing: 1.2,
  },
  crossH: {
    position: 'absolute',
    width: 20,
    height: 1,
    backgroundColor: LOCK_COLOR,
  },
  crossV: {
    position: 'absolute',
    width: 1,
    height: 20,
    backgroundColor: LOCK_COLOR,
  },
});

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const {
    gpsStatus,
    currentGps,
    processingStatus,
    processingProgress,
    totalFrames,
    segmentCount,
    startGps,
    stopGps,
    processSegment,
    saveDetectionFrame,
  } = useRecording();

  const { settings } = useSettings();
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const cameraRef = useRef<CameraView>(null);
  const isRecordingRef = useRef(false);
  const segmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentSegNumRef = useRef(0);
  const segmentDurationMsRef = useRef(DEFAULT_SEGMENT_MS);
  const micGrantedRef = useRef(micPermission?.granted ?? false);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentSegmentMs, setCurrentSegmentMs] = useState(DEFAULT_SEGMENT_MS);

  type ApiCallState = 'idle' | 'calling' | 'ok' | 'err' | 'nokey';
  const [apiCallState, setApiCallState] = useState<ApiCallState>('idle');
  const [apiLastMs, setApiLastMs] = useState(0);
  const [apiLastCount, setApiLastCount] = useState(0);
  const hasApiKey = !!process.env.EXPO_PUBLIC_ROBOFLOW_API_KEY;

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

  const {
    detectionEnabled,
    setDetectionEnabled,
    isDetecting,
    currentEvent,
    currentDetection,
    lastCommittedEvent,
    reportResult,
    clearCurrentEvent,
    clearLastCommittedEvent,
  } = useDetection();

  useEffect(() => {
    if (!lastCommittedEvent?.bestFrameUri) return;
    saveDetectionFrame(
      lastCommittedEvent.bestFrameUri,
      lastCommittedEvent.startedAt,
      lastCommittedEvent.label || 'sign',
      lastCommittedEvent.confidence
    );
    clearLastCommittedEvent();
  }, [lastCommittedEvent, saveDetectionFrame, clearLastCommittedEvent]);

  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isDetecting) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(scanAnim, { toValue: 0.3, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      scanAnim.setValue(detectionEnabled ? 0.25 : 0);
    }
  }, [isDetecting, detectionEnabled, scanAnim]);

  useEffect(() => {
    if (isRecording && detectionEnabled && Platform.OS !== 'web') {
      if (!hasApiKey) {
        setApiCallState('nokey');
      }
      detectionIntervalRef.current = setInterval(async () => {
        try {
          if (!cameraRef.current) return;
          setApiCallState('calling');
          const photo = await (cameraRef.current as any).takePictureAsync({
            quality: 0.4,
            skipProcessing: true,
          });
          if (!photo?.uri) { setApiCallState('err'); return; }
          const result = await runDetection(photo.uri);
          setApiCallState('ok');
          setApiLastMs(result.inferenceMs);
          setApiLastCount(result.detections.length);
          reportResult(result, photo.uri);
        } catch {
          setApiCallState('err');
        }
      }, 900);
    } else {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      if (!isRecording) clearCurrentEvent();
    }
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [isRecording, detectionEnabled, reportResult, clearCurrentEvent]);

  const clearTimers = useCallback(() => {
    if (segmentTimerRef.current) clearTimeout(segmentTimerRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    segmentTimerRef.current = null;
    elapsedIntervalRef.current = null;
  }, []);

  // After a segment saves, measure its actual size and adapt the duration for the
  // next segment so we target ~250 MB per chunk (instead of a fixed time guess).
  const adaptSegmentDuration = useCallback(async (uri: string, actualDurationMs: number) => {
    if (Platform.OS === 'web') return;
    try {
      const FileSystem = await import('expo-file-system/legacy');
      const info = await FileSystem.getInfoAsync(uri, { size: true });
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
        result = await cameraRef.current?.recordAsync({ mute: !micGrantedRef.current });
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
    // Ensure mic permission is resolved before recording; fall back to muted if denied
    if (!micPermission?.granted) {
      const result = await requestMicPermission();
      micGrantedRef.current = result.granted;
    } else {
      micGrantedRef.current = true;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    isRecordingRef.current = true;
    setIsRecording(true);
    currentSegNumRef.current = segmentCount;
    startGps(); // start in parallel — recording does not wait for GPS lock
    runRecordingLoop();
  }, [micPermission, requestMicPermission, startGps, runRecordingLoop, segmentCount]);

  const handleStopRecording = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    isRecordingRef.current = false;
    clearTimers();
    cameraRef.current?.stopRecording();
    stopGps();
  }, [clearTimers, stopGps]);

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
    <View style={styles.container}>
      {Platform.OS !== 'web' ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="video"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.webPlaceholder]}>
          <Ionicons name="videocam" size={64} color={Colors.textTertiary} />
          <Text style={styles.webText}>Camera preview unavailable on web</Text>
        </View>
      )}

      {/* Lock-on targeting overlay */}
      {detectionEnabled && isRecording && (
        <LockOnOverlay
          detection={currentDetection}
          screenW={screenW}
          screenH={screenH}
        />
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
          {isRecording && (
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

          {isRecording && (
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${Math.round(segmentProgress * 100)}%` as `${number}%` },
                ]}
              />
            </View>
          )}

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
                  <Feather name="layers" size={12} color={Colors.textSecondary} />
                  <Text style={styles.segCountText}>{segmentCount}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.detectionRow}>
            {!isRecording ? (
              <Pressable
                onPress={() => setDetectionEnabled(!detectionEnabled)}
                style={({ pressed }) => [
                  styles.detectToggle,
                  detectionEnabled && styles.detectToggleOn,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Ionicons
                  name={detectionEnabled ? 'eye' : 'eye-outline'}
                  size={15}
                  color={detectionEnabled ? Colors.gpsGreen : Colors.textSecondary}
                />
                <Text style={[styles.detectToggleText, detectionEnabled && styles.detectToggleTextOn]}>
                  Real-Time Detection
                </Text>
                <View style={[styles.detectTogglePill, detectionEnabled && styles.detectTogglePillOn]}>
                  <Text style={[styles.detectTogglePillText, detectionEnabled && styles.detectTogglePillTextOn]}>
                    {detectionEnabled ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </Pressable>
            ) : detectionEnabled ? (
              <View style={styles.aiActiveRow}>
                {apiCallState === 'nokey' ? (
                  <>
                    <Ionicons name="warning-outline" size={12} color={Colors.amber} />
                    <Text style={[styles.aiActiveLabel, { color: Colors.amber }]}>NO API KEY SET</Text>
                  </>
                ) : apiCallState === 'err' ? (
                  <>
                    <Ionicons name="close-circle-outline" size={12} color={Colors.accent} />
                    <Text style={[styles.aiActiveLabel, { color: Colors.accent }]}>API ERROR</Text>
                  </>
                ) : (
                  <>
                    <Animated.View style={[styles.aiDot, {
                      opacity: scanAnim,
                      backgroundColor: isDetecting ? Colors.gpsGreen : apiCallState === 'calling' ? Colors.amber : Colors.textTertiary,
                    }]} />
                    <Text style={[styles.aiActiveLabel, isDetecting && { color: Colors.gpsGreen }]}>
                      {isDetecting ? 'SIGN DETECTED' : apiCallState === 'calling' ? 'CALLING API…' : 'AI SCANNING'}
                    </Text>
                    {apiCallState === 'ok' && (
                      <Text style={styles.aiStatText}>
                        {apiLastCount > 0 ? `${apiLastCount} hit${apiLastCount > 1 ? 's' : ''}` : '0 hits'} · {apiLastMs}ms
                      </Text>
                    )}
                  </>
                )}
              </View>
            ) : (
              <Text style={styles.hintText}>
                Auto-saves every ~250 MB · frames tagged with GPS
              </Text>
            )}
          </View>
        </BlurView>
      </View>
    </View>
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
  hintText: {
    textAlign: 'center',
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 10,
    letterSpacing: 0.3,
  },
  detectionRow: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
    minHeight: 36,
    justifyContent: 'center',
  },
  detectToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detectToggleOn: {
    borderColor: Colors.gpsGreen,
    backgroundColor: Colors.gpsDim,
  },
  detectToggleText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  detectToggleTextOn: {
    color: Colors.gpsGreen,
  },
  detectTogglePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detectTogglePillOn: {
    backgroundColor: Colors.gpsGreen,
    borderColor: Colors.gpsGreen,
  },
  detectTogglePillText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  detectTogglePillTextOn: {
    color: '#000',
  },
  aiActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gpsGreen,
  },
  aiActiveLabel: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  aiStatText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
