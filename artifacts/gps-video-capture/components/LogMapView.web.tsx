import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

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

export default function LogMapView(_props: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Ionicons name="map-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>{t('map.notAvailable')}</Text>
        <Text style={styles.emptySubtitle}>{t('map.notAvailableDesc')}</Text>
      </View>
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
});
