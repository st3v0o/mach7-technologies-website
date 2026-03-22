import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

function UploadBadge({ frameId }: { frameId: string }) {
  const { getItemStatus, supabaseConfigured } = useUpload();
  if (!supabaseConfigured) return null;

  const status = getItemStatus(frameId);
  if (!status) return null;

  if (status === 'uploading') {
    return <ActivityIndicator size="small" color={Colors.blue} style={styles.uploadBadge} />;
  }
  if (status === 'uploaded') {
    return (
      <Ionicons
        name="cloud-done-outline"
        size={14}
        color={Colors.gpsGreen}
        style={styles.uploadBadge}
      />
    );
  }
  if (status === 'failed') {
    return (
      <Ionicons
        name="cloud-offline-outline"
        size={14}
        color={Colors.accent}
        style={styles.uploadBadge}
      />
    );
  }
  return (
    <Ionicons
      name="cloud-upload-outline"
      size={14}
      color={Colors.amber}
      style={styles.uploadBadge}
    />
  );
}

function FrameRow({ entry, index }: { entry: LogEntry; index: number }) {
  return (
    <View style={styles.rowContainer}>
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
            <Feather name="image" size={16} color={Colors.textTertiary} />
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
        <View style={styles.segmentBadge}>
          <Text style={styles.segmentBadgeText}>{entry.videoSegment.replace('seg_', '')}</Text>
        </View>
        <UploadBadge frameId={entry.id} />
      </View>
    </View>
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
              <Feather name="share" size={16} color={Colors.blue} />
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
              <Feather name="trash-2" size={16} color={Colors.accent} />
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
          renderItem={({ item, index }) => <FrameRow entry={item} index={index} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 + (Platform.OS === 'web' ? 34 : 0) },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={logEntries.length > 0}
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
  uploadBadge: {
    opacity: 0.9,
  },
});
