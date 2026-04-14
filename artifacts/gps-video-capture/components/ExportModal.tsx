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

import Colors from '@/constants/colors';
import { LogEntry } from '@/contexts/RecordingContext';

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

function generateKML(entries: LogEntry[]): string {
  const points = entries
    .filter((e) => e.latitude !== 0 || e.longitude !== 0)
    .map(
      (e) => `    <Placemark>
      <name>${e.filename}</name>
      <description>${new Date(e.timestamp).toISOString()} — ${e.sessionId}</description>
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
    'filename,timestamp,latitude,longitude,mode,local_path,session_id\n';
  const rows = entries
    .map((e) => {
      const ts = new Date(e.timestamp).toISOString();
      const mode = e.videoSegment === 'photo' ? 'photo' : 'video_frame';
      return `${e.filename},${ts},${e.latitude.toFixed(7)},${e.longitude.toFixed(7)},${mode},${e.localPath},${e.sessionId}`;
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setActiveId(null);
    }
  }

  const options: ExportOption[] = [
    {
      id: 'full_archive',
      icon: 'archive-outline',
      iconColor: Colors.gpsGreen,
      title: 'Full Archive',
      badge: 'Recommended',
      badgeColor: Colors.gpsGreen,
      description:
        'Everything in one ZIP — all frames, GPS tracks, GeoJSON layer, and CSV database.',
      tags: ['Photos', 'GPX', 'GeoJSON', 'CSV', 'KML', 'ZIP'],
      handler: async () => {
        await buildZipAndShare(`geospector_export_${isoNow()}.zip`, async (zip) => {
          await addPhotosToZip(zip, logEntries);
          await addGpxToZip(zip, sessionIds);
          zip.file('frame_log.csv', generateCSV(logEntries));
          zip.file('geospector.geojson', generateGeoJSON(logEntries));
          zip.file('geospector.kml', generateKML(logEntries));
          zip.file('README.txt', [
            'Geospector Export',
            `Exported: ${new Date().toISOString()}`,
            `Sessions: ${sessionIds.length}`,
            `Frames: ${logEntries.length} (${geotaggedCount} geotagged)`,
            '',
            'Contents:',
            '  photos/        — all captured frames as JPEG',
            '  gpx_tracks/    — per-session GPX route files',
            '  frame_log.csv  — full frame database with coordinates',
            '  geospector.geojson — GIS point layer (QGIS, ArcGIS, Mapbox)',
            '  geospector.kml — Google Earth / Google Maps',
          ].join('\n'));
        });
      },
    },
    {
      id: 'gis_package',
      icon: 'globe-outline',
      iconColor: Colors.blue,
      title: 'GIS Package',
      description:
        'Spatial data ready for QGIS, ArcGIS, Mapbox, or Google Earth. No photos — just the data layer.',
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
      title: 'Inspection Package',
      description:
        'Photos with CSV metadata sidecar and GPS tracks — designed for site surveys, walk-arounds, and field inspections.',
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
      title: 'GPS Tracks',
      description:
        'All session GPX route files bundled together. Import into navigation apps or GIS tools.',
      tags: ['GPX', 'ZIP'],
      handler: async () => {
        const gpxFiles = await getGpxFiles(sessionIds);
        if (gpxFiles.length === 0) {
          throw new Error('No GPX track files found. Record routes in Manual mode using the Start GPX button.');
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
      title: 'GeoJSON',
      description:
        'Single FeatureCollection with every GPS-tagged frame as a point feature. Works in any modern GIS tool.',
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
      title: 'KML (Google Earth)',
      description:
        'Keyhole Markup Language — open directly in Google Earth, Google Maps, or any KML-compatible viewer.',
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
      title: 'CSV Spreadsheet',
      description:
        'Full frame log with timestamps, coordinates, session IDs, and file paths. Import into Excel, Sheets, or a database.',
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
            <Text style={styles.headerTitle}>Export</Text>
            <Text style={styles.headerSubtitle}>
              {logEntries.length} frames · {sessionIds.length} session{sessionIds.length !== 1 ? 's' : ''} · {geotaggedCount} geotagged
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

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {options.map((opt, i) => {
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
