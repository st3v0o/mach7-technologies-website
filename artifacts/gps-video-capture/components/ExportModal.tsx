import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import Colors from '@/constants/colors';
import { LogEntry } from '@/contexts/RecordingContext';
import { usePortalConfig } from '@/contexts/PortalConfigContext';
import { useStorageConfig, ShareProjectPayload } from '@/contexts/StorageConfigContext';
import { generateMapHtml } from '@/lib/map-share-generator';
import {
  isoNow,
  generateGeoJSON,
  generateKML,
  generateCSV,
  getGpxFiles,
  writeAndShare,
  buildZipAndShare,
  addPhotosToZip,
  addGpxToZip,
} from '@/lib/export-utils';

interface Props {
  visible: boolean;
  onClose: () => void;
  logEntries: LogEntry[];
  sessionIds: string[];
}

interface ExportOption {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  badge?: string;
  badgeColor?: string;
  description: string;
  tags: string[];
  handler: () => Promise<void>;
}

type PeriodFilter = 'all' | 'today' | 'week' | 'month';

type ShareMapResult =
  | { type: 'local_done' }
  | { type: 'url'; url: string }
  | { type: 'sent_no_url' };

function getPeriodCutoffMs(period: PeriodFilter): number {
  if (period === 'all') return 0;
  const now = new Date();
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  if (period === 'week') {
    return now.getTime() - 7 * 24 * 60 * 60 * 1000;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

const THUMBNAIL_KB = 20;
const MAX_MAP_KB = 10 * 1024;

export default function ExportModal({ visible, onClose, logEntries, sessionIds }: Props) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [atlasResult, setAtlasResult] = useState<{ success: boolean; message: string } | null>(null);
  const [newAtlasTokens, setNewAtlasTokens] = useState<{ sessionId: string; claimToken: string }[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [atlasEmail, setAtlasEmail] = useState<string>('');
  const [atlasConfirmOpen, setAtlasConfirmOpen] = useState(false);
  const confirmAnim = useRef(new Animated.Value(0)).current;

  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string> | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [selectedJobNames, setSelectedJobNames] = useState<Set<string> | null>(null);

  const [shareMapConfirmOpen, setShareMapConfirmOpen] = useState(false);
  const shareMapAnim = useRef(new Animated.Value(0)).current;
  const [shareMapWorking, setShareMapWorking] = useState(false);
  const [shareMapResult, setShareMapResult] = useState<ShareMapResult | null>(null);
  const [shareMapCopied, setShareMapCopied] = useState(false);

  const { providerType, isCloudConfigured, shareProject } = useStorageConfig();
  const { publishSession, portalUrl, atlasSubmissions, importAtlasSubmissions } = usePortalConfig();

  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem('atlas_email').then((saved) => {
        setAtlasEmail(saved ?? '');
      }).catch(() => {});
    }
  }, [visible]);

  const derivedSessions = useMemo(() => {
    const map = new Map<string, { jobName?: string; count: number; firstAt: number; lastAt: number }>();
    for (const e of logEntries) {
      const s = map.get(e.sessionId);
      if (!s) map.set(e.sessionId, { jobName: e.jobName, count: 1, firstAt: e.timestamp, lastAt: e.timestamp });
      else {
        s.count++;
        if (e.timestamp < s.firstAt) s.firstAt = e.timestamp;
        if (e.timestamp > s.lastAt) s.lastAt = e.timestamp;
      }
    }
    return [...map.entries()]
      .map(([id, s]) => ({ id, ...s }))
      .sort((a, b) => b.firstAt - a.firstAt);
  }, [logEntries]);

  const distinctJobNames = useMemo(() => {
    const names = new Set<string>();
    for (const s of derivedSessions) {
      if (s.jobName) names.add(s.jobName);
    }
    return [...names].sort();
  }, [derivedSessions]);

  const filteredEntries = useMemo(() => {
    let entries = logEntries;
    if (periodFilter !== 'all') {
      const since = getPeriodCutoffMs(periodFilter);
      entries = entries.filter((e) => e.timestamp >= since);
    }
    if (selectedSessionIds !== null) {
      entries = entries.filter((e) => selectedSessionIds.has(e.sessionId));
    }
    if (selectedJobNames !== null) {
      entries = entries.filter((e) => e.jobName && selectedJobNames.has(e.jobName));
    }
    return entries;
  }, [logEntries, selectedSessionIds, periodFilter, selectedJobNames]);

  const filteredSessionIds = useMemo(
    () => [...new Set(filteredEntries.map((e) => e.sessionId))],
    [filteredEntries]
  );

  const isFilterActive = periodFilter !== 'all' || selectedSessionIds !== null || selectedJobNames !== null;

  const photoCount = useMemo(
    () => filteredEntries.filter((e) => e.localPath).length,
    [filteredEntries]
  );
  const geotaggedCount = useMemo(
    () => filteredEntries.filter((e) => e.latitude !== 0 || e.longitude !== 0).length,
    [filteredEntries]
  );

  const shareMapEstimate = useMemo(() => {
    const localPhotoCount = filteredEntries.filter((e) => e.localPath).length;
    const maxPhotos = Math.floor(MAX_MAP_KB / THUMBNAIL_KB);
    const droppedCount = Math.max(0, localPhotoCount - maxPhotos);
    const embeddedCount = localPhotoCount - droppedCount;
    const estimatedKb = embeddedCount * THUMBNAIL_KB;
    return { localPhotoCount, embeddedCount, droppedCount, estimatedKb };
  }, [filteredEntries]);

  const useCloud = (providerType === 'supabase' || providerType === 'webhook') && isCloudConfigured;

  function openAtlasConfirm() {
    setAtlasConfirmOpen(true);
    Animated.spring(confirmAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start();
  }

  function closeAtlasConfirm() {
    Animated.timing(confirmAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => setAtlasConfirmOpen(false));
  }

  function openShareMapConfirm() {
    setShareMapResult(null);
    setShareMapCopied(false);
    setShareMapConfirmOpen(true);
    Animated.spring(shareMapAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start();
  }

  function closeShareMapConfirm() {
    Animated.timing(shareMapAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      setShareMapConfirmOpen(false);
      setShareMapResult(null);
    });
  }

  function handleClose() {
    setAtlasConfirmOpen(false);
    confirmAnim.setValue(0);
    setShareMapConfirmOpen(false);
    shareMapAnim.setValue(0);
    setShareMapResult(null);
    setShareMapWorking(false);
    setFilterOpen(false);
    setSelectedSessionIds(null);
    setPeriodFilter('all');
    setSelectedJobNames(null);
    onClose();
  }

  function toggleSession(sid: string) {
    if (selectedSessionIds === null) {
      const next = new Set(derivedSessions.map((s) => s.id));
      next.delete(sid);
      setSelectedSessionIds(next.size === derivedSessions.length ? null : next);
    } else {
      const next = new Set(selectedSessionIds);
      if (next.has(sid)) {
        next.delete(sid);
      } else {
        next.add(sid);
      }
      if (next.size === derivedSessions.length) {
        setSelectedSessionIds(null);
      } else {
        setSelectedSessionIds(next);
      }
    }
  }

  function isSessionSelected(sid: string) {
    return selectedSessionIds === null || selectedSessionIds.has(sid);
  }

  function toggleJobName(name: string) {
    if (selectedJobNames === null) {
      const next = new Set(distinctJobNames);
      next.delete(name);
      setSelectedJobNames(next.size === distinctJobNames.length ? null : next);
    } else {
      const next = new Set(selectedJobNames);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      setSelectedJobNames(next.size === distinctJobNames.length ? null : next);
    }
  }

  function isJobNameSelected(name: string) {
    return selectedJobNames === null || selectedJobNames.has(name);
  }

  function resetFilter() {
    setSelectedSessionIds(null);
    setPeriodFilter('all');
    setSelectedJobNames(null);
  }

  async function handleShareMap() {
    if (filteredEntries.length === 0) {
      setError(t('shareMap.noResults'));
      setShareMapConfirmOpen(false);
      return;
    }
    setShareMapWorking(true);
    setError(null);
    try {
      if (!useCloud) {
        const embedPhotos = new Map<string, string>();
        const withPhotos = [...filteredEntries]
          .filter((e) => e.localPath)
          .sort((a, b) => b.timestamp - a.timestamp);

        const baseHtml = generateMapHtml(filteredEntries, { mode: 'local', embedPhotos: new Map() });
        const baseBytes = new TextEncoder().encode(baseHtml).length;
        const maxBytes = Math.max(0, MAX_MAP_KB * 1024 - baseBytes);
        let totalBytes = 0;

        for (const entry of withPhotos) {
          try {
            const info = await FileSystem.getInfoAsync(entry.localPath);
            if (!info.exists) continue;
            const probe = await ImageManipulator.manipulateAsync(
              entry.localPath,
              [],
              { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
            );
            const isPortrait = probe.height > probe.width;
            const result = await ImageManipulator.manipulateAsync(
              entry.localPath,
              [{ resize: isPortrait ? { height: 320 } : { width: 320 } }],
              {
                compress: 0.5,
                format: ImageManipulator.SaveFormat.JPEG,
                base64: true,
              }
            );
            if (!result.base64) continue;
            const bytes = result.base64.length * 0.75;
            if (totalBytes + bytes > maxBytes) continue;
            totalBytes += bytes;
            embedPhotos.set(entry.filename, `data:image/jpeg;base64,${result.base64}`);
          } catch {
            continue;
          }
        }

        const html = generateMapHtml(filteredEntries, { mode: 'local', embedPhotos });
        const filename = `geospector_map_${isoNow()}.html`;
        const dest = (FileSystem.cacheDirectory ?? '') + filename;
        await FileSystem.writeAsStringAsync(dest, html, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        await Sharing.shareAsync(dest, {
          mimeType: 'text/html',
          dialogTitle: 'Share Map',
          UTI: 'public.html',
        });
        setShareMapResult({ type: 'local_done' });
      } else {
        const html = generateMapHtml(filteredEntries, { mode: 'cloud' });
        const sessionsMeta = derivedSessions
          .filter((s) => filteredSessionIds.includes(s.id))
          .map((s) => ({
            id: s.id,
            jobName: s.jobName,
            frameCount: s.count,
            firstFrameAt: new Date(s.firstAt).toISOString(),
            lastFrameAt: new Date(s.lastAt).toISOString(),
          }));
        const payload: ShareProjectPayload = {
          entries: filteredEntries,
          sessionIds: filteredSessionIds,
          mapHtml: html,
          sessions: sessionsMeta,
          metadata: {
            totalFrames: filteredEntries.length,
            geotaggedFrames: filteredEntries.filter(
              (e) => e.latitude !== 0 || e.longitude !== 0
            ).length,
            exportedAt: new Date().toISOString(),
          },
        };
        const url = await shareProject(payload);
        setShareMapResult(url ? { type: 'url', url } : { type: 'sent_no_url' });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('export.exportFailed'));
      setShareMapConfirmOpen(false);
    } finally {
      setShareMapWorking(false);
    }
  }

  async function copyShareMapUrl(url: string) {
    await Clipboard.setStringAsync(url);
    setShareMapCopied(true);
    setTimeout(() => setShareMapCopied(false), 2000);
  }

  async function run(id: string, fn: () => Promise<void>) {
    setActiveId(id);
    setError(null);
    setAtlasResult(null);
    setNewAtlasTokens([]);
    setCopiedToken(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('export.exportFailed'));
    } finally {
      setActiveId(null);
    }
  }

  async function copyToken(token: string) {
    await Clipboard.setStringAsync(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const shareMapDesc = useMemo(() => {
    if (providerType === 'supabase' && isCloudConfigured) return t('shareMap.descSupabase');
    if (providerType === 'webhook' && isCloudConfigured) return t('shareMap.descWebhook');
    return t('shareMap.descLocal');
  }, [providerType, isCloudConfigured, t]);

  const options: ExportOption[] = [
    {
      id: 'atlas',
      icon: 'globe-outline',
      iconColor: Colors.blue,
      title: 'Submit to Geospector Atlas',
      badge: 'Live',
      badgeColor: Colors.blue,
      description:
        'Publish sessions to the public Geospector Atlas map. Claim tokens are stored on this device only — use "Backup Atlas Tokens" below to save them so you can remove sessions after reinstalling the app.',
      tags: ['Portal', 'Live Map', 'Atlas'],
      handler: async () => {
        if (!portalUrl) {
          throw new Error('Portal URL not configured. Set it in Settings → Portal URL.');
        }
        const bySession = new Map<string, LogEntry[]>();
        for (const e of filteredEntries) {
          if (!bySession.has(e.sessionId)) bySession.set(e.sessionId, []);
          bySession.get(e.sessionId)!.push(e);
        }
        let successCount = 0;
        let alreadyCount = 0;
        const errors: string[] = [];
        const freshTokens: { sessionId: string; claimToken: string }[] = [];
        for (const [sid, entries] of bySession) {
          try {
            const result = await publishSession(sid, entries, entries[0]?.jobName, atlasEmail.trim() || undefined);
            if (result.alreadyPublished) {
              alreadyCount++;
            } else {
              successCount++;
              if (result.claimToken) {
                freshTokens.push({ sessionId: sid, claimToken: result.claimToken });
              }
            }
          } catch (e) {
            errors.push(e instanceof Error ? e.message : 'Unknown error');
          }
        }
        if (errors.length > 0 && successCount === 0 && alreadyCount === 0) {
          throw new Error(errors[0]!);
        }
        const trimmedEmail = atlasEmail.trim();
        try {
          if (trimmedEmail) {
            await AsyncStorage.setItem('atlas_email', trimmedEmail);
          } else {
            await AsyncStorage.removeItem('atlas_email');
          }
        } catch {}
        const parts: string[] = [];
        if (successCount > 0) parts.push(`${successCount} submitted`);
        if (alreadyCount > 0) parts.push(`${alreadyCount} already in Atlas`);
        if (errors.length > 0) parts.push(`${errors.length} failed`);
        if (freshTokens.length > 0) setNewAtlasTokens(freshTokens);
        setAtlasResult({
          success: errors.length === 0,
          message: parts.join(', '),
        });
      },
    },
    {
      id: 'atlas_backup',
      icon: 'key-outline',
      iconColor: Colors.amber,
      title: 'Backup Atlas Tokens',
      description:
        'Export your Atlas claim tokens as a JSON file. Store it safely — you need these to remove sessions from the Atlas if you reinstall the app or clear app storage.',
      tags: ['Atlas', 'JSON', 'Backup'],
      handler: async () => {
        const entries = Object.entries(atlasSubmissions);
        if (entries.length === 0) {
          throw new Error('No Atlas submissions found. Submit sessions to the Atlas first.');
        }
        const backup = {
          exported: new Date().toISOString(),
          note: 'Keep this file safe. These tokens let you remove sessions from the Geospector Atlas. They are device-only and cannot be recovered if lost.',
          sessions: atlasSubmissions,
        };
        await writeAndShare(
          `geospector_atlas_tokens_${isoNow()}.json`,
          JSON.stringify(backup, null, 2),
          'application/json'
        );
      },
    },
    {
      id: 'atlas_restore',
      icon: 'download-outline',
      iconColor: Colors.amber,
      title: 'Restore Atlas Tokens',
      description:
        'Import a previously exported atlas_tokens.json backup. Restored tokens re-enable the Atlas badge and "Remove from Atlas" button for recovered sessions.',
      tags: ['Atlas', 'JSON', 'Restore'],
      handler: async () => {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true,
        });
        if (result.canceled || result.assets.length === 0) return;
        const asset = result.assets[0];
        if (!asset) return;
        const raw = await FileSystem.readAsStringAsync(asset.uri);
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw new Error('The selected file is not valid JSON.');
        }
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          !('sessions' in parsed) ||
          typeof (parsed as Record<string, unknown>).sessions !== 'object' ||
          (parsed as Record<string, unknown>).sessions === null
        ) {
          throw new Error('Invalid backup file format. Expected a file with a "sessions" key.');
        }
        const sessions = (parsed as { sessions: Record<string, unknown> }).sessions;
        const { added, skipped } = await importAtlasSubmissions(
          sessions as Record<string, { atlasId: number; claimToken: string }>
        );
        const parts: string[] = [];
        if (added > 0) parts.push(`${added} token${added !== 1 ? 's' : ''} restored`);
        if (skipped > 0) parts.push(`${skipped} already present`);
        if (parts.length === 0) parts.push('No valid tokens found in file');
        setAtlasResult({ success: added > 0, message: parts.join(', ') });
      },
    },
    {
      id: 'shareMap',
      icon: 'map-outline',
      iconColor: '#4FC3F7',
      title: t('shareMap.title'),
      badge: t('shareMap.badge'),
      badgeColor: '#4FC3F7',
      description: shareMapDesc,
      tags: [t('shareMap.tags'), 'HTML', 'Browser'],
      handler: async () => {},
    },
    {
      id: 'full_archive',
      icon: 'archive-outline',
      iconColor: Colors.gpsGreen,
      title: t('export.fullArchive'),
      badge: t('export.recommended'),
      badgeColor: Colors.gpsGreen,
      description: t('export.fullArchiveDesc'),
      tags: ['Photos', 'GPX', 'GeoJSON', 'CSV', 'KML', 'ZIP'],
      handler: async () => {
        await buildZipAndShare(`geospector_export_${isoNow()}.zip`, async (zip) => {
          await addPhotosToZip(zip, filteredEntries);
          await addGpxToZip(zip, filteredSessionIds);
          zip.file('frame_log.csv', generateCSV(filteredEntries));
          zip.file('geospector.geojson', generateGeoJSON(filteredEntries));
          zip.file('geospector.kml', generateKML(filteredEntries));
          const sessionAtlasTokens = Object.fromEntries(
            Object.entries(atlasSubmissions).filter(([sid]) => filteredSessionIds.includes(sid))
          );
          if (Object.keys(sessionAtlasTokens).length > 0) {
            zip.file(
              'atlas_tokens.json',
              JSON.stringify(
                {
                  exported: new Date().toISOString(),
                  note: 'Keep this file safe. These tokens let you remove sessions from the Geospector Atlas. They are device-only and cannot be recovered if lost.',
                  sessions: sessionAtlasTokens,
                },
                null,
                2
              )
            );
          }
          zip.file(
            'README.txt',
            [
              'Geospector Export',
              `Exported: ${new Date().toISOString()}`,
              `Sessions: ${filteredSessionIds.length}`,
              `Frames: ${filteredEntries.length} (${geotaggedCount} geotagged)`,
              '',
              'Contents:',
              '  photos/           — all captured frames as JPEG',
              '  gpx_tracks/       — per-session GPX route files',
              '  frame_log.csv     — full frame database with coordinates',
              '  geospector.geojson — GIS point layer (QGIS, ArcGIS, Mapbox)',
              '  geospector.kml    — Google Earth / Google Maps',
              ...(Object.keys(sessionAtlasTokens).length > 0
                ? ['  atlas_tokens.json — Atlas claim tokens (keep safe — needed to remove sessions from Atlas)']
                : []),
            ].join('\n')
          );
        });
      },
    },
    {
      id: 'gis_package',
      icon: 'globe-outline',
      iconColor: Colors.blue,
      title: t('export.gisPackage'),
      description: t('export.gisPackageDesc'),
      tags: ['GeoJSON', 'KML', 'CSV', 'ZIP'],
      handler: async () => {
        await buildZipAndShare(`geospector_gis_${isoNow()}.zip`, async (zip) => {
          zip.file('geospector.geojson', generateGeoJSON(filteredEntries));
          zip.file('geospector.kml', generateKML(filteredEntries));
          zip.file('frame_log.csv', generateCSV(filteredEntries));
        });
      },
    },
    {
      id: 'inspection_package',
      icon: 'camera-outline',
      iconColor: Colors.amber,
      title: t('export.inspectionPackage'),
      description: t('export.inspectionPackageDesc'),
      tags: ['Photos', 'CSV', 'GPX', 'ZIP'],
      handler: async () => {
        await buildZipAndShare(`geospector_inspection_${isoNow()}.zip`, async (zip) => {
          await addPhotosToZip(zip, filteredEntries);
          await addGpxToZip(zip, filteredSessionIds);
          zip.file('metadata.csv', generateCSV(filteredEntries));
        });
      },
    },
    {
      id: 'gps_tracks',
      icon: 'navigate-outline',
      iconColor: Colors.accent,
      title: t('export.gpsTracks'),
      description: t('export.gpsTracksDesc'),
      tags: ['GPX', 'ZIP'],
      handler: async () => {
        const gpxFiles = await getGpxFiles(filteredSessionIds);
        if (gpxFiles.length === 0) throw new Error(t('export.noGpxFound'));
        if (gpxFiles.length === 1) {
          await Sharing.shareAsync(gpxFiles[0].path, {
            mimeType: 'application/gpx+xml',
            dialogTitle: 'Export GPS Track',
            UTI: 'com.topografix.gpx',
          });
        } else {
          await buildZipAndShare(`geospector_gpx_${isoNow()}.zip`, async (zip) => {
            for (const { name, path } of gpxFiles) {
              const content = await FileSystem.readAsStringAsync(path);
              zip.file(name, content);
            }
          });
        }
      },
    },
    {
      id: 'geojson',
      icon: 'map-outline',
      iconColor: Colors.blue,
      title: t('export.geojson'),
      description: t('export.geojsonDesc'),
      tags: ['GeoJSON'],
      handler: async () => {
        await writeAndShare(
          `geospector_${isoNow()}.geojson`,
          generateGeoJSON(filteredEntries),
          'application/geo+json'
        );
      },
    },
    {
      id: 'kml',
      icon: 'earth-outline',
      iconColor: '#4285F4',
      title: t('export.kml'),
      description: t('export.kmlDesc'),
      tags: ['KML'],
      handler: async () => {
        await writeAndShare(
          `geospector_${isoNow()}.kml`,
          generateKML(filteredEntries),
          'application/vnd.google-earth.kml+xml'
        );
      },
    },
    {
      id: 'csv',
      icon: 'grid-outline',
      iconColor: Colors.textSecondary,
      title: t('export.csv'),
      description: t('export.csvDesc'),
      tags: ['CSV'],
      handler: async () => {
        await writeAndShare(
          `geospector_${isoNow()}.csv`,
          generateCSV(filteredEntries),
          'text/csv'
        );
      },
    },
  ];

  const filterBadgeLabel = isFilterActive
    ? t('shareMap.filterBadge', {
        selected: filteredSessionIds.length,
        total: derivedSessions.length,
      })
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.root}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{t('export.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {isFilterActive
                ? `${filteredEntries.length} of ${logEntries.length} frames · ${filteredSessionIds.length} of ${derivedSessions.length} sessions · ${geotaggedCount} geotagged`
                : filteredSessionIds.length === 1
                ? t('export.summary', {
                    frames: filteredEntries.length,
                    sessions: filteredSessionIds.length,
                    geotagged: geotaggedCount,
                  })
                : t('export.summarySessions', {
                    frames: filteredEntries.length,
                    sessions: filteredSessionIds.length,
                    geotagged: geotaggedCount,
                  })}
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color={Colors.text} />
          </Pressable>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={14} color={Colors.accent} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {atlasResult && (
          <View
            style={[
              styles.errorBanner,
              atlasResult.success ? styles.successBanner : undefined,
            ]}
          >
            <Ionicons
              name={atlasResult.success ? 'checkmark-circle-outline' : 'warning-outline'}
              size={14}
              color={atlasResult.success ? Colors.gpsGreen : Colors.accent}
            />
            <Text
              style={[
                styles.errorText,
                atlasResult.success && { color: Colors.gpsGreen },
              ]}
            >
              {atlasResult.message}
            </Text>
          </View>
        )}

        {newAtlasTokens.length > 0 && (
          <View style={styles.tokenPanel}>
            <View style={styles.tokenPanelHeader}>
              <Ionicons name="key-outline" size={14} color={Colors.amber} />
              <Text style={styles.tokenPanelTitle}>
                Save your delete code{newAtlasTokens.length > 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={styles.tokenPanelDesc}>
              Keep this code safe — you'll need it to remove your session from the Atlas via the portal website.
            </Text>
            {newAtlasTokens.map(({ sessionId, claimToken }) => (
              <View key={sessionId} style={styles.tokenRow}>
                <Text style={styles.tokenText} selectable>
                  {claimToken}
                </Text>
                <Pressable
                  onPress={() => copyToken(claimToken)}
                  style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.6 }]}
                  hitSlop={8}
                >
                  <Ionicons
                    name={copiedToken === claimToken ? 'checkmark-outline' : 'copy-outline'}
                    size={15}
                    color={copiedToken === claimToken ? Colors.gpsGreen : Colors.amber}
                  />
                  <Text
                    style={[
                      styles.copyBtnText,
                      copiedToken === claimToken && { color: Colors.gpsGreen },
                    ]}
                  >
                    {copiedToken === claimToken ? 'Copied!' : 'Copy'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {logEntries.length > 0 && (
            <View style={styles.filterSection}>
              <Pressable
                onPress={() => setFilterOpen((v) => !v)}
                style={({ pressed }) => [styles.filterHeader, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.filterHeaderLeft}>
                  <Ionicons
                    name="funnel-outline"
                    size={14}
                    color={isFilterActive ? Colors.blue : Colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.filterHeaderText,
                      isFilterActive && { color: Colors.blue },
                    ]}
                  >
                    {t('shareMap.filterTitle')}
                  </Text>
                  {filterBadgeLabel && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{filterBadgeLabel}</Text>
                    </View>
                  )}
                </View>
                <Ionicons
                  name={filterOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={Colors.textTertiary}
                />
              </Pressable>

              {filterOpen && (
                <View style={styles.filterBody}>
                  <View style={styles.periodRow}>
                    {(['all', 'today', 'week', 'month'] as PeriodFilter[]).map((p) => {
                      const labels: Record<PeriodFilter, string> = {
                        all: t('shareMap.filterAll'),
                        today: t('shareMap.filterToday'),
                        week: t('shareMap.filterWeek'),
                        month: t('shareMap.filterMonth'),
                      };
                      const active = periodFilter === p;
                      return (
                        <Pressable
                          key={p}
                          onPress={() => setPeriodFilter(p)}
                          style={({ pressed }) => [
                            styles.periodChip,
                            active && styles.periodChipActive,
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.periodChipText,
                              active && styles.periodChipTextActive,
                            ]}
                          >
                            {labels[p]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {distinctJobNames.length > 0 && (
                    <View style={styles.periodRow}>
                      {distinctJobNames.map((name) => {
                        const isActive = selectedJobNames === null || selectedJobNames.has(name);
                        return (
                          <Pressable
                            key={name}
                            onPress={() => toggleJobName(name)}
                            style={({ pressed }) => [
                              styles.periodChip,
                              isActive && styles.periodChipActive,
                              pressed && { opacity: 0.7 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.periodChipText,
                                isActive && styles.periodChipTextActive,
                              ]}
                              numberOfLines={1}
                            >
                              {name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  <View style={styles.sessionList}>
                    {derivedSessions.map((s) => {
                      const selected = isSessionSelected(s.id);
                      const label = s.jobName || s.id.slice(0, 8);
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => toggleSession(s.id)}
                          style={({ pressed }) => [
                            styles.sessionRow,
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <Ionicons
                            name={selected ? 'checkbox-outline' : 'square-outline'}
                            size={18}
                            color={selected ? Colors.blue : Colors.textTertiary}
                          />
                          <View style={styles.sessionRowContent}>
                            <Text
                              style={[
                                styles.sessionLabel,
                                !selected && { color: Colors.textTertiary },
                              ]}
                              numberOfLines={1}
                            >
                              {label}
                            </Text>
                            <Text style={styles.sessionMeta}>
                              {s.id.slice(0, 8)} · {s.count} frames
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  {isFilterActive && (
                    <Pressable
                      onPress={resetFilter}
                      style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.6 }]}
                    >
                      <Ionicons name="close-circle-outline" size={14} color={Colors.textTertiary} />
                      <Text style={styles.resetBtnText}>{t('shareMap.filterReset')}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}

          {filteredEntries.length === 0 && isFilterActive && (
            <View style={styles.noResultsBanner}>
              <Ionicons name="search-outline" size={14} color={Colors.textTertiary} />
              <Text style={styles.noResultsText}>{t('shareMap.noResults')}</Text>
            </View>
          )}

          {options.map((opt) => {
            const isLoading = opt.id === 'shareMap' ? shareMapWorking : activeId === opt.id;
            const isDisabled =
              opt.id === 'shareMap'
                ? !!activeId
                : !!activeId || shareMapWorking;
            const isShareMap = opt.id === 'shareMap';
            const isAtlas = opt.id === 'atlas';

            return (
              <React.Fragment key={opt.id}>
                <Pressable
                  onPress={() => {
                    if (isAtlas) {
                      openAtlasConfirm();
                    } else if (isShareMap) {
                      openShareMapConfirm();
                    } else {
                      run(opt.id, opt.handler);
                    }
                  }}
                  disabled={
                    isDisabled ||
                    (isAtlas && atlasConfirmOpen) ||
                    (isShareMap && (shareMapConfirmOpen || shareMapWorking))
                  }
                  style={({ pressed }) => [
                    styles.card,
                    (isAtlas && atlasConfirmOpen) && styles.cardConfirmOpen,
                    (isShareMap && shareMapConfirmOpen) && styles.cardConfirmOpen,
                    pressed &&
                      !isDisabled &&
                      !(isAtlas && atlasConfirmOpen) &&
                      !(isShareMap && shareMapConfirmOpen) && { opacity: 0.8 },
                    isDisabled && !isLoading && { opacity: 0.4 },
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: opt.iconColor + '18' }]}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color={opt.iconColor} />
                    ) : (
                      <Ionicons name={opt.icon as never} size={22} color={opt.iconColor} />
                    )}
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>{opt.title}</Text>
                      {opt.badge && (
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: opt.badgeColor + '20',
                              borderColor: opt.badgeColor + '50',
                            },
                          ]}
                        >
                          <Text style={[styles.badgeText, { color: opt.badgeColor }]}>
                            {opt.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardDesc}>{opt.description}</Text>
                    <View style={styles.tagRow}>
                      {opt.tags.map((tag) => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {!isLoading && (
                    <Ionicons
                      name={
                        (isAtlas && atlasConfirmOpen) || (isShareMap && shareMapConfirmOpen)
                          ? 'chevron-down'
                          : 'chevron-forward'
                      }
                      size={16}
                      color={Colors.textTertiary}
                    />
                  )}
                </Pressable>

                {isAtlas && atlasConfirmOpen && activeId !== 'atlas' && (
                  <Animated.View
                    style={[
                      styles.confirmPanel,
                      styles.atlasPanel,
                      {
                        opacity: confirmAnim,
                        transform: [
                          {
                            translateY: confirmAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-8, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.atlasEmailLabel}>Your email (optional)</Text>
                    <TextInput
                      style={styles.atlasEmailInput}
                      value={atlasEmail}
                      onChangeText={setAtlasEmail}
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                      placeholderTextColor={Colors.textTertiary}
                    />
                    <Text style={styles.atlasEmailHint}>
                      Enter your email so you can request a delete link from the portal later — no delete code required.
                    </Text>
                    <View style={styles.confirmButtons}>
                      <Pressable
                        onPress={closeAtlasConfirm}
                        style={({ pressed }) => [
                          styles.confirmCancel,
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        <Text style={styles.confirmCancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          closeAtlasConfirm();
                          run(opt.id, opt.handler);
                        }}
                        disabled={!!activeId}
                        style={({ pressed }) => [
                          styles.confirmSubmit,
                          styles.atlasSubmitBg,
                          pressed && !activeId && { opacity: 0.85 },
                          !!activeId && { opacity: 0.5 },
                        ]}
                      >
                        <Ionicons name="globe-outline" size={15} color="#fff" />
                        <Text style={styles.confirmSubmitText}>Submit to Atlas</Text>
                      </Pressable>
                    </View>
                  </Animated.View>
                )}

                {isShareMap && shareMapConfirmOpen && (
                  <Animated.View
                    style={[
                      styles.confirmPanel,
                      styles.shareMapPanel,
                      {
                        opacity: shareMapAnim,
                        transform: [
                          {
                            translateY: shareMapAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-8, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    {shareMapWorking ? (
                      <View style={styles.shareMapWorking}>
                        <ActivityIndicator size="small" color="#4FC3F7" />
                        <Text style={styles.shareMapWorkingText}>{t('shareMap.generatingMap')}</Text>
                      </View>
                    ) : shareMapResult ? (
                      <ShareMapResultPanel
                        result={shareMapResult}
                        copied={shareMapCopied}
                        onCopy={copyShareMapUrl}
                        onShare={async (url) => {
                          const dest = (FileSystem.cacheDirectory ?? '') + 'map_link.txt';
                          await FileSystem.writeAsStringAsync(dest, url);
                          await Sharing.shareAsync(dest, {
                            mimeType: 'text/plain',
                            dialogTitle: 'Share Map Link',
                          });
                        }}
                        onClose={closeShareMapConfirm}
                        t={t}
                      />
                    ) : (
                      <>
                        <Text style={styles.confirmSectionTitle}>{t('shareMap.confirmTitle')}</Text>

                        <View style={styles.shareMapStats}>
                          <View style={styles.shareMapStatRow}>
                            <Ionicons name="location-outline" size={13} color={Colors.textTertiary} />
                            <Text style={styles.shareMapStatText}>
                              <Text style={{ color: Colors.text }}>{geotaggedCount}</Text> geotagged points
                            </Text>
                          </View>

                          {useCloud ? (
                            filteredEntries.some((e) => e.supabaseUrl) ? (
                              <View style={styles.shareMapStatRow}>
                                <Ionicons name="image-outline" size={13} color={Colors.textTertiary} />
                                <Text style={styles.shareMapStatText}>
                                  {t('shareMap.photosByUrl')}
                                </Text>
                              </View>
                            ) : photoCount > 0 ? (
                              <View style={styles.shareMapStatRow}>
                                <Ionicons name="image-outline" size={13} color={Colors.textTertiary} />
                                <Text style={styles.shareMapStatText}>
                                  {t('shareMap.noPhotos')}
                                </Text>
                              </View>
                            ) : null
                          ) : photoCount > 0 ? (
                            <>
                              <View style={styles.shareMapStatRow}>
                                <Ionicons name="image-outline" size={13} color={Colors.textTertiary} />
                                <Text style={styles.shareMapStatText}>
                                  {t('shareMap.photosEmbedded', {
                                    count: shareMapEstimate.embeddedCount,
                                    size: shareMapEstimate.estimatedKb,
                                  })}
                                </Text>
                              </View>
                              {shareMapEstimate.droppedCount > 0 && (
                                <View style={styles.shareMapStatRow}>
                                  <Ionicons name="warning-outline" size={13} color={Colors.amber} />
                                  <Text style={[styles.shareMapStatText, { color: Colors.amber }]}>
                                    {t('shareMap.capWarning', {
                                      dropped: shareMapEstimate.droppedCount,
                                    })}
                                  </Text>
                                </View>
                              )}
                            </>
                          ) : (
                            <View style={styles.shareMapStatRow}>
                              <Ionicons name="image-outline" size={13} color={Colors.textTertiary} />
                              <Text style={styles.shareMapStatText}>{t('shareMap.noPhotos')}</Text>
                            </View>
                          )}

                          <View style={styles.shareMapStatRow}>
                            <Ionicons name="cloud-outline" size={13} color={Colors.textTertiary} />
                            <Text style={styles.shareMapStatText}>
                              {useCloud && providerType === 'supabase'
                                ? t('shareMap.providerSupabase')
                                : useCloud && providerType === 'webhook'
                                ? t('shareMap.providerWebhook')
                                : t('shareMap.providerLocal')}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.confirmButtons}>
                          <Pressable
                            onPress={closeShareMapConfirm}
                            style={({ pressed }) => [
                              styles.confirmCancel,
                              pressed && { opacity: 0.6 },
                            ]}
                          >
                            <Text style={styles.confirmCancelText}>Cancel</Text>
                          </Pressable>
                          <Pressable
                            onPress={handleShareMap}
                            style={({ pressed }) => [
                              styles.confirmSubmit,
                              styles.shareMapSubmitBg,
                              pressed && { opacity: 0.85 },
                            ]}
                          >
                            <Ionicons name="map-outline" size={15} color="#fff" />
                            <Text style={styles.confirmSubmitText}>
                              {t('shareMap.confirmButton')}
                            </Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </Animated.View>
                )}
              </React.Fragment>
            );
          })}

          <View style={styles.footer}>
            <Ionicons name="folder-outline" size={13} color={Colors.textTertiary} />
            <Text style={styles.footerText}>
              Raw files are also accessible via the Files app under Geospector
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

interface ShareMapResultPanelProps {
  result: ShareMapResult;
  copied: boolean;
  onCopy: (url: string) => void;
  onShare: (url: string) => void;
  onClose: () => void;
  t: (key: string) => string;
}

function ShareMapResultPanel({
  result,
  copied,
  onCopy,
  onShare,
  onClose,
  t,
}: ShareMapResultPanelProps) {
  if (result.type === 'local_done') {
    return (
      <View style={styles.resultPanel}>
        <View style={styles.resultHeader}>
          <Ionicons name="checkmark-circle-outline" size={18} color={Colors.gpsGreen} />
          <Text style={styles.resultTitle}>{t('shareMap.localDoneTitle')}</Text>
        </View>
        <Text style={styles.resultNote}>{t('shareMap.localDoneNote')}</Text>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.resultDismiss, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.resultDismissText}>{t('shareMap.done')}</Text>
        </Pressable>
      </View>
    );
  }

  if (result.type === 'url') {
    return (
      <View style={styles.resultPanel}>
        <View style={styles.resultHeader}>
          <Ionicons name="checkmark-circle-outline" size={18} color={Colors.gpsGreen} />
          <Text style={styles.resultTitle}>{t('shareMap.urlTitle')}</Text>
        </View>
        <Text style={styles.resultNote}>{t('shareMap.urlNote')}</Text>
        <Text style={styles.resultUrl} selectable numberOfLines={2}>
          {result.url}
        </Text>
        <View style={styles.resultActions}>
          <Pressable
            onPress={() => onCopy(result.url)}
            style={({ pressed }) => [styles.resultActionBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons
              name={copied ? 'checkmark-outline' : 'copy-outline'}
              size={14}
              color={copied ? Colors.gpsGreen : Colors.blue}
            />
            <Text style={[styles.resultActionText, copied && { color: Colors.gpsGreen }]}>
              {copied ? t('shareMap.copied') : t('shareMap.copyLink')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onShare(result.url)}
            style={({ pressed }) => [styles.resultActionBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="share-outline" size={14} color={Colors.blue} />
            <Text style={styles.resultActionText}>{t('shareMap.shareVia')}</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.resultDismiss, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.resultDismissText}>{t('shareMap.done')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.resultPanel}>
      <View style={styles.resultHeader}>
        <Ionicons name="checkmark-circle-outline" size={18} color={Colors.gpsGreen} />
        <Text style={styles.resultTitle}>{t('shareMap.sentNoUrl')}</Text>
      </View>
      <Text style={styles.resultNote}>{t('shareMap.sentNoUrlNote')}</Text>
      <Pressable
        onPress={onClose}
        style={({ pressed }) => [styles.resultDismiss, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.resultDismissText}>{t('shareMap.done')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'ios' ? 0 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.25)',
  },
  successBanner: {
    backgroundColor: 'rgba(48,209,88,0.08)',
    borderColor: 'rgba(48,209,88,0.25)',
  },
  errorText: {
    color: Colors.accent,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    flex: 1,
  },
  list: {
    padding: 16,
    gap: 10,
    paddingBottom: 48,
  },
  filterSection: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  filterHeaderText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  filterBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Colors.blue + '20',
    borderWidth: 1,
    borderColor: Colors.blue + '40',
  },
  filterBadgeText: {
    color: Colors.blue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  filterBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodChipActive: {
    backgroundColor: Colors.blue + '18',
    borderColor: Colors.blue + '50',
  },
  periodChipText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  periodChipTextActive: {
    color: Colors.blue,
  },
  sessionList: {
    gap: 2,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
  },
  sessionRowContent: {
    flex: 1,
  },
  sessionLabel: {
    color: Colors.text,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  sessionMeta: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  resetBtnText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  noResultsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noResultsText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  cardConfirmOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: 'transparent',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitle: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  cardDesc: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  confirmPanel: {
    marginTop: 0,
    marginBottom: 2,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    gap: 8,
  },
  atlasPanel: {
    backgroundColor: 'rgba(10, 132, 255, 0.06)',
    borderColor: 'rgba(10, 132, 255, 0.2)',
  },
  shareMapPanel: {
    backgroundColor: 'rgba(79, 195, 247, 0.06)',
    borderColor: 'rgba(79, 195, 247, 0.2)',
  },
  atlasEmailLabel: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.1,
  },
  atlasEmailInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: Colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  atlasEmailHint: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  confirmSectionTitle: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  shareMapStats: {
    gap: 5,
  },
  shareMapStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  shareMapStatText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    flex: 1,
  },
  shareMapWorking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  shareMapWorkingText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  confirmButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  confirmCancel: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmCancelText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  confirmSubmit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  atlasSubmitBg: {
    backgroundColor: Colors.blue,
  },
  shareMapSubmitBg: {
    backgroundColor: '#0a7aa8',
  },
  confirmSubmitText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  resultPanel: {
    gap: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  resultTitle: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  resultNote: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  resultUrl: {
    color: Colors.blue,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    backgroundColor: Colors.background,
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  resultActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultActionText: {
    color: Colors.blue,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  resultDismiss: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultDismissText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 6,
  },
  footerText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  tokenPanel: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    backgroundColor: 'rgba(255,159,10,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.25)',
    gap: 8,
  },
  tokenPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tokenPanelTitle: {
    color: Colors.amber,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  tokenPanelDesc: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tokenText: {
    flex: 1,
    color: Colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,159,10,0.1)',
  },
  copyBtnText: {
    color: Colors.amber,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
});
