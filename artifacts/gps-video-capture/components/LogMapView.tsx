import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtLat(lat: number): string {
  return `${Math.abs(lat).toFixed(6)}°  ${lat >= 0 ? 'N' : 'S'}`;
}

function fmtLon(lon: number): string {
  return `${Math.abs(lon).toFixed(6)}°  ${lon >= 0 ? 'E' : 'W'}`;
}

// ── Fallbacks ─────────────────────────────────────────────────────────────────

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

// ── Legend ─────────────────────────────────────────────────────────────────

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

// ── Half-screen swipeable preview sheet ──────────────────────────────────────

function SheetPage({
  entry,
  sessionColor,
  pageWidth,
  photoHeight,
  onOpenFull,
}: {
  entry: LogEntry;
  sessionColor: string;
  pageWidth: number;
  photoHeight: number;
  onOpenFull: () => void;
}) {
  const hasPhoto = Boolean(entry.localPath);

  return (
    <View style={[styles.page, { width: pageWidth }]}>
      {/* Photo */}
      <View style={[styles.photoArea, { height: photoHeight }]}>
        {hasPhoto ? (
          <Image
            source={{ uri: entry.localPath }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            transition={100}
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="image-outline" size={52} color={Colors.textTertiary} />
            <Text style={styles.photoPlaceholderText}>No image file</Text>
          </View>
        )}

        {/* Detection overlay badge */}
        {entry.detectionLabel && (
          <View style={styles.detBadge}>
            <Ionicons name="eye" size={12} color={Colors.gpsGreen} />
            <Text style={styles.detBadgeText}>
              {entry.detectionLabel.toUpperCase()}
              {entry.detectionConfidence != null
                ? `  ${(entry.detectionConfidence * 100).toFixed(0)}%`
                : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Info panel */}
      <View style={styles.pageInfo}>
        {/* Date / time row */}
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
          <View>
            <Text style={styles.infoDate}>{fmtDate(entry.timestamp)}</Text>
            <Text style={styles.infoTime}>{fmtTime(entry.timestamp)}</Text>
          </View>
        </View>

        {/* GPS rows */}
        <View style={styles.gpsBlock}>
          <View style={styles.gpsRow}>
            <Ionicons name="location" size={13} color={Colors.gpsGreen} />
            <Text style={styles.gpsVal}>{fmtLat(entry.latitude)}</Text>
          </View>
          <View style={[styles.gpsRow, { paddingLeft: 18 }]}>
            <Text style={styles.gpsVal}>{fmtLon(entry.longitude)}</Text>
          </View>
        </View>

        {/* Segment */}
        <View style={styles.infoRow}>
          <Ionicons name="film-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.infoSeg} numberOfLines={1}>{entry.filename}</Text>
        </View>

        {/* Open full button */}
        {hasPhoto && (
          <Pressable
            onPress={onOpenFull}
            style={({ pressed }) => [
              styles.openFullBtn,
              { borderColor: sessionColor },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="expand-outline" size={15} color={sessionColor} />
            <Text style={[styles.openFullText, { color: sessionColor }]}>Open Full Frame</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function MapPreviewSheet({
  initialEntry,
  sessionEntries,
  sessionColor,
  onDismiss,
  onOpenFull,
  insetBottom,
}: {
  initialEntry: LogEntry;
  sessionEntries: LogEntry[];
  sessionColor: string;
  onDismiss: () => void;
  onOpenFull: (entry: LogEntry) => void;
  insetBottom: number;
}) {
  const { width: SW, height: SH } = Dimensions.get('window');
  const SHEET_H = Math.round(SH * 0.58);
  const PHOTO_H = Math.round(SHEET_H * 0.50);

  const initialIndex = useMemo(
    () => Math.max(0, sessionEntries.findIndex((e) => e.id === initialEntry.id)),
    [sessionEntries, initialEntry.id]
  );

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatRef = useRef<FlatList<LogEntry>>(null);

  // Scroll to the tapped entry on first render
  useEffect(() => {
    if (initialIndex > 0) {
      // Use a tiny delay so FlatList has laid out
      setTimeout(() => {
        flatRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
    }
  }, [initialIndex]);

  const handleScrollEnd = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
      setCurrentIndex(Math.min(Math.max(0, idx), sessionEntries.length - 1));
    },
    [SW, sessionEntries.length]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: SW, offset: SW * index, index }),
    [SW]
  );

  const currentEntry = sessionEntries[currentIndex] ?? initialEntry;

  return (
    <View style={[styles.sheet, { height: SHEET_H, paddingBottom: insetBottom }]}>
      {/* Drag handle */}
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.sheetHeader}>
        <Pressable
          onPress={onDismiss}
          hitSlop={12}
          style={({ pressed }) => [styles.sheetClose, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-down" size={22} color={Colors.textSecondary} />
        </Pressable>

        <View style={styles.sheetTitleWrap}>
          <View style={[styles.sheetColorDot, { backgroundColor: sessionColor }]} />
          <Text style={styles.sheetCounter}>
            {currentIndex + 1} / {sessionEntries.length}
          </Text>
        </View>

        {/* Prev / Next arrows */}
        <View style={styles.sheetNav}>
          <Pressable
            disabled={currentIndex === 0}
            onPress={() => {
              const prev = currentIndex - 1;
              flatRef.current?.scrollToIndex({ index: prev, animated: true });
              setCurrentIndex(prev);
            }}
            style={({ pressed }) => [
              styles.navBtn,
              pressed && { opacity: 0.6 },
              currentIndex === 0 && { opacity: 0.2 },
            ]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={18} color={Colors.text} />
          </Pressable>
          <Pressable
            disabled={currentIndex === sessionEntries.length - 1}
            onPress={() => {
              const next = currentIndex + 1;
              flatRef.current?.scrollToIndex({ index: next, animated: true });
              setCurrentIndex(next);
            }}
            style={({ pressed }) => [
              styles.navBtn,
              pressed && { opacity: 0.6 },
              currentIndex === sessionEntries.length - 1 && { opacity: 0.2 },
            ]}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={18} color={Colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Swipeable pages */}
      <FlatList
        ref={flatRef}
        data={sessionEntries}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        initialScrollIndex={initialIndex}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item }) => (
          <SheetPage
            entry={item}
            sessionColor={sessionColor}
            pageWidth={SW}
            photoHeight={PHOTO_H}
            onOpenFull={() => onOpenFull(item)}
          />
        )}
        style={{ flex: 1 }}
      />

      {/* Coloured bottom accent line */}
      <View style={[styles.sheetAccentLine, { backgroundColor: sessionColor }]} />
    </View>
  );
}

// ── Top-level export ──────────────────────────────────────────────────────────

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
      insetBottom={insets.bottom}
      bottomOffset={insets.bottom + 90}
      demoMode={demoMode}
    />
  );
}

// ── Native map (iOS/Android only) ────────────────────────────────────────────

type ActiveState = {
  entry: LogEntry;
  color: string;
  sessionEntries: LogEntry[];
};

function NativeMapView({
  sections,
  allValidCoords,
  onSelectEntry,
  insetBottom,
  bottomOffset,
  demoMode,
}: {
  sections: SessionSection[];
  allValidCoords: { latitude: number; longitude: number }[];
  onSelectEntry: (entry: LogEntry) => void;
  insetBottom: number;
  bottomOffset: number;
  demoMode?: boolean;
}) {
  const maps = require('react-native-maps');
  const MapView = maps.default;
  const { Marker, Polyline } = maps;

  const mapRef = useRef<any>(null);
  const [active, setActive] = useState<ActiveState | null>(null);

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
        onPress={() => setActive(null)}
      >
        {sections.map((section, idx) => {
          const color = SESSION_COLORS[idx % SESSION_COLORS.length];
          const validEntries = section.data.filter(
            (e) => e.latitude !== 0 || e.longitude !== 0
          );
          const coords = validEntries.map((e) => ({
            latitude: e.latitude,
            longitude: e.longitude,
          }));

          return (
            <React.Fragment key={section.sessionId}>
              {coords.length > 1 && (
                <Polyline coordinates={coords} strokeColor={color} strokeWidth={3} />
              )}
              {showMarkers &&
                validEntries.map((entry) => {
                  const isActive = active?.entry.id === entry.id;
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
                        setActive(
                          isActive ? null : { entry, color, sessionEntries: validEntries }
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

      {/* Performance / demo banners */}
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

      {/* Legend — hidden while sheet is open */}
      {!active && <Legend sections={sections} bottomOffset={bottomOffset} />}

      {/* Half-screen preview sheet */}
      {active && (
        <MapPreviewSheet
          initialEntry={active.entry}
          sessionEntries={active.sessionEntries}
          sessionColor={active.color}
          onDismiss={() => setActive(null)}
          onOpenFull={(entry) => {
            onSelectEntry(entry);
            setActive(null);
          }}
          insetBottom={insetBottom}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Fallbacks
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

  // Markers
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
    width: 17,
    height: 17,
    borderRadius: 9,
    borderColor: '#fff',
  },

  // Legend
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

  // Banners
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

  // Half-screen sheet
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(8, 8, 14, 0.97)',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sheetClose: {
    padding: 4,
  },
  sheetTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sheetColorDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  sheetCounter: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  sheetNav: {
    flexDirection: 'row',
    gap: 2,
  },
  navBtn: {
    padding: 6,
  },
  sheetAccentLine: {
    height: 3,
    width: '100%',
  },

  // Page layout
  page: {
    flex: 1,
  },
  photoArea: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  photoPlaceholderText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  detBadge: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.gpsGreen,
  },
  detBadgeText: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  pageInfo: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoDate: {
    color: Colors.text,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 17,
  },
  infoTime: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  gpsBlock: {
    gap: 3,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  gpsVal: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  infoSeg: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    flex: 1,
  },
  openFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 'auto',
  },
  openFullText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
