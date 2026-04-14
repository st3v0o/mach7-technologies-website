import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/colors';
import { LogEntry } from '@/contexts/RecordingContext';

export interface SessionSection {
  sessionId: string;
  mode: 'video' | 'photo' | 'mixed';
  startMs: number;
  data: LogEntry[];
}

interface Props {
  sections: SessionSection[];
  demoMode: boolean;
  onSheetChange: (open: boolean) => void;
  onDemoPress: () => void;
  onSelectEntry: (entry: LogEntry) => void;
}

export default function LogMapView({ sections, demoMode }: Props) {
  const totalFrames = sections.reduce((acc, s) => acc + s.data.length, 0);
  const hasData = totalFrames > 0 || demoMode;

  return (
    <View style={styles.container}>
      {hasData ? (
        <View style={styles.placeholder}>
          <Ionicons name="map-outline" size={48} color={Colors.blue} />
          <Text style={styles.title}>Map View</Text>
          <Text style={styles.subtitle}>
            {demoMode ? 'Demo mode' : `${totalFrames} frames across ${sections.length} session${sections.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="map-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No frames to map</Text>
          <Text style={styles.emptySubtitle}>Capture GPS-tagged frames to see them on the map.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  title: { color: Colors.text, fontFamily: 'Inter_700Bold', fontSize: 20 },
  subtitle: { color: Colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center' },
  emptyTitle: { color: Colors.textSecondary, fontFamily: 'Inter_600SemiBold', fontSize: 18 },
  emptySubtitle: { color: Colors.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center' },
});
