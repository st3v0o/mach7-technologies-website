import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

function NoDataFallback({ onDemoPress }: { onDemoPress?: () => void }) {
  return (
    <View style={styles.fallback}>
      <Ionicons name="location-outline" size={44} color={Colors.textTertiary} />
      <Text style={styles.fallbackTitle}>No GPS data yet</Text>
      <Text style={styles.fallbackSub}>Record a session to see the route on the map</Text>
      {onDemoPress && (
        <Pressable
          onPress={onDemoPress}
          style={({ pressed }) => [styles.demoBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="play-circle-outline" size={15} color={Colors.amber} />
          <Text style={styles.demoBtnText}>Preview demo data</Text>
        </Pressable>
      )}
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
  demoMode?: boolean;
  onDemoPress?: () => void;
}

export default function LogMapView({ sections, onSelectEntry, demoMode, onDemoPress }: Props) {
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
  if (allValidCoords.length === 0) return <NoDataFallback onDemoPress={onDemoPress} />;

  return (
    <NativeMapView
      sections={sections}
      allValidCoords={allValidCoords}
      onSelectEntry={onSelectEntry}
      bottomOffset={insets.bottom + 90}
      demoMode={demoMode}
    />
  );
}

function fmtTimestamp(ms: number): string {
  const d = new Date(ms);
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    '  ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
}

function fmtCoord(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(6)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(6)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}  ${lonStr}`;
}

function MapPreviewCard({
  entry,
  sessionColor,
  onDismiss,
  onOpen,
  bottomOffset,
}: {
  entry: LogEntry;
  sessionColor: string;
  onDismiss: () => void;
  onOpen: () => void;
  bottomOffset: number;
}) {
  const hasPhoto = Boolean(entry.localPath);
  const isDemo = !hasPhoto;

  return (
    <View style={[styles.previewCard, { bottom: bottomOffset + 8 }]}>
      {/* Colored left accent bar */}
      <View style={[styles.previewAccent, { backgroundColor: sessionColor }]} />

      {/* Thumbnail */}
      <View style={styles.previewThumb}>
        {hasPhoto ? (
          <Image
            source={{ uri: entry.localPath }}
            style={styles.previewThumbImage}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={styles.previewThumbPlaceholder}>
            <Ionicons name="image-outline" size={22} color={Colors.textTertiary} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.previewInfo}>
        <Text style={styles.previewTime}>{fmtTimestamp(entry.timestamp)}</Text>
        <View style={styles.previewGpsRow}>
          <Ionicons name="location" size={11} color={Colors.gpsGreen} />
          <Text style={styles.previewGps}>{fmtCoord(entry.latitude, entry.longitude)}</Text>
        </View>
        {entry.detectionLabel && (
          <View style={styles.previewDetRow}>
            <Ionicons name="eye" size={11} color={Colors.gpsGreen} />
            <Text style={styles.previewDet}>
              {entry.detectionLabel.toUpperCase()}
              {entry.detectionConfidence != null
                ? `  ${(entry.detectionConfidence * 100).toFixed(0)}%`
                : ''}
            </Text>
          </View>
        )}
        <Text style={styles.previewSeg} numberOfLines={1}>
          {entry.filename}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.previewActions}>
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [styles.previewActionBtn, pressed && { opacity: 0.6 }]}
          hitSlop={10}
        >
          <Ionicons name="close" size={18} color={Colors.textSecondary} />
        </Pressable>
        {!isDemo && (
          <Pressable
            onPress={onOpen}
            style={({ pressed }) => [
              styles.previewOpenBtn,
              { borderColor: sessionColor },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.previewOpenText, { color: sessionColor }]}>View</Text>
            <Ionicons name="expand-outline" size={13} color={sessionColor} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function NativeMapView({
  sections,
  allValidCoords,
  onSelectEntry,
  bottomOffset,
  demoMode,
}: {
  sections: SessionSection[];
  allValidCoords: { latitude: number; longitude: number }[];
  onSelectEntry: (entry: LogEntry) => void;
  bottomOffset: number;
  demoMode?: boolean;
}) {
  const maps = require('react-native-maps');
  const MapView = maps.default;
  const { Marker, Polyline } = maps;

  const mapRef = useRef<any>(null);
  const [activeEntry, setActiveEntry] = useState<{ entry: LogEntry; color: string } | null>(null);

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
        onPress={() => setActiveEntry(null)}
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
                  .map((entry) => {
                    const isActive = activeEntry?.entry.id === entry.id;
                    return (
                      <Marker
                        key={entry.id}
                        coordinate={{
                          latitude: entry.latitude,
                          longitude: entry.longitude,
                        }}
                        tracksViewChanges={isActive}
                        anchor={{ x: 0.5, y: 0.5 }}
                        onPress={(e: any) => {
                          e.stopPropagation();
                          setActiveEntry(
                            isActive ? null : { entry, color }
                          );
                        }}
                      >
                        <View style={styles.markerWrap}>
                          {isActive && (
                            <View style={[styles.markerRing, { borderColor: color }]} />
                          )}
                          <View
                            style={[
                              styles.dot,
                              { backgroundColor: color },
                              isActive && styles.dotActive,
                            ]}
                          />
                        </View>
                      </Marker>
                    );
                  })}
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

      {demoMode && (
        <View style={styles.demoBanner}>
          <Ionicons name="flask-outline" size={13} color="#000" />
          <Text style={styles.demoBannerText}>DEMO — simulated San Francisco routes</Text>
        </View>
      )}

      {activeEntry && (
        <MapPreviewCard
          entry={activeEntry.entry}
          sessionColor={activeEntry.color}
          onDismiss={() => setActiveEntry(null)}
          onOpen={() => {
            onSelectEntry(activeEntry.entry);
            setActiveEntry(null);
          }}
          bottomOffset={bottomOffset}
        />
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
  markerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  markerRing: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    opacity: 0.55,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  dotActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderColor: '#fff',
  },
  previewCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(12,12,18,0.96)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    minHeight: 92,
  },
  previewAccent: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  previewThumb: {
    width: 72,
    margin: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  previewThumbImage: {
    flex: 1,
    borderRadius: 8,
  },
  previewThumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 4,
    gap: 4,
    justifyContent: 'center',
  },
  previewTime: {
    color: Colors.text,
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
  },
  previewGpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewGps: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    flex: 1,
  },
  previewDetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewDet: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  previewSeg: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 10.5,
  },
  previewActions: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingRight: 10,
    paddingLeft: 6,
    gap: 8,
  },
  previewActionBtn: {
    padding: 4,
  },
  previewOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  previewOpenText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
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
  demoBanner: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.amber,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  demoBannerText: {
    color: '#000',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.4)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,184,0,0.08)',
  },
  demoBtnText: {
    color: Colors.amber,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
});
