import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import Colors from '@/constants/colors';
import { LogEntry } from '@/contexts/RecordingContext';
import { usePortalConfig } from '@/contexts/PortalConfigContext';

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

const BASE_DIR = FileSystem.documentDirectory + 'gps-capture/';
const CSV_PATH = BASE_DIR + 'frame_log.csv';
const GPX_DIR = BASE_DIR + 'gpx/';

function isoNow() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function generateGeoJSON(entries: LogEntry[]): string {
  const features = entries
    .filter((e) => e.latitude !== 0 || e.longitude !== 0)
    .map((e) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          parseFloat(e.longitude.toFixed(7)),
          parseFloat(e.latitude.toFixed(7)),
        ],
      },
      properties: {
        filename: e.filename,
        timestamp: new Date(e.timestamp).toISOString(),
        session_id: e.sessionId,
        job_name: e.jobName ?? '',
        mode: e.videoSegment === 'photo' ? 'photo' : 'video_frame',
        local_path: e.localPath,
      },
    }));

  return JSON.stringify(
    {
      type: 'FeatureCollection',
      name: 'Geospector Export',
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
      },
      features,
    },
    null,
    2
  );
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateKML(entries: LogEntry[]): string {
  const points = entries
    .filter((e) => e.latitude !== 0 || e.longitude !== 0)
    .map(
      (e) => `    <Placemark>
      <name>${xmlEscape(e.filename)}</name>
      <description>${xmlEscape(new Date(e.timestamp).toISOString())} — ${xmlEscape(e.sessionId)}</description>
      <ExtendedData>
        <Data name="job_name"><value>${xmlEscape(e.jobName ?? '')}</value></Data>
        <Data name="session_id"><value>${xmlEscape(e.sessionId)}</value></Data>
        <Data name="timestamp"><value>${xmlEscape(new Date(e.timestamp).toISOString())}</value></Data>
      </ExtendedData>
      <Point><coordinates>${e.longitude.toFixed(7)},${e.latitude.toFixed(7)},0</coordinates></Point>
    </Placemark>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Geospector Export</name>
    <description>GPS-tagged frames — exported ${new Date().toISOString()}</description>
    <Folder>
      <name>Frames (${entries.length})</name>
${points}
    </Folder>
  </Document>
</kml>`;
}

function generateCSV(entries: LogEntry[]): string {
  const header =
    'filename,timestamp,latitude,longitude,mode,local_path,session_id,job_name\n';
  const rows = entries
    .map((e) => {
      const ts = new Date(e.timestamp).toISOString();
      const mode = e.videoSegment === 'photo' ? 'photo' : 'video_frame';
      const jobName = e.jobName ? `"${e.jobName.replace(/"/g, '""')}"` : '';
      return `${e.filename},${ts},${e.latitude.toFixed(7)},${e.longitude.toFixed(7)},${mode},${e.localPath},${e.sessionId},${jobName}`;
    })
    .join('\n');
  return header + rows;
}

async function getGpxFiles(sessionIds: string[]): Promise<{ name: string; path: string }[]> {
  const result: { name: string; path: string }[] = [];
  for (const sid of sessionIds) {
    const path = GPX_DIR + sid + '.gpx';
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      result.push({ name: `${sid}.gpx`, path });
    }
  }
  const manualInfo = await FileSystem.getInfoAsync(GPX_DIR);
  if (manualInfo.exists) {
    try {
      const all = await FileSystem.readDirectoryAsync(GPX_DIR);
      for (const f of all) {
        if (!f.endsWith('.gpx')) continue;
        const sid = f.replace('.gpx', '');
        if (!sessionIds.includes(sid)) {
          result.push({ name: f, path: GPX_DIR + f });
        }
      }
    } catch {}
  }
  return result;
}

async function writeAndShare(
  filename: string,
  content: string,
  mimeType: string,
  encoding: FileSystem.EncodingType = FileSystem.EncodingType.UTF8
) {
  const dest = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(dest, content, { encoding });
  await Sharing.shareAsync(dest, {
    mimeType,
    dialogTitle: 'Export',
    UTI: mimeType,
  });
}

async function buildZipAndShare(
  filename: string,
  populate: (zip: JSZip) => Promise<void>
) {
  const zip = new JSZip();
  await populate(zip);
  const b64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const dest = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(dest, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(dest, {
    mimeType: 'application/zip',
    dialogTitle: 'Export',
    UTI: 'public.zip-archive',
  });
}

async function addPhotosToZip(zip: JSZip, entries: LogEntry[], folder = 'photos') {
  const photos = entries.filter((e) => e.localPath);
  const f = zip.folder(folder)!;
  for (const entry of photos) {
    try {
      const info = await FileSystem.getInfoAsync(entry.localPath);
      if (!info.exists) continue;
      const b64 = await FileSystem.readAsStringAsync(entry.localPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      f.file(entry.filename, b64, { base64: true });
    } catch {}
  }
}

async function addGpxToZip(zip: JSZip, sessionIds: string[], folder = 'gpx_tracks') {
  const gpxFiles = await getGpxFiles(sessionIds);
  if (gpxFiles.length === 0) return;
  const f = zip.folder(folder)!;
  for (const { name, path } of gpxFiles) {
    try {
      const content = await FileSystem.readAsStringAsync(path);
      f.file(name, content);
    } catch {}
  }
}

export default function ExportModal({ visible, onClose, logEntries, sessionIds }: Props) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [atlasResult, setAtlasResult] = useState<{ success: boolean; message: string } | null>(null);

  const { publishSession, portalUrl, atlasSubmissions } = usePortalConfig();

  const photoCount = useMemo(
    () => logEntries.filter((e) => e.localPath).length,
    [logEntries]
  );
  const geotaggedCount = useMemo(
    () => logEntries.filter((e) => e.latitude !== 0 || e.longitude !== 0).length,
    [logEntries]
  );

  async function run(id: string, fn: () => Promise<void>) {
    setActiveId(id);
    setError(null);
    setAtlasResult(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('export.exportFailed'));
    } finally {
      setActiveId(null);
    }
  }

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
        for (const e of logEntries) {
          if (!bySession.has(e.sessionId)) bySession.set(e.sessionId, []);
          bySession.get(e.sessionId)!.push(e);
        }
        let successCount = 0;
        let alreadyCount = 0;
        const errors: string[] = [];
        for (const [sid, entries] of bySession) {
          try {
            const { alreadyPublished } = await publishSession(sid, entries, entries[0]?.jobName);
            if (alreadyPublished) alreadyCount++;
            else successCount++;
          } catch (e) {
            errors.push(e instanceof Error ? e.message : 'Unknown error');
          }
        }
        if (errors.length > 0 && successCount === 0 && alreadyCount === 0) {
          throw new Error(errors[0]!);
        }
        const parts: string[] = [];
        if (successCount > 0) parts.push(`${successCount} submitted`);
        if (alreadyCount > 0) parts.push(`${alreadyCount} already in Atlas`);
        if (errors.length > 0) parts.push(`${errors.length} failed`);
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
          await addPhotosToZip(zip, logEntries);
          await addGpxToZip(zip, sessionIds);
          zip.file('frame_log.csv', generateCSV(logEntries));
          zip.file('geospector.geojson', generateGeoJSON(logEntries));
          zip.file('geospector.kml', generateKML(logEntries));
          const sessionAtlasTokens = Object.fromEntries(
            Object.entries(atlasSubmissions).filter(([sid]) => sessionIds.includes(sid))
          );
          if (Object.keys(sessionAtlasTokens).length > 0) {
            zip.file('atlas_tokens.json', JSON.stringify({
              exported: new Date().toISOString(),
              note: 'Keep this file safe. These tokens let you remove sessions from the Geospector Atlas. They are device-only and cannot be recovered if lost.',
              sessions: sessionAtlasTokens,
            }, null, 2));
          }
          zip.file('README.txt', [
            'Geospector Export',
            `Exported: ${new Date().toISOString()}`,
            `Sessions: ${sessionIds.length}`,
            `Frames: ${logEntries.length} (${geotaggedCount} geotagged)`,
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
          ].join('\n'));
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
          zip.file('geospector.geojson', generateGeoJSON(logEntries));
          zip.file('geospector.kml', generateKML(logEntries));
          zip.file('frame_log.csv', generateCSV(logEntries));
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
          await addPhotosToZip(zip, logEntries);
          await addGpxToZip(zip, sessionIds);
          zip.file('metadata.csv', generateCSV(logEntries));
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
        const gpxFiles = await getGpxFiles(sessionIds);
        if (gpxFiles.length === 0) {
          throw new Error(t('export.noGpxFound'));
        }
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
          generateGeoJSON(logEntries),
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
          generateKML(logEntries),
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
          generateCSV(logEntries),
          'text/csv'
        );
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{t('export.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {sessionIds.length === 1
                ? t('export.summary', { frames: logEntries.length, sessions: sessionIds.length, geotagged: geotaggedCount })
                : t('export.summarySessions', { frames: logEntries.length, sessions: sessionIds.length, geotagged: geotaggedCount })}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
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
          <View style={[styles.errorBanner, atlasResult.success ? styles.successBanner : undefined]}>
            <Ionicons
              name={atlasResult.success ? 'checkmark-circle-outline' : 'warning-outline'}
              size={14}
              color={atlasResult.success ? Colors.gpsGreen : Colors.accent}
            />
            <Text style={[styles.errorText, atlasResult.success && { color: Colors.gpsGreen }]}>
              {atlasResult.message}
            </Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {options.map((opt) => {
            const isLoading = activeId === opt.id;
            const isDisabled = !!activeId;

            return (
              <Pressable
                key={opt.id}
                onPress={() => run(opt.id, opt.handler)}
                disabled={isDisabled}
                style={({ pressed }) => [
                  styles.card,
                  pressed && !isDisabled && { opacity: 0.8 },
                  isDisabled && !isLoading && { opacity: 0.4 },
                ]}
              >
                {/* Icon */}
                <View style={[styles.iconWrap, { backgroundColor: opt.iconColor + '18' }]}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={opt.iconColor} />
                  ) : (
                    <Ionicons name={opt.icon as never} size={22} color={opt.iconColor} />
                  )}
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{opt.title}</Text>
                    {opt.badge && (
                      <View style={[styles.badge, { backgroundColor: opt.badgeColor + '20', borderColor: opt.badgeColor + '50' }]}>
                        <Text style={[styles.badgeText, { color: opt.badgeColor }]}>{opt.badge}</Text>
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

                {/* Arrow */}
                {!isLoading && (
                  <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                )}
              </Pressable>
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
});
