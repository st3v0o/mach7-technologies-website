import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Colors from '@/constants/colors';
import { LogEntry } from '@/contexts/RecordingContext';

export interface SessionSection {
  sessionId: string;
  mode: 'video' | 'photo' | 'mixed';
  startMs: number;
  data: LogEntry[];
  jobName?: string;
  sessionCount?: number;
}

interface Props {
  sections: SessionSection[];
  demoMode: boolean;
  onSheetChange: (open: boolean) => void;
  onDemoPress: () => void;
  onSelectEntry: (entry: LogEntry) => void;
}

const SESSION_COLORS = [
  '#FF9F0A',
  '#30D158',
  '#0A84FF',
  '#FF453A',
  '#5E5CE6',
  '#00C7BE',
  '#FF6B35',
];

function getSessionColor(idx: number): string {
  return SESSION_COLORS[idx % SESSION_COLORS.length];
}

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

function calcRegion(sections: SessionSection[]): Region | null {
  const all = sections
    .flatMap((s) => s.data)
    .filter((e) => e.latitude !== 0 || e.longitude !== 0);
  if (all.length === 0) return null;

  const lats = all.map((e) => e.latitude);
  const lons = all.map((e) => e.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.006),
    longitudeDelta: Math.max((maxLon - minLon) * 1.5, 0.006),
  };
}

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
}

type MapTypeOption = {
  key: 'standard' | 'satellite' | 'hybrid' | 'mutedStandard';
  label: string;
};

const MAP_TYPES: MapTypeOption[] = [
  { key: 'standard',      label: 'Standard' },
  { key: 'mutedStandard', label: 'Muted'    },
  { key: 'satellite',     label: 'Satellite' },
  { key: 'hybrid',        label: 'Hybrid'   },
];

export default function LogMapView({
  sections,
  demoMode,
  onSelectEntry,
  onDemoPress,
}: Props) {
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const [mapType, setMapType] = useState<MapTypeOption['key']>('standard');

  const region = useMemo(() => calcRegion(sections), [sections]);
  const totalFrames = sections.reduce((acc, s) => acc + s.data.length, 0);
  const hasData = totalFrames > 0 || demoMode;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Ionicons name="map-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>Map not available in browser</Text>
          <Text style={styles.emptySubtitle}>
            Open in Expo Go on your device to see GPS frames on the map.
          </Text>
        </View>
      </View>
    );
  }

  if (!hasData) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Ionicons name="map-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No frames to map</Text>
          <Text style={styles.emptySubtitle}>
            Capture GPS-tagged frames to see them plotted here.
          </Text>
          <Pressable
            onPress={onDemoPress}
            style={({ pressed }) => [styles.demoBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="flask-outline" size={16} color={Colors.amber} />
            <Text style={styles.demoBtnText}>Load demo data</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const defaultRegion: Region = region ?? {
    latitude: 38.897,
    longitude: -77.036,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const MapView = require('react-native-maps').default;
  const { Marker, Polyline } = require('react-native-maps');

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={defaultRegion}
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton
      >
        {sections.map((section, sIdx) => {
          const color = getSessionColor(sIdx);
          const valid = section.data.filter(
            (e) => e.latitude !== 0 || e.longitude !== 0
          );
          const coords = valid.map((e) => ({
            latitude: e.latitude,
            longitude: e.longitude,
          }));

          return (
            <React.Fragment key={section.sessionId}>
              {coords.length > 1 && (
                <Polyline
                  coordinates={coords}
                  strokeColor={color + 'CC'}
                  strokeWidth={2.5}
                />
              )}
              {valid.map((entry) => (
                <Marker
                  key={entry.id}
                  coordinate={{
                    latitude: entry.latitude,
                    longitude: entry.longitude,
                  }}
                  pinColor={color}
                  onPress={() => {
                    setSelected(entry);
                    onSelectEntry(entry);
                  }}
                />
              ))}
            </React.Fragment>
          );
        })}
      </MapView>

      {demoMode && (
        <View style={styles.demoBadge}>
          <Ionicons name="flask-outline" size={11} color="#000" />
          <Text style={styles.demoBadgeText}>DEMO</Text>
        </View>
      )}

      <View style={styles.statsBar}>
        <Ionicons name="location" size={12} color={Colors.gpsGreen} />
        <Text style={styles.statsText}>
          {totalFrames} frames · {sections.length} session
          {sections.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* ── Map type picker ── */}
      <View style={styles.mapTypePicker}>
        {MAP_TYPES.map((opt) => {
          const active = mapType === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setMapType(opt.key)}
              style={[styles.mapTypeBtn, active && styles.mapTypeBtnActive]}
            >
              <Text style={[styles.mapTypeBtnText, active && styles.mapTypeBtnTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selected && !demoMode && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedRow}>
            <Ionicons name="image-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.selectedFilename} numberOfLines={1}>
              {selected.filename}
            </Text>
          </View>
          <View style={styles.selectedRow}>
            <Ionicons name="location" size={13} color={Colors.gpsGreen} />
            <Text style={styles.selectedCoord}>
              {Math.abs(selected.latitude).toFixed(5)}°
              {selected.latitude >= 0 ? 'N' : 'S'}{'  '}
              {Math.abs(selected.longitude).toFixed(5)}°
              {selected.longitude >= 0 ? 'E' : 'W'}
            </Text>
          </View>
          <Text style={styles.selectedTime}>{formatTimestamp(selected.timestamp)}</Text>
          <Pressable
            onPress={() => setSelected(null)}
            style={styles.selectedClose}
            hitSlop={12}
          >
            <Ionicons name="close" size={16} color={Colors.textSecondary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
  },
  emptySubtitle: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.4)',
    backgroundColor: 'rgba(255, 184, 0, 0.08)',
  },
  demoBtnText: {
    color: Colors.amber,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  demoBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.amber,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  demoBadgeText: {
    color: '#000',
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  statsBar: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(10, 10, 12, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  selectedCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(18, 18, 22, 0.96)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 6,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedFilename: {
    color: Colors.text,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    flex: 1,
  },
  selectedCoord: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  selectedTime: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  selectedClose: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  mapTypePicker: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(10, 10, 12, 0.82)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
  },
  mapTypeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mapTypeBtnActive: {
    backgroundColor: 'rgba(255, 184, 0, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.45)',
  },
  mapTypeBtnText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  mapTypeBtnTextActive: {
    color: Colors.amber,
  },
});
