import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/colors';
import { SessionSection } from '@/components/LogMapView';

interface Props {
  sections: SessionSection[];
}

export default function LocalDatabaseSheet({ sections }: Props) {
  const totalFrames = sections.reduce((acc, s) => acc + s.data.length, 0);

  if (totalFrames === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No data</Text>
        <Text style={styles.emptySubtitle}>Capture frames to view them here.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {sections.map((section) => (
        <View key={section.sessionId} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sessionId}>{section.sessionId.slice(-8).toUpperCase()}</Text>
            <Text style={styles.frameCount}>{section.data.length} frames</Text>
          </View>
          {section.data.map((entry, idx) => (
            <View key={entry.id} style={styles.row}>
              <Text style={styles.rowIndex}>{idx + 1}</Text>
              <View style={styles.rowMain}>
                <Text style={styles.rowFilename} numberOfLines={1}>{entry.filename}</Text>
                <Text style={styles.rowCoord}>
                  {entry.latitude.toFixed(5)}°, {entry.longitude.toFixed(5)}°
                </Text>
              </View>
              <Text style={styles.rowSeg}>{entry.videoSegment.replace('seg_', '')}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { color: Colors.textSecondary, fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  emptySubtitle: { color: Colors.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 13 },
  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sessionId: { color: Colors.textTertiary, fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.6 },
  frameCount: { color: Colors.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 11 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  rowIndex: { color: Colors.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 12, minWidth: 28 },
  rowMain: { flex: 1 },
  rowFilename: { color: Colors.text, fontFamily: 'Inter_400Regular', fontSize: 13 },
  rowCoord: { color: Colors.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  rowSeg: { color: Colors.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 11 },
});
