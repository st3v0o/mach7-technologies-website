/**
 * LocalDatabaseSheet
 *
 * Renders all captured frames as an interactive, scrollable database table.
 * Tapping any row opens a full-screen detail view showing the photo alongside
 * a mini-map of the session route with the selected frame highlighted.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import type { LogEntry } from '@/contexts/RecordingContext';
import { splitByTimeGap } from '@/lib/mapUtils';
import type { SessionSection } from './LogMapView';
import { SESSION_COLORS } from './LogMapView';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(ms: number) {
  return new Date(ms).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtCoord(val: number, posLabel: string, negLabel: string) {
  return `${Math.abs(val).toFixed(5)}° ${val >= 0 ? posLabel : negLabel}`;
}

function sessionColor(sections: SessionSection[], sessionId: string): string {
  const idx = sections.findIndex((s) => s.sessionId === sessionId);
  return SESSION_COLORS[(idx < 0 ? 0 : idx) % SESSION_COLORS.length];
}

// ── Mini-map (native only) ────────────────────────────────────────────────────

function MiniMap({
  entry,
  sessionEntries,
  color,
}: {
  entry: LogEntry;
  sessionEntries: LogEntry[];
  color: string;
}) {
  const mapRef = useRef<any>(null);

  // Valid entries for markers + fitToCoordinates
  const validEntries = useMemo(
    () => sessionEntries.filter((e) => e.latitude !== 0 || e.longitude !== 0),
    [sessionEntries],
  );

  // Flat coord list for fitToCoordinates
  const allCoords = useMemo(
    () =>
      validEntries.length > 0
        ? validEntries.map((e) => ({ latitude: e.latitude, longitude: e.longitude }))
        : [{ latitude: entry.latitude, longitude: entry.longitude }],
    [validEntries, entry.latitude, entry.longitude],
  );

  // Split into runs — pause/resume gaps produce separate polylines with no
  // connecting line across the location change.
  const polylineRuns = useMemo(() => splitByTimeGap(validEntries), [validEntries]);

  // Fit to all coords once map is ready
  const onMapReady = useCallback(() => {
    if (mapRef.current && allCoords.length > 1) {
      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: false,
      });
    }
  }, [allCoords]);

  if (Platform.OS === 'web') {
    return (
      <View style={miniStyles.fallback}>
        <Ionicons name="map-outline" size={32} color={Colors.textTertiary} />
        <Text style={miniStyles.fallbackText}>Map on device only</Text>
      </View>
    );
  }

  try {
    const maps = require('react-native-maps');
    const MapView = maps.default;
    const { Marker, Polyline } = maps;

    return (
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        userInterfaceStyle="dark"
        pitchEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        initialRegion={{
          latitude: entry.latitude || 37.7749,
          longitude: entry.longitude || -122.4194,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        onMapReady={onMapReady}
      >
        {/* Session route — one Polyline per continuous run (gaps = pauses) */}
        {polylineRuns.map((run, ri) =>
          run.length > 1 ? (
            <Polyline
              key={`minirun_${ri}`}
              coordinates={run.map((e) => ({
                latitude: e.latitude,
                longitude: e.longitude,
              }))}
              strokeColor={color + '99'}
              strokeWidth={3}
            />
          ) : null
        )}

        {/* All frame dots */}
        {validEntries.map((e) => {
          const isCurrent = e.id === entry.id;
          return (
            <Marker
              key={e.id}
              coordinate={{ latitude: e.latitude, longitude: e.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={isCurrent}
            >
              <View style={miniStyles.dotWrap}>
                {isCurrent ? (
                  <>
                    <View style={[miniStyles.ringCurrent, { borderColor: color }]} />
                    <View style={[miniStyles.dotCurrent, { borderColor: color }]} />
                  </>
                ) : (
                  <View style={[miniStyles.dot, { backgroundColor: color + 'cc' }]} />
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>
    );
  } catch {
    return (
      <View style={miniStyles.fallback}>
        <Ionicons name="map-outline" size={32} color={Colors.textTertiary} />
        <Text style={miniStyles.fallbackText}>Map unavailable</Text>
      </View>
    );
  }
}

const miniStyles = StyleSheet.create({
  fallback: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.surface,
  },
  fallbackText: {
    color: Colors.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 13,
  },
  dotWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)' },
  dotCurrent: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', borderWidth: 2.5 },
  ringCurrent: {
    position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 2,
  },
});

// ── Detail modal (swipeable photos) ──────────────────────────────────────────

function FrameDetailModal({
  initialEntry,
  sessionEntries,
  color,
  onClose,
}: {
  initialEntry: LogEntry;
  sessionEntries: LogEntry[];
  color: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: SW } = Dimensions.get('window');
  const flatRef = useRef<FlatList<LogEntry>>(null);

  const initialIndex = useMemo(
    () => Math.max(0, sessionEntries.findIndex((e) => e.id === initialEntry.id)),
    [sessionEntries, initialEntry.id],
  );

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentEntry = sessionEntries[currentIndex] ?? initialEntry;

  // Scroll to initial position on mount (if not the first item)
  useEffect(() => {
    if (initialIndex > 0) {
      const t = setTimeout(() => {
        flatRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScrollEnd = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
      setCurrentIndex(Math.min(Math.max(0, idx), sessionEntries.length - 1));
    },
    [SW, sessionEntries.length],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: SW, offset: SW * index, index }),
    [SW],
  );

  const goTo = useCallback((idx: number) => {
    flatRef.current?.scrollToIndex({ index: idx, animated: true });
    setCurrentIndex(idx);
  }, []);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < sessionEntries.length - 1;

  // Max pips to show in the dot row
  const MAX_PIPS = 20;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={detailStyles.root}>

        {/* ── Top: swipeable photo strip ──────────────────────────────── */}
        <View style={detailStyles.photoSection}>
          <FlatList<LogEntry>
            ref={flatRef}
            data={sessionEntries}
            horizontal
            pagingEnabled
            bounces
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            initialScrollIndex={initialIndex}
            getItemLayout={getItemLayout}
            onMomentumScrollEnd={handleScrollEnd}
            style={StyleSheet.absoluteFill}
            renderItem={({ item }) => (
              <View style={{ width: SW, flex: 1 }}>
                {Platform.OS !== 'web' && item.localPath ? (
                  <Image
                    source={{ uri: item.localPath }}
                    style={StyleSheet.absoluteFill}
                    contentFit="contain"
                    transition={80}
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, detailStyles.photoPlaceholder]}>
                    <Ionicons name="image-outline" size={52} color={Colors.textTertiary} />
                  </View>
                )}
              </View>
            )}
          />

          {/* Top bar: close · counter · prev/next */}
          <View style={[detailStyles.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [detailStyles.iconBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>

            {/* Counter pill */}
            <View style={detailStyles.counterPill}>
              <Text style={detailStyles.counterText}>
                {currentIndex + 1} / {sessionEntries.length}
              </Text>
            </View>

            {/* Prev / Next */}
            <View style={detailStyles.navRow}>
              <Pressable
                onPress={() => goTo(currentIndex - 1)}
                disabled={!hasPrev}
                hitSlop={8}
                style={({ pressed }) => [
                  detailStyles.navBtn,
                  !hasPrev && detailStyles.navBtnDisabled,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => goTo(currentIndex + 1)}
                disabled={!hasNext}
                hitSlop={8}
                style={({ pressed }) => [
                  detailStyles.navBtn,
                  !hasNext && detailStyles.navBtnDisabled,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Dot pips — position indicator */}
          {sessionEntries.length > 1 && (
            <View style={detailStyles.pipsRow}>
              {sessionEntries.slice(0, MAX_PIPS).map((_, i) => (
                <Pressable key={i} onPress={() => goTo(i)} hitSlop={6}>
                  <View
                    style={[
                      detailStyles.pip,
                      i === currentIndex && [detailStyles.pipActive, { backgroundColor: color }],
                    ]}
                  />
                </Pressable>
              ))}
              {sessionEntries.length > MAX_PIPS && (
                <Text style={detailStyles.pipMore}>+{sessionEntries.length - MAX_PIPS}</Text>
              )}
            </View>
          )}
        </View>

        {/* ── Middle: metadata strip ───────────────────────────────────── */}
        <View style={[detailStyles.metaStrip, { borderLeftColor: color }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={detailStyles.metaScroll}
          >
            <View style={detailStyles.metaCell}>
              <Text style={detailStyles.metaLabel}>DATE</Text>
              <Text style={detailStyles.metaValue}>{fmtDate(currentEntry.timestamp)}</Text>
            </View>
            <View style={detailStyles.metaDivider} />
            <View style={detailStyles.metaCell}>
              <Text style={detailStyles.metaLabel}>TIME</Text>
              <Text style={detailStyles.metaValue}>{fmtTime(currentEntry.timestamp)}</Text>
            </View>
            <View style={detailStyles.metaDivider} />
            <View style={detailStyles.metaCell}>
              <Text style={detailStyles.metaLabel}>LAT</Text>
              <Text style={[detailStyles.metaValue, detailStyles.mono]}>
                {fmtCoord(currentEntry.latitude, 'N', 'S')}
              </Text>
            </View>
            <View style={detailStyles.metaDivider} />
            <View style={detailStyles.metaCell}>
              <Text style={detailStyles.metaLabel}>LON</Text>
              <Text style={[detailStyles.metaValue, detailStyles.mono]}>
                {fmtCoord(currentEntry.longitude, 'E', 'W')}
              </Text>
            </View>
            <View style={detailStyles.metaDivider} />
            <View style={detailStyles.metaCell}>
              <Text style={detailStyles.metaLabel}>SEGMENT</Text>
              <Text style={[detailStyles.metaValue, { color }]}>
                {currentEntry.videoSegment.replace('seg_', 'SEG ').toUpperCase()}
              </Text>
            </View>
            <View style={detailStyles.metaDivider} />
            <View style={detailStyles.metaCell}>
              <Text style={detailStyles.metaLabel}>SESSION</Text>
              <Text style={detailStyles.metaValue} numberOfLines={1}>
                {currentEntry.sessionId.slice(-8).toUpperCase()}
              </Text>
            </View>
          </ScrollView>
        </View>

        {/* ── Bottom: mini-map ─────────────────────────────────────────── */}
        <View style={detailStyles.mapSection}>
          <MiniMap entry={currentEntry} sessionEntries={sessionEntries} color={color} />

          {/* Map label badge */}
          <View style={detailStyles.mapBadge}>
            <View style={[detailStyles.mapBadgeDot, { backgroundColor: color }]} />
            <Text style={detailStyles.mapBadgeText}>
              {sessionEntries.filter((e) => e.latitude !== 0 || e.longitude !== 0).length} GPS points
              &nbsp;·&nbsp;{currentEntry.sessionId.replace('session_', '').replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

      </View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  photoSection: { flex: 5, backgroundColor: '#111', overflow: 'hidden' },
  photoPlaceholder: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface,
  },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  counterPill: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  counterText: {
    color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 0.3,
  },
  navRow: { flexDirection: 'row', gap: 8 },
  navBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },

  // Dot pips
  pipsRow: {
    position: 'absolute', bottom: 10, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5,
  },
  pip: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  pipActive: { width: 16, borderRadius: 3 },
  pipMore: {
    color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_400Regular', fontSize: 10, marginLeft: 2,
  },

  metaStrip: {
    borderLeftWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  metaScroll: { paddingHorizontal: 14, paddingVertical: 10, gap: 0 },
  metaCell: { paddingHorizontal: 14, justifyContent: 'center' },
  metaLabel: {
    color: Colors.textTertiary, fontFamily: 'Inter_500Medium',
    fontSize: 8, letterSpacing: 1, marginBottom: 2,
  },
  metaValue: {
    color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 12,
  },
  mono: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  metaDivider: { width: 1, backgroundColor: Colors.separator, marginVertical: 6 },

  mapSection: { flex: 4, overflow: 'hidden', position: 'relative' },
  mapBadge: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(10,10,15,0.82)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  mapBadgeDot: { width: 8, height: 8, borderRadius: 4 },
  mapBadgeText: {
    color: Colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 11,
  },
});

// ── Table row ──────────────────────────────────────────────────────────────────

function TableRow({
  entry,
  index,
  color,
  isSelected,
  onPress,
}: {
  entry: LogEntry;
  index: number;
  color: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        tableStyles.row,
        isSelected && { backgroundColor: color + '1A' },
        pressed && { backgroundColor: Colors.card },
      ]}
    >
      {/* Index */}
      <Text style={tableStyles.cellIndex}>{index + 1}</Text>

      {/* Thumbnail */}
      <View style={tableStyles.cellThumb}>
        {Platform.OS !== 'web' && entry.localPath ? (
          <Image
            source={{ uri: entry.localPath }}
            style={tableStyles.thumb}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={[tableStyles.thumb, tableStyles.thumbPlaceholder]}>
            <Ionicons name="image-outline" size={12} color={Colors.textTertiary} />
          </View>
        )}
        {isSelected && (
          <View style={[tableStyles.thumbRing, { borderColor: color }]} />
        )}
      </View>

      {/* Timestamp */}
      <View style={tableStyles.cellTime}>
        <Text style={tableStyles.cellDateText} numberOfLines={1}>{fmtDate(entry.timestamp)}</Text>
        <Text style={tableStyles.cellTimeText} numberOfLines={1}>{fmtTime(entry.timestamp)}</Text>
      </View>

      {/* Coordinates */}
      <View style={tableStyles.cellCoord}>
        <Text style={tableStyles.coordText} numberOfLines={1}>
          {fmtCoord(entry.latitude, 'N', 'S')}
        </Text>
        <Text style={tableStyles.coordText} numberOfLines={1}>
          {fmtCoord(entry.longitude, 'E', 'W')}
        </Text>
      </View>

      {/* Segment badge */}
      <View style={[tableStyles.cellSeg]}>
        <View style={[tableStyles.segBadge, { borderColor: color + '66' }]}>
          <Text style={[tableStyles.segText, { color }]} numberOfLines={1}>
            {entry.videoSegment === 'photo'
              ? 'PHO'
              : entry.videoSegment.replace('seg_', '')}
          </Text>
        </View>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={12} color={Colors.textTertiary} style={tableStyles.chevron} />
    </Pressable>
  );
}

const tableStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator,
    gap: 6,
  },
  cellIndex: {
    width: 30, textAlign: 'right',
    color: Colors.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 11,
  },
  cellThumb: { width: 42, position: 'relative' },
  thumb: { width: 42, height: 32, borderRadius: 4, overflow: 'hidden' },
  thumbPlaceholder: { backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  thumbRing: {
    position: 'absolute', inset: -1.5, borderRadius: 5.5,
    borderWidth: 2,
  },
  cellTime: { flex: 3, minWidth: 0 },
  cellDateText: {
    color: Colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 10,
  },
  cellTimeText: {
    color: Colors.text, fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 1,
  },
  cellCoord: { flex: 3, minWidth: 0 },
  coordText: {
    color: Colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 10,
    letterSpacing: 0.2,
  },
  cellSeg: { width: 42, alignItems: 'center' },
  segBadge: {
    borderWidth: 1, borderRadius: 5, paddingHorizontal: 4, paddingVertical: 1,
  },
  segText: { fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  chevron: { marginLeft: 2 },
});

// ── Column header ──────────────────────────────────────────────────────────────

function TableHeader() {
  return (
    <View style={headerStyles.row}>
      <Text style={[headerStyles.cell, { width: 30, textAlign: 'right' }]}>#</Text>
      <View style={{ width: 42 }}>
        <Text style={headerStyles.cell}>IMG</Text>
      </View>
      <Text style={[headerStyles.cell, { flex: 3 }]}>TIMESTAMP</Text>
      <Text style={[headerStyles.cell, { flex: 3 }]}>COORDINATES</Text>
      <Text style={[headerStyles.cell, { width: 42, textAlign: 'center' }]}>SEG</Text>
      <View style={{ width: 20 }} />
    </View>
  );
}

const headerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 7, gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cell: {
    color: Colors.textTertiary, fontFamily: 'Inter_600SemiBold',
    fontSize: 9, letterSpacing: 1.1,
  },
});

// ── Session group header ───────────────────────────────────────────────────────

function SectionGroupHeader({ section, color }: { section: SessionSection; color: string }) {
  const modeLabel =
    section.mode === 'video' ? 'VIDEO' :
    section.mode === 'photo' ? 'PHOTO' : 'MIXED';

  return (
    <View style={[groupStyles.row, { borderLeftColor: color }]}>
      <View style={[groupStyles.colorDot, { backgroundColor: color }]} />
      <Text style={[groupStyles.dateText, { color }]}>
        {fmtDate(section.startMs)} · {fmtTime(section.startMs)}
      </Text>
      <View style={groupStyles.modeBadge}>
        <Text style={[groupStyles.modeText, { color }]}>{modeLabel}</Text>
      </View>
      <Text style={groupStyles.countText}>{section.data.length} frames</Text>
    </View>
  );
}

const groupStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderLeftWidth: 3,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator,
  },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  dateText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  modeBadge: {
    borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modeText: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 0.8 },
  countText: {
    color: Colors.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 10,
  },
});

// ── Flat list item model ───────────────────────────────────────────────────────

type ListItem =
  | { kind: 'header'; section: SessionSection; color: string }
  | { kind: 'row'; entry: LogEntry; globalIndex: number; sessionEntries: LogEntry[]; color: string };

// ── Main export ───────────────────────────────────────────────────────────────

export interface LocalDatabaseSheetProps {
  sections: SessionSection[];
}

export default function LocalDatabaseSheet({ sections }: LocalDatabaseSheetProps) {
  const [selectedEntry, setSelectedEntry] = useState<{
    entry: LogEntry;
    sessionEntries: LogEntry[];
    color: string;
  } | null>(null);

  // Flatten sections into a typed list of header + row items
  const items = useMemo<ListItem[]>(() => {
    const result: ListItem[] = [];
    let globalIndex = 0;
    // Iterate from newest to oldest (sections are sorted newest-first already)
    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      const color = SESSION_COLORS[si % SESSION_COLORS.length];
      result.push({ kind: 'header', section, color });
      for (const entry of section.data) {
        result.push({ kind: 'row', entry, globalIndex, sessionEntries: section.data, color });
        globalIndex++;
      }
    }
    return result;
  }, [sections]);

  const totalFrames = useMemo(
    () => sections.reduce((n, s) => n + s.data.length, 0),
    [sections]
  );

  const handleRowPress = useCallback(
    (entry: LogEntry, sessionEntries: LogEntry[], color: string) => {
      setSelectedEntry({ entry, sessionEntries, color });
    },
    [],
  );

  if (totalFrames === 0) {
    return (
      <View style={sheetStyles.empty}>
        <Ionicons name="grid-outline" size={44} color={Colors.textTertiary} />
        <Text style={sheetStyles.emptyTitle}>No local frames yet</Text>
        <Text style={sheetStyles.emptySub}>
          Start recording on the Capture tab to build your local database.
        </Text>
      </View>
    );
  }

  return (
    <View style={sheetStyles.root}>
      {/* Sticky table header */}
      <TableHeader />

      {/* Summary bar */}
      <View style={sheetStyles.summaryBar}>
        <Ionicons name="server-outline" size={11} color={Colors.textTertiary} />
        <Text style={sheetStyles.summaryText}>
          {totalFrames} frame{totalFrames !== 1 ? 's' : ''} across {sections.length} session{sections.length !== 1 ? 's' : ''}
          &nbsp;·&nbsp;local storage
        </Text>
      </View>

      {/* Table rows */}
      <FlatList<ListItem>
        data={items}
        keyExtractor={(item) =>
          item.kind === 'header' ? `hdr_${item.section.sessionId}` : item.entry.id
        }
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return <SectionGroupHeader section={item.section} color={item.color} />;
          }
          return (
            <TableRow
              entry={item.entry}
              index={item.globalIndex}
              color={item.color}
              isSelected={selectedEntry?.entry.id === item.entry.id}
              onPress={() => handleRowPress(item.entry, item.sessionEntries, item.color)}
            />
          );
        }}
        style={sheetStyles.list}
        showsVerticalScrollIndicator
        initialNumToRender={20}
        maxToRenderPerBatch={30}
        windowSize={5}
      />

      {/* Frame detail modal — swipeable photos + mini-map */}
      {selectedEntry && (
        <FrameDetailModal
          initialEntry={selectedEntry.entry}
          sessionEntries={selectedEntry.sessionEntries}
          color={selectedEntry.color}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </View>
  );
}

const sheetStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  list: { flex: 1 },
  summaryBar: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator,
  },
  summaryText: {
    color: Colors.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 10, letterSpacing: 0.3,
  },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingHorizontal: 40,
  },
  emptyTitle: {
    color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 17, textAlign: 'center',
  },
  emptySub: {
    color: Colors.textSecondary, fontFamily: 'Inter_400Regular',
    fontSize: 14, textAlign: 'center', lineHeight: 20,
  },
});
