import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { LogEntry, useRecording } from '@/contexts/RecordingContext';
import { useUpload } from '@/contexts/UploadContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatCoordShort(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}°${latDir}  ${Math.abs(lon).toFixed(5)}°${lonDir}`;
}

function formatCoordFull(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(7)}° ${latDir}  /  ${Math.abs(lon).toFixed(7)}° ${lonDir}`;
}

function UploadBadge({ frameId }: { frameId: string }) {
  const { getItemStatus, supabaseConfigured } = useUpload();
  if (!supabaseConfigured) return null;

  const status = getItemStatus(frameId);
  if (!status) return null;

  if (status === 'uploading') {
    return <ActivityIndicator size="small" color={Colors.blue} style={styles.uploadBadge} />;
  }
  if (status === 'uploaded') {
    return <Ionicons name="cloud-done-outline" size={14} color={Colors.gpsGreen} style={styles.uploadBadge} />;
  }
  if (status === 'failed') {
    return <Ionicons name="cloud-offline-outline" size={14} color={Colors.accent} style={styles.uploadBadge} />;
  }
  return <Ionicons name="cloud-upload-outline" size={14} color={Colors.amber} style={styles.uploadBadge} />;
}

function FrameDetailModal({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const hasDetection = Boolean(entry.detectionLabel);
  const confidence = entry.detectionConfidence ?? 0;

  return (
    <Modal
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={modalStyles.container}>

        {/* Full-screen frame image */}
        {Platform.OS !== 'web' ? (
          <Image
            source={{ uri: entry.localPath }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            transition={150}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, modalStyles.webPlaceholder]}>
            <Ionicons name="image-outline" size={60} color={Colors.textTertiary} />
          </View>
        )}

        {/* Dark gradient top bar */}
        <View style={[modalStyles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [modalStyles.closeBtn, pressed && { opacity: 0.6 }]}
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>

          <View style={modalStyles.topMeta}>
            <Text style={modalStyles.topFilename} numberOfLines={1}>{entry.filename}</Text>
            <Text style={modalStyles.topTime}>{formatTimestamp(entry.timestamp)}</Text>
          </View>

          {/* Segment badge top-right */}
          <View style={modalStyles.segChip}>
            <Text style={modalStyles.segChipText}>{entry.videoSegment.replace('seg_', 'SEG ')}</Text>
          </View>
        </View>

        {/* Detection lock-on overlay — shown when detection exists */}
        {hasDetection && (
          <View style={modalStyles.detectionOverlay} pointerEvents="none">
            {/* Corner brackets */}
            <View style={modalStyles.bracketTL}>
              <View style={[modalStyles.bracketH, { left: 0, top: 0 }]} />
              <View style={[modalStyles.bracketV, { left: 0, top: 0 }]} />
            </View>
            <View style={modalStyles.bracketTR}>
              <View style={[modalStyles.bracketH, { right: 0, top: 0 }]} />
              <View style={[modalStyles.bracketV, { right: 0, top: 0 }]} />
            </View>
            <View style={modalStyles.bracketBL}>
              <View style={[modalStyles.bracketH, { left: 0, bottom: 0 }]} />
              <View style={[modalStyles.bracketV, { left: 0, bottom: 0 }]} />
            </View>
            <View style={modalStyles.bracketBR}>
              <View style={[modalStyles.bracketH, { right: 0, bottom: 0 }]} />
              <View style={[modalStyles.bracketV, { right: 0, bottom: 0 }]} />
            </View>

            {/* Center crosshair */}
            <View style={modalStyles.crosshairH} />
            <View style={modalStyles.crosshairV} />

            {/* LOCKED chip */}
            <View style={modalStyles.lockedChip}>
              <Text style={modalStyles.lockedText}>LOCKED</Text>
            </View>

            {/* Label + confidence */}
            <View style={modalStyles.detectionLabel}>
              <Ionicons name="eye" size={13} color={Colors.gpsGreen} />
              <Text style={modalStyles.detectionLabelText}>
                {entry.detectionLabel!.toUpperCase()}
              </Text>
              <Text style={modalStyles.detectionConfText}>
                {(confidence * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        )}

        {/* Bottom info panel */}
        <View style={[modalStyles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}>
          <View style={modalStyles.gpsRow}>
            <Ionicons name="location" size={14} color={Colors.gpsGreen} />
            <Text style={modalStyles.gpsText}>{formatCoordFull(entry.latitude, entry.longitude)}</Text>
          </View>

          <View style={modalStyles.metaRow}>
            <View style={modalStyles.metaItem}>
              <Text style={modalStyles.metaLabel}>SESSION</Text>
              <Text style={modalStyles.metaValue} numberOfLines={1}>{entry.sessionId.slice(-8).toUpperCase()}</Text>
            </View>
            <View style={modalStyles.metaDivider} />
            <View style={modalStyles.metaItem}>
              <Text style={modalStyles.metaLabel}>SEGMENT</Text>
              <Text style={modalStyles.metaValue}>{entry.videoSegment.replace('seg_', '')}</Text>
            </View>
            {hasDetection && (
              <>
                <View style={modalStyles.metaDivider} />
                <View style={modalStyles.metaItem}>
                  <Text style={[modalStyles.metaLabel, { color: Colors.gpsGreen }]}>DETECTION</Text>
                  <Text style={[modalStyles.metaValue, { color: Colors.gpsGreen }]}>
                    {(confidence * 100).toFixed(0)}% CONF
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FrameRow({
  entry,
  index,
  onPress,
}: {
  entry: LogEntry;
  index: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.rowContainer, pressed && { backgroundColor: Colors.card }]}
    >
      <View style={styles.frameThumb}>
        {Platform.OS !== 'web' ? (
          <Image
            source={{ uri: entry.localPath }}
            style={styles.thumbImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.thumbImage, styles.thumbPlaceholder]}>
            <Ionicons name="image-outline" size={16} color={Colors.textTertiary} />
          </View>
        )}
        <View style={styles.frameIndexBadge}>
          <Text style={styles.frameIndexText}>{index + 1}</Text>
        </View>
      </View>

      <View style={styles.rowInfo}>
        <Text style={styles.rowFilename} numberOfLines={1}>{entry.filename}</Text>
        <Text style={styles.rowTime}>{formatTimestamp(entry.timestamp)}</Text>
        <View style={styles.coordContainer}>
          <Ionicons name="location-outline" size={11} color={Colors.gpsGreen} />
          <Text style={styles.rowCoord}>{formatCoordShort(entry.latitude, entry.longitude)}</Text>
        </View>
      </View>

      <View style={styles.rowRight}>
        {entry.detectionLabel ? (
          <View style={styles.detectionBadge}>
            <Ionicons name="eye" size={10} color={Colors.gpsGreen} />
            <Text style={styles.detectionBadgeText} numberOfLines={1}>
              {entry.detectionLabel}
            </Text>
          </View>
        ) : (
          <View style={styles.segmentBadge}>
            <Text style={styles.segmentBadgeText}>{entry.videoSegment.replace('seg_', '')}</Text>
          </View>
        )}
        <UploadBadge frameId={entry.id} />
        <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
      </View>
    </Pressable>
  );
}

function UploadStatusBanner() {
  const { supabaseConfigured, isOnline, isProcessing, queue, retryFailed } = useUpload();
  const { sessionId } = useRecording();

  if (!supabaseConfigured) return null;

  const sessionQueue = sessionId ? queue.filter((i) => i.sessionId === sessionId) : queue;
  const pendingCount = sessionQueue.filter((i) => i.status === 'pending' || i.status === 'uploading').length;
  const uploadedCount = sessionQueue.filter((i) => i.status === 'uploaded').length;
  const failedCount = sessionQueue.filter((i) => i.status === 'failed').length;

  const totalAll = queue.length;
  const uploadedAll = queue.filter((i) => i.status === 'uploaded').length;
  const isCurrentSession = Boolean(sessionId);

  return (
    <View style={styles.uploadBanner}>
      <View style={styles.uploadBannerLeft}>
        <Ionicons
          name={isOnline ? 'cloud-outline' : 'cloud-offline-outline'}
          size={13}
          color={isOnline ? Colors.blue : Colors.textTertiary}
        />
        <Text style={[styles.uploadBannerText, { color: isOnline ? Colors.blue : Colors.textTertiary }]}>
          {isOnline
            ? isCurrentSession
              ? 'Session sync'
              : `All-time: ${uploadedAll}/${totalAll}`
            : 'Offline — queued'}
        </Text>
        {isProcessing && (
          <ActivityIndicator size="small" color={Colors.blue} style={{ marginLeft: 4 }} />
        )}
      </View>
      <View style={styles.uploadBannerRight}>
        {uploadedCount > 0 && (
          <View style={[styles.uploadChip, styles.uploadChipGreen]}>
            <Ionicons name="cloud-done-outline" size={11} color={Colors.gpsGreen} />
            <Text style={[styles.uploadChipText, { color: Colors.gpsGreen }]}>{uploadedCount}</Text>
          </View>
        )}
        {pendingCount > 0 && (
          <View style={[styles.uploadChip, styles.uploadChipAmber]}>
            <Ionicons name="cloud-upload-outline" size={11} color={Colors.amber} />
            <Text style={[styles.uploadChipText, { color: Colors.amber }]}>{pendingCount}</Text>
          </View>
        )}
        {failedCount > 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              retryFailed();
            }}
            style={({ pressed }) => [
              styles.uploadChip,
              styles.uploadChipRed,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="refresh-outline" size={11} color={Colors.accent} />
            <Text style={[styles.uploadChipText, { color: Colors.accent }]}>
              Retry {failedCount}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const { logEntries, shareLog, clearLog, processingStatus, totalFrames, segmentCount } = useRecording();
  const [isSharing, setIsSharing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);

  const handleShare = async () => {
    if (Platform.OS === 'web') return;
    setIsSharing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await shareLog();
    setIsSharing(false);
  };

  const handleClear = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all captured frames and GPS log data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearLog();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Frame Log</Text>
          <Text style={styles.headerSubtitle}>
            {logEntries.length > 0
              ? `${logEntries.length} frames  ·  ${segmentCount} segments`
              : 'No frames captured yet'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {logEntries.length > 0 && (
            <Pressable
              onPress={handleShare}
              disabled={isSharing}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.shareBtn,
                pressed && { opacity: 0.7 },
              ]}
              testID="share-button"
            >
              <Ionicons name="share-outline" size={16} color={Colors.blue} />
              <Text style={[styles.actionBtnText, { color: Colors.blue }]}>
                {isSharing ? 'Sharing...' : 'Export CSV'}
              </Text>
            </Pressable>
          )}
          {logEntries.length > 0 && (
            <Pressable
              onPress={handleClear}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.clearBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.accent} />
            </Pressable>
          )}
        </View>
      </View>

      <UploadStatusBanner />

      {processingStatus === 'processing' && (
        <View style={styles.processingBanner}>
          <Ionicons name="cog" size={14} color={Colors.amber} />
          <Text style={styles.processingText}>Extracting frames and associating GPS data...</Text>
        </View>
      )}

      {logEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="layers-outline" size={40} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No frames yet</Text>
          <Text style={styles.emptySubtitle}>
            Start recording on the Capture tab. Frames are extracted and GPS-tagged automatically every 90 seconds.
          </Text>
          <View style={styles.emptyStats}>
            <View style={styles.emptyStat}>
              <Text style={styles.emptyStatValue}>0</Text>
              <Text style={styles.emptyStatLabel}>Segments</Text>
            </View>
            <View style={styles.emptyStatDivider} />
            <View style={styles.emptyStat}>
              <Text style={styles.emptyStatValue}>0</Text>
              <Text style={styles.emptyStatLabel}>Frames</Text>
            </View>
            <View style={styles.emptyStatDivider} />
            <View style={styles.emptyStat}>
              <Text style={styles.emptyStatValue}>~1fps</Text>
              <Text style={styles.emptyStatLabel}>Rate</Text>
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          data={logEntries}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <FrameRow
              entry={item}
              index={index}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedEntry(item);
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 + (Platform.OS === 'web' ? 34 : 0) },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={logEntries.length > 0}
        />
      )}

      {selectedEntry && (
        <FrameDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  shareBtn: {
    borderColor: 'rgba(10, 132, 255, 0.3)',
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
  },
  clearBtn: {
    borderColor: 'rgba(255, 59, 48, 0.25)',
    backgroundColor: 'rgba(255, 59, 48, 0.06)',
    paddingHorizontal: 10,
  },
  actionBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  uploadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(10, 132, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(10, 132, 255, 0.1)',
  },
  uploadBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadBannerText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  uploadBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  uploadChipGreen: {
    borderColor: 'rgba(48, 209, 88, 0.3)',
    backgroundColor: 'rgba(48, 209, 88, 0.08)',
  },
  uploadChipAmber: {
    borderColor: 'rgba(255, 159, 10, 0.3)',
    backgroundColor: 'rgba(255, 159, 10, 0.08)',
  },
  uploadChipRed: {
    borderColor: 'rgba(255, 59, 48, 0.3)',
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
  },
  uploadChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.amberDim,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 159, 10, 0.2)',
  },
  processingText: {
    color: Colors.amber,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 20,
  },
  emptyStat: {
    alignItems: 'center',
  },
  emptyStatValue: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
  },
  emptyStatLabel: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  emptyStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  listContent: {
    paddingTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.separator,
    marginLeft: 80,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  frameThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.card,
    marginRight: 12,
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  frameIndexBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  frameIndexText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
  },
  rowInfo: {
    flex: 1,
    gap: 3,
  },
  rowFilename: {
    color: Colors.text,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  rowTime: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  coordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rowCoord: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  rowRight: {
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  segmentBadge: {
    backgroundColor: Colors.card,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentBadgeText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  detectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,255,136,0.08)',
    borderWidth: 1,
    borderColor: Colors.gpsGreen,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 110,
  },
  detectionBadgeText: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    flexShrink: 1,
  },
  uploadBadge: {
    opacity: 0.9,
  },
});

const BRACKET_LEN = 28;
const BRACKET_THICK = 3;
const BRACKET_COLOR = Colors.gpsGreen;
const BOX_SIZE = SCREEN_W * 0.55;

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  topMeta: {
    flex: 1,
  },
  topFilename: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  topTime: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  segChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 2,
  },
  segChipText: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  detectionOverlay: {
    position: 'absolute',
    top: SCREEN_H / 2 - BOX_SIZE / 2,
    left: SCREEN_W / 2 - BOX_SIZE / 2,
    width: BOX_SIZE,
    height: BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bracketTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BRACKET_LEN,
    height: BRACKET_LEN,
  },
  bracketTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: BRACKET_LEN,
    height: BRACKET_LEN,
  },
  bracketBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: BRACKET_LEN,
    height: BRACKET_LEN,
  },
  bracketBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: BRACKET_LEN,
    height: BRACKET_LEN,
  },
  bracketH: {
    position: 'absolute',
    width: BRACKET_LEN,
    height: BRACKET_THICK,
    backgroundColor: BRACKET_COLOR,
    shadowColor: BRACKET_COLOR,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  bracketV: {
    position: 'absolute',
    width: BRACKET_THICK,
    height: BRACKET_LEN,
    backgroundColor: BRACKET_COLOR,
    shadowColor: BRACKET_COLOR,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  crosshairH: {
    position: 'absolute',
    width: 20,
    height: 1,
    backgroundColor: BRACKET_COLOR,
    opacity: 0.7,
  },
  crosshairV: {
    position: 'absolute',
    width: 1,
    height: 20,
    backgroundColor: BRACKET_COLOR,
    opacity: 0.7,
  },
  lockedChip: {
    position: 'absolute',
    top: -22,
    backgroundColor: Colors.gpsGreen,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lockedText: {
    color: '#000',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  detectionLabel: {
    position: 'absolute',
    bottom: -30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: Colors.gpsGreen,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detectionLabelText: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  detectionConfText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gpsText: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    gap: 2,
  },
  metaLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    letterSpacing: 1,
  },
  metaValue: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
