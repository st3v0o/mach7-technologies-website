import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { LogEntry } from '@/contexts/RecordingContext';

export interface SessionSection {
  sessionId: string;
  mode: 'video' | 'photo' | 'mixed';
  startMs: number;
  data: LogEntry[];
}

export const SESSION_COLORS = [
  '#0A84FF',
  '#00FF88',
  '#FFB800',
  '#FF3B30',
  '#BF5AF2',
  '#FF9F0A',
  '#5AC8FA',
];

const MAX_MARKERS = 600;

function WebFallback() {
  return (
    <View style={styles.fallback}>
      <Ionicons name="map-outline" size={44} color={Colors.textTertiary} />
      <Text style={styles.fallbackTitle}>Map view runs on device</Text>
      <Text style={styles.fallbackSub}>
        Open the app in Expo Go on your iPhone to see the GPS track map
      </Text>
    </View>
  );
}

function NoDataFallback() {
  return (
    <View style={styles.fallback}>
      <Ionicons name="location-outline" size={44} color={Colors.textTertiary} />
      <Text style={styles.fallbackTitle}>No GPS data yet</Text>
      <Text style={styles.fallbackSub}>Record a session to see the route on the map</Text>
    </View>
  );
}

function Legend({
  sections,
  bottomOffset,
}: {
  sections: SessionSection[];
  bottomOffset: number;
}) {
  const visible = sections.slice(0, 6);
  return (
    <View style={[styles.legend, { bottom: bottomOffset }]}>
      {visible.map((section, idx) => {
        const color = SESSION_COLORS[idx % SESSION_COLORS.length];
        const d = new Date(section.startMs);
        const label =
          d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
          ' · ' +
          d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const modeIcon =
          section.mode === 'video'
            ? 'videocam-outline'
            : section.mode === 'photo'
            ? 'camera-outline'
            : 'layers-outline';
        return (
          <View key={section.sessionId} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Ionicons name={modeIcon as any} size={11} color={color} />
            <Text style={styles.legendText}>
              {label} · {section.data.length} frames
            </Text>
          </View>
        );
      })}
      {sections.length > 6 && (
        <Text style={styles.legendMore}>+{sections.length - 6} more sessions</Text>
      )}
    </View>
  );
}

interface Props {
  sections: SessionSection[];
  onSelectEntry: (entry: LogEntry) => void;
}

export default function LogMapView({ sections, onSelectEntry }: Props) {
  const insets = useSafeAreaInsets();

  const allValidCoords = useMemo(
    () =>
      sections.flatMap((s) =>
        s.data
          .filter((e) => e.latitude !== 0 || e.longitude !== 0)
          .map((e) => ({ latitude: e.latitude, longitude: e.longitude }))
      ),
    [sections]
  );

  if (Platform.OS === 'web') return <WebFallback />;
  if (allValidCoords.length === 0) return <NoDataFallback />;

  return (
    <NativeMapView
      sections={sections}
      allValidCoords={allValidCoords}
      onSelectEntry={onSelectEntry}
      bottomOffset={insets.bottom + 90}
    />
  );
}

function NativeMapView({
  sections,
  allValidCoords,
  onSelectEntry,
  bottomOffset,
}: {
  sections: SessionSection[];
  allValidCoords: { latitude: number; longitude: number }[];
  onSelectEntry: (entry: LogEntry) => void;
  bottomOffset: number;
}) {
  const maps = require('react-native-maps');
  const MapView = maps.default;
  const { Marker, Polyline } = maps;

  const mapRef = useRef<any>(null);
  const totalEntries = sections.reduce((n, s) => n + s.data.length, 0);
  const showMarkers = totalEntries <= MAX_MARKERS;

  useEffect(() => {
    if (allValidCoords.length === 0) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(allValidCoords, {
        edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
        animated: false,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [allValidCoords]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        userInterfaceStyle="dark"
        showsUserLocation
        showsCompass
        showsScale
        pitchEnabled={false}
      >
        {sections.map((section, idx) => {
          const color = SESSION_COLORS[idx % SESSION_COLORS.length];
          const coords = section.data
            .filter((e) => e.latitude !== 0 || e.longitude !== 0)
            .map((e) => ({ latitude: e.latitude, longitude: e.longitude }));

          return (
            <React.Fragment key={section.sessionId}>
              {coords.length > 1 && (
                <Polyline
                  coordinates={coords}
                  strokeColor={color}
                  strokeWidth={3}
                />
              )}
              {showMarkers &&
                section.data
                  .filter((e) => e.latitude !== 0 || e.longitude !== 0)
                  .map((entry) => (
                    <Marker
                      key={entry.id}
                      coordinate={{
                        latitude: entry.latitude,
                        longitude: entry.longitude,
                      }}
                      tracksViewChanges={false}
                      anchor={{ x: 0.5, y: 0.5 }}
                      onPress={() => onSelectEntry(entry)}
                    >
                      <View style={[styles.dot, { backgroundColor: color }]} />
                    </Marker>
                  ))}
            </React.Fragment>
          );
        })}
      </MapView>

      {!showMarkers && (
        <View style={styles.perfBanner}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.amber} />
          <Text style={styles.perfBannerText}>
            Frame dots hidden — too many to render ({totalEntries}). Zoom in to explore.
          </Text>
        </View>
      )}

      <Legend sections={sections} bottomOffset={bottomOffset} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  fallbackTitle: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    textAlign: 'center',
  },
  fallbackSub: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.6)',
  },
  legend: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: 'rgba(10,10,15,0.82)',
    borderRadius: 14,
    padding: 12,
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: Colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    flex: 1,
  },
  legendMore: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  perfBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(10,10,15,0.82)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.25)',
  },
  perfBannerText: {
    color: Colors.amber,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    flex: 1,
  },
});
