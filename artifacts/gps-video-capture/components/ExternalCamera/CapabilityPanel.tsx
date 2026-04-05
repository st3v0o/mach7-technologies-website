import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/colors';
import type { CameraCapabilities } from '@/lib/camera/types';

interface CapabilityRow {
  key: keyof CameraCapabilities;
  label: string;
}

const ROWS: CapabilityRow[] = [
  { key: 'supportsPreview',            label: 'Live Preview' },
  { key: 'supportsStartStopRecording', label: 'Recording' },
  { key: 'supportsPhotoCapture',       label: 'Photo Capture' },
  { key: 'supportsMediaImport',        label: 'Media Import' },
  { key: 'supportsCameraGPS',          label: 'Camera GPS' },
  { key: 'supportsExposureControl',    label: 'Exposure Control' },
  { key: 'supportsResolutionSelection',label: 'Resolution Selection' },
  { key: 'supportsFrameRateSelection', label: 'Frame Rate Selection' },
  { key: 'supportsWirelessConnection', label: 'Wireless' },
  { key: 'supportsWiredConnection',    label: 'Wired (USB)' },
];

interface Props {
  capabilities: CameraCapabilities | null;
}

export function CapabilityPanel({ capabilities }: Props) {
  return (
    <View>
      <Text style={styles.sectionLabel}>CAPABILITIES</Text>
      <View style={styles.grid}>
        {ROWS.map(row => {
          const supported = capabilities?.[row.key] ?? false;
          return (
            <View key={row.key} style={styles.item}>
              <Ionicons
                name={supported ? 'checkmark-circle' : 'close-circle-outline'}
                size={15}
                color={supported ? Colors.gpsGreen : Colors.textTertiary}
              />
              <Text style={[styles.itemLabel, !supported && styles.itemLabelOff]}>
                {row.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  item: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
  },
  itemLabel: {
    color: Colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  itemLabelOff: {
    color: Colors.textTertiary,
  },
});
