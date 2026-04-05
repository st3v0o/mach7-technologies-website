import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/colors';
import type {
  CameraConnectionState,
  GPSPoint,
  GPSProviderType,
  RecordingState,
} from '@/lib/camera/types';

interface Props {
  connectionState: CameraConnectionState;
  recordingState: RecordingState;
  gpsMode: GPSProviderType;
  lastGPSPoint: GPSPoint | null;
  providerName: string;
}

const GPS_SOURCE_LABEL: Record<string, string> = {
  phone: 'iPhone',
  camera: 'Camera',
  hybrid_fallback: 'Fallback',
};

export function ExternalCameraStatusBar({
  connectionState,
  recordingState,
  gpsMode,
  lastGPSPoint,
  providerName,
}: Props) {
  const connColor =
    connectionState === 'connected'
      ? Colors.gpsGreen
      : connectionState === 'error'
      ? Colors.accent
      : Colors.textTertiary;

  const recColor =
    recordingState === 'recording'
      ? Colors.accent
      : recordingState === 'paused'
      ? Colors.amber
      : recordingState === 'error'
      ? '#ff4444'
      : Colors.textTertiary;

  const gpsColor = lastGPSPoint ? Colors.gpsGreen : Colors.textTertiary;
  const gpsLabel = lastGPSPoint
    ? `${lastGPSPoint.latitude.toFixed(5)}, ${lastGPSPoint.longitude.toFixed(5)}`
    : 'No fix';

  const sourceLabel = lastGPSPoint ? (GPS_SOURCE_LABEL[lastGPSPoint.source] ?? lastGPSPoint.source) : '—';

  return (
    <View style={styles.container}>
      <StatusCell
        icon="cable-car-outline" // replaced below via label
        label="CAMERA"
        value={providerName}
        valueColor={connColor}
      />
      <View style={styles.divider} />
      <StatusCell
        label="CONN"
        value={connectionState.toUpperCase()}
        valueColor={connColor}
      />
      <View style={styles.divider} />
      <StatusCell
        label="REC"
        value={recordingState === 'idle' ? 'IDLE' : recordingState.toUpperCase()}
        valueColor={recColor}
      />
      <View style={styles.divider} />
      <StatusCell
        label="GPS"
        value={gpsLabel}
        valueColor={gpsColor}
        subValue={sourceLabel}
      />
    </View>
  );
}

interface CellProps {
  label: string;
  value: string;
  valueColor?: string;
  subValue?: string;
  icon?: string;
}

function StatusCell({ label, value, valueColor = Colors.text, subValue }: CellProps) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={[styles.cellValue, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
      {subValue && <Text style={styles.cellSub}>{subValue}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cellLabel: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 8,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  cellValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  cellSub: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 8,
    marginTop: 1,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
