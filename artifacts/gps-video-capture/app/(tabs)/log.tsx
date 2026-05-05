import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useNavigation } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import Colors from '@/constants/colors';
import { LogEntry, useRecording } from '@/contexts/RecordingContext';
import { usePortalConfig } from '@/contexts/PortalConfigContext';
import ExportModal from '@/components/ExportModal';
import LocalDatabaseSheet from '@/components/LocalDatabaseSheet';
import LogMapView, { SessionSection } from '@/components/LogMapView';
import { useUpload } from '@/contexts/UploadContext';
import { DEMO_SECTIONS } from '@/lib/demoData';
import { getCurrentLocale } from '@/src/i18n';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function formatTimestamp(ms: number): string {
  const locale = getCurrentLocale();
  const d = new Date(ms);
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
  const { getItemStatus, isCloudConfigured } = useUpload();
  if (!isCloudConfigured) return null;

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
        <View style={styles.segmentBadge}>
          <Text style={styles.segmentBadgeText}>{entry.videoSegment.replace('seg_', '')}</Text>
        </View>
        <UploadBadge frameId={entry.id} />
        <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
      </View>
    </Pressable>
  );
}

function UploadStatusBanner() {
  const { t } = useTranslation();
  const { isCloudConfigured, isOnline, isProcessing, queue, retryFailed } = useUpload();
  const { sessionId } = useRecording();

  if (!isCloudConfigured) return null;

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
              ? t('log.sessionSync')
              : t('log.allTime', { uploaded: uploadedAll, total: totalAll })
            : t('log.offline')}
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
              {t('log.retryFailed', { count: failedCount })}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

type GroupMode = 'session' | 'job' | 'date';

function formatDateLabel(ms: number): string {
  const locale = getCurrentLocale();
  return new Date(ms).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function groupByJobName(sessions: SessionSection[]): SessionSection[] {
  const map = new Map<string, SessionSection & { _sessionIds: string[] }>();
  for (const s of sessions) {
    const key = s.jobName || '__unlabeled__';
    if (!map.has(key)) {
      map.set(key, { ...s, sessionId: key + '_group', data: [...s.data], _sessionIds: [s.sessionId] });
    } else {
      const g = map.get(key)!;
      g.data = [...g.data, ...s.data].sort((a, b) => a.timestamp - b.timestamp);
      g._sessionIds.push(s.sessionId);
      g.sessionCount = g._sessionIds.length;
      if (s.startMs < g.startMs) g.startMs = s.startMs;
      const hasVideo = g.data.some((f) => f.videoSegment !== 'photo' && f.videoSegment !== 'detection');
      const hasPhoto = g.data.some((f) => f.videoSegment === 'photo');
      g.mode = hasVideo && hasPhoto ? 'mixed' : hasPhoto ? 'photo' : 'video';
    }
  }
  return [...map.values()]
    .map(({ _sessionIds: _s, ...rest }) => ({ ...rest, sessionCount: _s.length }))
    .sort((a, b) => {
      if (!a.jobName) return 1;
      if (!b.jobName) return -1;
      return a.jobName.localeCompare(b.jobName);
    });
}

function groupByDate(sessions: SessionSection[]): SessionSection[] {
  const map = new Map<string, SessionSection & { _sessionIds: string[] }>();
  for (const s of sessions) {
    const key = formatDateLabel(s.startMs);
    if (!map.has(key)) {
      map.set(key, { ...s, sessionId: key + '_group', jobName: key, data: [...s.data], _sessionIds: [s.sessionId] });
    } else {
      const g = map.get(key)!;
      g.data = [...g.data, ...s.data].sort((a, b) => a.timestamp - b.timestamp);
      g._sessionIds.push(s.sessionId);
      g.sessionCount = g._sessionIds.length;
      if (s.startMs > g.startMs) g.startMs = s.startMs;
      const hasVideo = g.data.some((f) => f.videoSegment !== 'photo' && f.videoSegment !== 'detection');
      const hasPhoto = g.data.some((f) => f.videoSegment === 'photo');
      g.mode = hasVideo && hasPhoto ? 'mixed' : hasPhoto ? 'photo' : 'video';
    }
  }
  return [...map.values()]
    .map(({ _sessionIds: _s, ...rest }) => ({ ...rest, sessionCount: _s.length }))
    .sort((a, b) => b.startMs - a.startMs);
}

function GroupHeader({
  section,
  mode,
  isCollapsed,
  onToggleCollapse,
}: {
  section: SessionSection;
  mode: GroupMode;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { t } = useTranslation();
  const label = mode === 'job'
    ? (section.jobName || t('log.unlabeled'))
    : section.jobName || formatDateLabel(section.startMs);
  const sessionCount = section.sessionCount ?? 1;
  const modeColor = section.mode === 'video' ? Colors.blue : section.mode === 'photo' ? Colors.gpsGreen : Colors.amber;
  return (
    <Pressable
      onPress={onToggleCollapse}
      style={({ pressed }) => [groupHeaderStyles.container, pressed && { opacity: 0.8 }]}
    >
      <View style={[groupHeaderStyles.accent, { backgroundColor: modeColor }]} />
      <Ionicons
        name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
        size={14}
        color={Colors.textTertiary}
        style={{ marginRight: 8 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={groupHeaderStyles.label}>{label}</Text>
        <Text style={groupHeaderStyles.meta}>
          {sessionCount} session{sessionCount !== 1 ? 's' : ''} · {section.data.length} frames
        </Text>
      </View>
      <View style={[groupHeaderStyles.modeBadge, { borderColor: modeColor }]}>
        <Text style={[groupHeaderStyles.modeText, { color: modeColor }]}>
          {section.mode.toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
}

function groupEntriesBySessions(entries: LogEntry[]): SessionSection[] {
  const map = new Map<string, LogEntry[]>();
  for (const e of entries) {
    const key = e.sessionId || 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  const sections: SessionSection[] = [];
  for (const [sid, frames] of map) {
    const sorted = [...frames].sort((a, b) => a.timestamp - b.timestamp);
    const hasVideo = sorted.some((f) => f.videoSegment !== 'photo' && f.videoSegment !== 'detection');
    const hasPhoto = sorted.some((f) => f.videoSegment === 'photo');
    const mode: 'video' | 'photo' | 'mixed' =
      hasVideo && hasPhoto ? 'mixed' : hasPhoto ? 'photo' : 'video';
    sections.push({ sessionId: sid, mode, startMs: sorted[0]?.timestamp ?? 0, data: sorted, jobName: sorted[0]?.jobName });
  }
  return sections.sort((a, b) => b.startMs - a.startMs);
}

function SessionHeader({
  section,
  fullData,
  onShareGpx,
  bulkMode = false,
  isSelected = false,
  onToggleSelected,
  onEditJobName,
  onToggleCollapse,
  isCollapsed = false,
}: {
  section: SessionSection;
  fullData: LogEntry[];
  onShareGpx: () => void;
  bulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelected?: () => void;
  onEditJobName?: () => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
}) {
  const { t } = useTranslation();
  const [sharing, setSharing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const { isPublished, publishSession, portalUrl, atlasSubmissions, removeFromAtlas } = usePortalConfig();
  const atlasSubmission = atlasSubmissions[section.sessionId];

  const d = new Date(section.startMs);
  const locale = getCurrentLocale();
  const dateStr = d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const modeColor =
    section.mode === 'video' ? Colors.blue :
    section.mode === 'photo' ? Colors.gpsGreen : Colors.amber;
  const modeLabel =
    section.mode === 'video' ? 'VIDEO' :
    section.mode === 'photo' ? 'PHOTO' : 'MIXED';

  const alreadyPublished = isPublished(section.sessionId);

  const handleGpx = async () => {
    if (sharing) return;
    setSharing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onShareGpx();
    setSharing(false);
  };

  const handlePublish = async () => {
    if (publishing) return;
    if (!portalUrl) {
      Alert.alert(t('log.portalNotConfigured'), t('log.setPortalUrl'));
      return;
    }
    setPublishing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { alreadyPublished: wasAlready } = await publishSession(
        section.sessionId,
        fullData,
        section.jobName || undefined
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPublishMsg(wasAlready ? 'Already in portal' : 'Published!');
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : 'Publish failed';
      setPublishMsg(`Error: ${msg.slice(0, 60)}`);
    } finally {
      setPublishing(false);
      setTimeout(() => setPublishMsg(null), 3000);
    }
  };

  return (
    <Pressable
      onPress={bulkMode ? onToggleSelected : onToggleCollapse}
      style={({ pressed }) => [
        sessionStyles.header,
        bulkMode && isSelected && sessionStyles.headerSelected,
        pressed && { opacity: 0.8 },
      ]}
    >
      {bulkMode ? (
        <View style={[sessionStyles.checkbox, isSelected && sessionStyles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
        </View>
      ) : (
        <Ionicons
          name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
          size={14}
          color={Colors.textTertiary}
          style={{ marginRight: 6 }}
        />
      )}
      <View style={sessionStyles.headerLeft}>
        <View style={[sessionStyles.modeBadge, { borderColor: modeColor }]}>
          <Text style={[sessionStyles.modeText, { color: modeColor }]}>{modeLabel}</Text>
        </View>
        <View>
          {!bulkMode && (
            <Pressable
              onPress={(e) => { e.stopPropagation(); onEditJobName?.(); }}
              hitSlop={4}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}
            >
              {section.jobName ? (
                <Text style={sessionStyles.jobNameText}>{section.jobName}</Text>
              ) : (
                <Text style={sessionStyles.jobNamePlaceholder}>{t('log.addJobName')}</Text>
              )}
              <Ionicons name="pencil-outline" size={11} color={Colors.textTertiary} />
            </Pressable>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={sessionStyles.dateText}>{dateStr} · {timeStr}</Text>
            {alreadyPublished && (
              <View style={sessionStyles.publishedBadge}>
                <Ionicons name="cloud-done-outline" size={10} color={Colors.gpsGreen} />
                <Text style={sessionStyles.publishedBadgeText}>{t('log.published')}</Text>
              </View>
            )}
            {!!atlasSubmission && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  Alert.alert(
                    t('log.removeFromAtlas'),
                    t('log.removeFromAtlasDesc'),
                    [
                      { text: t('log.cancel'), style: 'cancel' },
                      {
                        text: t('log.remove'),
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await removeFromAtlas(section.sessionId);
                          } catch (err) {
                            Alert.alert(t('error.title'), err instanceof Error ? err.message : t('log.removeFromAtlasError'));
                          }
                        },
                      },
                    ]
                  );
                }}
                style={({ pressed }) => [sessionStyles.atlasBadge, pressed && { opacity: 0.7 }]}
                hitSlop={4}
              >
                <Ionicons name="globe-outline" size={10} color={Colors.blue} />
                <Text style={sessionStyles.atlasBadgeText}>Atlas</Text>
              </Pressable>
            )}
          </View>
          <Text style={sessionStyles.countText}>
            {isCollapsed ? t('log.framesCollapsed', { count: fullData.length }) : t('log.frames', { count: fullData.length })}
          </Text>
          {publishMsg && (
            <Text style={[
              sessionStyles.publishMsg,
              publishMsg.startsWith('Error') ? { color: Colors.accent } : { color: Colors.gpsGreen },
            ]}>
              {publishMsg}
            </Text>
          )}
        </View>
      </View>
      {!bulkMode && (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {!!portalUrl && !alreadyPublished && (
            <Pressable
              onPress={(e) => { e.stopPropagation(); handlePublish(); }}
              disabled={publishing || Platform.OS === 'web'}
              style={({ pressed }) => [sessionStyles.publishBtn, pressed && { opacity: 0.7 }]}
            >
              {publishing
                ? <ActivityIndicator size="small" color={Colors.gpsGreen} style={{ width: 13, height: 13 }} />
                : <Ionicons name="cloud-upload-outline" size={13} color={Colors.gpsGreen} />}
              <Text style={sessionStyles.publishBtnText}>{publishing ? t('log.sending') : t('log.publish')}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={(e) => { e.stopPropagation(); handleGpx(); }}
            disabled={sharing || Platform.OS === 'web'}
            style={({ pressed }) => [sessionStyles.gpxBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="map-outline" size={13} color={Colors.amber} />
            <Text style={sessionStyles.gpxBtnText}>{sharing ? t('log.sharing') : t('log.gpx')}</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

type BulkPeriod = 'today' | 'week' | 'month' | 'year';

function getSessionsForPeriod(sections: SessionSection[], period: BulkPeriod): Set<string> {
  const now = new Date();
  let cutoff: Date;
  if (period === 'today') {
    cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === 'month') {
    cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    cutoff = new Date(now.getFullYear(), 0, 1);
  }
  const cutoffMs = cutoff.getTime();
  return new Set(sections.filter((s) => s.startMs >= cutoffMs).map((s) => s.sessionId));
}

function usePeriodLabels() {
  const { t } = useTranslation();
  return [
    { key: 'today' as BulkPeriod, label: t('log.today') },
    { key: 'week' as BulkPeriod, label: t('log.thisWeek') },
    { key: 'month' as BulkPeriod, label: t('log.thisMonth') },
    { key: 'year' as BulkPeriod, label: t('log.thisYear') },
  ];
}

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const periodLabels = usePeriodLabels();
  const navigation = useNavigation();
  const { logEntries, shareGpx, clearLog, processingStatus, totalFrames, segmentCount, renameSessionJobName } = useRecording();
  const { publishSession, portalUrl } = usePortalConfig();
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'table'>('list');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [mapSheetOpen, setMapSheetOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [activePeriod, setActivePeriod] = useState<BulkPeriod | null>(null);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(new Set());
  const [editingJobSession, setEditingJobSession] = useState<{ sessionId: string; currentName: string } | null>(null);
  const [jobEditDraft, setJobEditDraft] = useState('');

  const [groupMode, setGroupMode] = useState<GroupMode>('session');

  const sections = useMemo(() => groupEntriesBySessions(logEntries), [logEntries]);
  const groupedSections = useMemo(() => {
    if (groupMode === 'job') return groupByJobName(sections);
    if (groupMode === 'date') return groupByDate(sections);
    return sections;
  }, [sections, groupMode]);
  const displaySections = useMemo(
    () => groupedSections.map((s) => ({ ...s, data: collapsedSessions.has(s.sessionId) ? [] : s.data })),
    [groupedSections, collapsedSessions]
  );
  const mapSections = isDemoMode ? DEMO_SECTIONS : sections;
  const sessionIds = useMemo(() => sections.map((s) => s.sessionId), [sections]);

  useEffect(() => {
    setCollapsedSessions(new Set());
    if (groupMode !== 'session') {
      setIsBulkMode(false);
      setSelectedSessionIds(new Set());
      setActivePeriod(null);
    }
  }, [groupMode]);

  const toggleCollapse = (sessionId: string) => {
    setCollapsedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const openJobEdit = (sessionId: string, currentName: string) => {
    setEditingJobSession({ sessionId, currentName });
    setJobEditDraft(currentName);
  };

  const saveJobName = async () => {
    if (!editingJobSession) return;
    await renameSessionJobName(editingJobSession.sessionId, jobEditDraft.trim());
    setEditingJobSession(null);
  };

  const toggleBulkMode = () => {
    setIsBulkMode((v) => {
      if (v) {
        setSelectedSessionIds(new Set());
        setActivePeriod(null);
      }
      return !v;
    });
  };

  const togglePeriod = (period: BulkPeriod) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activePeriod === period) {
      setActivePeriod(null);
      setSelectedSessionIds(new Set());
    } else {
      setActivePeriod(period);
      setSelectedSessionIds(getSessionsForPeriod(sections, period));
    }
  };

  const toggleSession = (sessionId: string) => {
    setActivePeriod(null);
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const handleBulkPublish = async () => {
    if (!portalUrl) {
      Alert.alert(t('log.portalNotConfigured'), t('log.setPortalUrl'));
      return;
    }
    if (selectedSessionIds.size === 0) return;
    setBulkPublishing(true);
    let successCount = 0;
    let errorCount = 0;
    for (const sid of selectedSessionIds) {
      const section = sections.find((s) => s.sessionId === sid);
      if (!section) continue;
      try {
        await publishSession(sid, section.data, section.jobName || undefined);
        successCount++;
      } catch {
        errorCount++;
      }
    }
    setBulkPublishing(false);
    setIsBulkMode(false);
    setSelectedSessionIds(new Set());
    setActivePeriod(null);
    await Haptics.notificationAsync(
      errorCount > 0 ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success
    );
    const msg = errorCount > 0
      ? `Published ${successCount} sessions. ${errorCount} failed.`
      : `Published ${successCount} session${successCount !== 1 ? 's' : ''} to portal.`;
    Alert.alert('Bulk Publish', msg);
  };

  // Hide the tab bar while the frame preview sheet is open
  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;
    parent.setOptions({ tabBarStyle: mapSheetOpen ? { display: 'none' } : undefined });
    return () => { parent.setOptions({ tabBarStyle: undefined }); };
  }, [mapSheetOpen, navigation]);

  const handleClear = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      t('log.clearAll'),
      t('log.clearAllDesc'),
      [
        { text: t('log.cancel'), style: 'cancel' },
        {
          text: t('log.clearConfirm'),
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
          <Text style={styles.headerTitle}>{t('log.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {logEntries.length > 0
              ? t('log.framesCount', { count: logEntries.length, segments: segmentCount })
              : t('log.noFrames')}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {/* Demo toggle — only on map */}
          {viewMode === 'map' && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsDemoMode((d) => !d);
              }}
              style={({ pressed }) => [
                styles.actionBtn,
                isDemoMode ? styles.demoBtnActive : styles.demoToggleBtn,
                pressed && { opacity: 0.7 },
              ]}
              testID="demo-toggle"
            >
              <Ionicons
                name="flask-outline"
                size={15}
                color={isDemoMode ? '#000' : Colors.amber}
              />
              {isDemoMode && (
                <Text style={[styles.actionBtnText, { color: '#000', fontSize: 12 }]}>{t('log.demo')}</Text>
              )}
            </Pressable>
          )}

          {/* Select & Publish — only on list with portal configured */}
          {logEntries.length > 0 && viewMode === 'list' && !!portalUrl && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleBulkMode();
              }}
              style={({ pressed }) => [
                styles.actionBtn,
                isBulkMode ? styles.bulkModeActiveBtn : styles.bulkModeBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons
                name={isBulkMode ? 'close-outline' : 'cloud-upload-outline'}
                size={16}
                color={isBulkMode ? Colors.text : Colors.gpsGreen}
              />
              <Text style={[
                styles.actionBtnText,
                { color: isBulkMode ? Colors.text : Colors.gpsGreen, fontSize: 12 },
              ]}>
                {isBulkMode ? t('log.cancel') : t('log.publish')}
              </Text>
            </Pressable>
          )}

          {/* Export + clear — only on list and not in bulk mode */}
          {logEntries.length > 0 && viewMode === 'list' && !isBulkMode && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowExportModal(true);
              }}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.shareBtn,
                pressed && { opacity: 0.7 },
              ]}
              testID="export-button"
            >
              <Ionicons name="share-outline" size={16} color={Colors.blue} />
              <Text style={[styles.actionBtnText, { color: Colors.blue }]}>{t('log.export')}</Text>
            </Pressable>
          )}
          {logEntries.length > 0 && viewMode === 'list' && !isBulkMode && (
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

      {/* Bulk mode period chips */}
      {isBulkMode && viewMode === 'list' && (
        <View style={styles.bulkChipsRow}>
          <Text style={styles.bulkChipsLabel}>{t('log.selectAll')}:</Text>
          {periodLabels.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => togglePeriod(key)}
              style={({ pressed }) => [
                styles.bulkChip,
                activePeriod === key && styles.bulkChipActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[
                styles.bulkChipText,
                activePeriod === key && styles.bulkChipTextActive,
              ]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* View mode segmented control */}
      <View style={styles.segControl}>
        {([
          { mode: 'list' as const, icon: 'list-outline', label: t('log.listView') },
          { mode: 'map' as const, icon: 'map-outline', label: t('log.mapView') },
          { mode: 'table' as const, icon: 'grid-outline', label: t('log.tableView') },
        ]).map(({ mode, icon, label }) => (
          <Pressable
            key={mode}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (mode !== 'map') setIsDemoMode(false);
              setViewMode(mode);
            }}
            style={({ pressed }) => [
              styles.segBtn,
              viewMode === mode && styles.segBtnActive,
              pressed && { opacity: 0.75 },
            ]}
            testID={`view-mode-${mode}`}
          >
            <Ionicons
              name={icon as never}
              size={15}
              color={
                viewMode === mode
                  ? mode === 'map' ? Colors.amber : mode === 'table' ? Colors.gpsGreen : Colors.blue
                  : Colors.textTertiary
              }
            />
            <Text
              style={[
                styles.segBtnText,
                viewMode === mode && {
                  color: mode === 'map' ? Colors.amber : mode === 'table' ? Colors.gpsGreen : Colors.blue,
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {viewMode === 'list' && (
        <View style={styles.groupByControl}>
          <Text style={styles.groupByLabel}>{t('log.groupBy')}</Text>
          {([
            { mode: 'session' as GroupMode, label: t('log.bySession') },
            { mode: 'job' as GroupMode, label: t('log.byJob') },
            { mode: 'date' as GroupMode, label: t('log.byDate') },
          ]).map(({ mode, label }) => (
            <Pressable
              key={mode}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setGroupMode(mode);
              }}
              style={({ pressed }) => [
                styles.groupByBtn,
                groupMode === mode && styles.groupByBtnActive,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={[styles.groupByBtnText, groupMode === mode && styles.groupByBtnTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <UploadStatusBanner />

      {processingStatus === 'processing' && (
        <View style={styles.processingBanner}>
          <Ionicons name="cog" size={14} color={Colors.amber} />
          <Text style={styles.processingText}>{t('log.extractingFrames')}</Text>
        </View>
      )}

      {viewMode === 'table' ? (
        <LocalDatabaseSheet sections={sections} />
      ) : viewMode === 'map' ? (
        <LogMapView
          sections={mapSections}
          demoMode={isDemoMode}
          onSheetChange={setMapSheetOpen}
          onDemoPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsDemoMode(true);
          }}
          onSelectEntry={(entry) => {
            if (isDemoMode) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedEntry(entry);
          }}
        />
      ) : logEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="layers-outline" size={40} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>{t('log.noFrames')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('log.noFramesDesc')}
          </Text>
          <View style={styles.emptyStats}>
            <View style={styles.emptyStat}>
              <Text style={styles.emptyStatValue}>0</Text>
              <Text style={styles.emptyStatLabel}>{t('log.segments')}</Text>
            </View>
            <View style={styles.emptyStatDivider} />
            <View style={styles.emptyStat}>
              <Text style={styles.emptyStatValue}>0</Text>
              <Text style={styles.emptyStatLabel}>{t('log.frames')}</Text>
            </View>
            <View style={styles.emptyStatDivider} />
            <View style={styles.emptyStat}>
              <Text style={styles.emptyStatValue}>~1fps</Text>
              <Text style={styles.emptyStatLabel}>{t('log.rate')}</Text>
            </View>
          </View>
        </View>
      ) : (
        <SectionList
          sections={displaySections}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index, section }) => {
            const globalIndex = logEntries.indexOf(item);
            return (
              <FrameRow
                entry={item}
                index={globalIndex >= 0 ? globalIndex : index}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedEntry(item);
                }}
              />
            );
          }}
          renderSectionHeader={({ section }) => {
            const originalSection = groupedSections.find(s => s.sessionId === section.sessionId);
            const fullData = originalSection?.data ?? section.data;
            if (groupMode !== 'session') {
              return (
                <GroupHeader
                  section={{ ...section, data: fullData }}
                  mode={groupMode}
                  isCollapsed={collapsedSessions.has(section.sessionId)}
                  onToggleCollapse={() => toggleCollapse(section.sessionId)}
                />
              );
            }
            return (
              <SessionHeader
                section={section}
                fullData={fullData}
                onShareGpx={() => shareGpx(section.sessionId)}
                bulkMode={isBulkMode}
                isSelected={selectedSessionIds.has(section.sessionId)}
                onToggleSelected={() => toggleSession(section.sessionId)}
                onEditJobName={() => openJobEdit(section.sessionId, section.jobName || '')}
                onToggleCollapse={() => toggleCollapse(section.sessionId)}
                isCollapsed={collapsedSessions.has(section.sessionId)}
              />
            );
          }}
          SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 + (Platform.OS === 'web' ? 34 : 0) },
          ]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* Sticky bulk publish button */}
      {isBulkMode && viewMode === 'list' && (
        <View style={[styles.bulkFooter, { bottom: insets.bottom + 49 + 8 }]}>
          <Pressable
            onPress={handleBulkPublish}
            disabled={bulkPublishing || selectedSessionIds.size === 0}
            style={({ pressed }) => [
              styles.bulkPublishBtn,
              (bulkPublishing || selectedSessionIds.size === 0) && styles.bulkPublishBtnDisabled,
              pressed && { opacity: 0.8 },
            ]}
          >
            {bulkPublishing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="cloud-upload-outline" size={18} color="#fff" />}
            <Text style={styles.bulkPublishBtnText}>
              {bulkPublishing
                ? t('log.publishing')
                : selectedSessionIds.size === 0
                  ? t('log.selectSessions')
                  : t('log.publishN', { count: selectedSessionIds.size })}
            </Text>
          </Pressable>
        </View>
      )}

      {selectedEntry && (
        <FrameDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}

      {editingJobSession && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setEditingJobSession(null)}
        >
          <Pressable style={jobEditStyles.overlay} onPress={() => setEditingJobSession(null)}>
            <Pressable style={jobEditStyles.card} onPress={() => {}}>
              <Text style={jobEditStyles.title}>{t('log.editJobName')}</Text>
              <Text style={jobEditStyles.subtitle}>{t('log.jobNameSubtitle')}</Text>
              <TextInput
                style={jobEditStyles.input}
                value={jobEditDraft}
                onChangeText={setJobEditDraft}
                placeholder={t('log.editJobNamePlaceholder')}
                placeholderTextColor={Colors.textTertiary}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={saveJobName}
                maxLength={80}
              />
              <View style={jobEditStyles.buttons}>
                <Pressable
                  onPress={() => setEditingJobSession(null)}
                  style={({ pressed }) => [jobEditStyles.btn, jobEditStyles.btnCancel, pressed && { opacity: 0.7 }]}
                >
                  <Text style={jobEditStyles.btnCancelText}>{t('log.cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={saveJobName}
                  style={({ pressed }) => [jobEditStyles.btn, jobEditStyles.btnSave, pressed && { opacity: 0.7 }]}
                >
                  <Text style={jobEditStyles.btnSaveText}>{t('log.save')}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        logEntries={logEntries}
        sessionIds={sessionIds}
      />
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
  bulkModeBtn: {
    borderColor: 'rgba(48, 209, 88, 0.3)',
    backgroundColor: 'rgba(48, 209, 88, 0.07)',
    paddingHorizontal: 10,
  },
  bulkModeActiveBtn: {
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 10,
  },
  bulkChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(48, 209, 88, 0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(48, 209, 88, 0.1)',
  },
  bulkChipsLabel: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginRight: 2,
  },
  bulkChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  bulkChipActive: {
    borderColor: Colors.gpsGreen,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
  },
  bulkChipText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  bulkChipTextActive: {
    color: Colors.gpsGreen,
  },
  bulkFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bulkPublishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.gpsGreen,
    borderRadius: 14,
    paddingVertical: 14,
  },
  bulkPublishBtnDisabled: {
    opacity: 0.4,
  },
  bulkPublishBtnText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  mapBtn: {
    borderColor: 'rgba(255, 184, 0, 0.3)',
    backgroundColor: 'rgba(255, 184, 0, 0.06)',
    paddingHorizontal: 10,
  },
  mapBtnActive: {
    borderColor: 'rgba(255, 184, 0, 0.6)',
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 10,
  },
  tableBtnActive: {
    borderColor: 'rgba(0, 255, 136, 0.5)',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 10,
  },
  demoToggleBtn: {
    borderColor: 'rgba(255, 184, 0, 0.3)',
    backgroundColor: 'rgba(255, 184, 0, 0.06)',
    paddingHorizontal: 10,
  },
  demoBtnActive: {
    borderColor: Colors.amber,
    backgroundColor: Colors.amber,
    paddingHorizontal: 10,
  },
  actionBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  segControl: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
    gap: 2,
  },
  groupByControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 2,
    gap: 6,
  },
  groupByLabel: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginRight: 2,
  },
  groupByBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupByBtnActive: {
    backgroundColor: Colors.blue + '22',
    borderColor: Colors.blue,
  },
  groupByBtnText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  groupByBtnTextActive: {
    color: Colors.blue,
    fontFamily: 'Inter_600SemiBold',
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  segBtnActive: {
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segBtnText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_600SemiBold',
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
  sectionSeparator: {
    height: 8,
    backgroundColor: Colors.background,
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

const sessionStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modeBadge: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  modeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  dateText: {
    color: Colors.text,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  countText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  gpxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.35)',
    backgroundColor: 'rgba(255, 179, 0, 0.07)',
  },
  gpxBtnText: {
    color: Colors.amber,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  headerSelected: {
    backgroundColor: 'rgba(48, 209, 88, 0.07)',
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxSelected: {
    backgroundColor: Colors.gpsGreen,
    borderColor: Colors.gpsGreen,
  },
  publishedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.3)',
    backgroundColor: 'rgba(48, 209, 88, 0.08)',
  },
  publishedBadgeText: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    letterSpacing: 0.3,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.35)',
    backgroundColor: 'rgba(48, 209, 88, 0.07)',
  },
  publishBtnText: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  publishMsg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  atlasBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.3)',
    backgroundColor: 'rgba(10,132,255,0.08)',
  },
  atlasBadgeText: {
    color: Colors.blue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    letterSpacing: 0.3,
  },
  jobNameText: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  jobNamePlaceholder: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    fontStyle: 'italic',
  },
});

const groupHeaderStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  accent: {
    width: 3,
    height: 28,
    borderRadius: 2,
    marginRight: 10,
  },
  label: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  meta: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  modeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 8,
  },
  modeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
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

const jobEditStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  title: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: -4,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnSave: {
    backgroundColor: Colors.blue,
  },
  btnCancelText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  btnSaveText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
