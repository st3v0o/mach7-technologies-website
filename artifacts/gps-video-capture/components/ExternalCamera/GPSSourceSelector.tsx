import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '@/constants/colors';
import type { CameraCapabilities, GPSProviderType } from '@/lib/camera/types';

interface GPSOption {
  mode: GPSProviderType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  requiresCameraGPS: boolean;
}

const GPS_OPTIONS: GPSOption[] = [
  {
    mode: 'ios_core_location',
    label: 'iPhone GPS',
    description: 'Always available',
    icon: 'phone-portrait-outline',
    requiresCameraGPS: false,
  },
  {
    mode: 'external_camera',
    label: 'Camera GPS',
    description: 'From connected camera',
    icon: 'camera-outline',
    requiresCameraGPS: true,
  },
  {
    mode: 'hybrid',
    label: 'Hybrid',
    description: 'Camera GPS · iPhone fallback',
    icon: 'git-merge-outline',
    requiresCameraGPS: true,
  },
];

interface Props {
  selected: GPSProviderType;
  capabilities: CameraCapabilities | null;
  onSelect: (mode: GPSProviderType) => void;
}

export function GPSSourceSelector({ selected, capabilities, onSelect }: Props) {
  return (
    <View>
      <Text style={styles.sectionLabel}>GPS SOURCE</Text>
      <View style={styles.row}>
        {GPS_OPTIONS.map(opt => {
          const unavailable = opt.requiresCameraGPS && !capabilities?.supportsCameraGPS;
          const isSelected = selected === opt.mode;
          return (
            <TouchableOpacity
              key={opt.mode}
              style={[
                styles.card,
                isSelected && styles.cardSelected,
                unavailable && styles.cardDisabled,
              ]}
              onPress={() => !unavailable && onSelect(opt.mode)}
              activeOpacity={unavailable ? 1 : 0.75}
            >
              <Ionicons
                name={opt.icon}
                size={20}
                color={isSelected ? Colors.accent : unavailable ? Colors.textTertiary : Colors.text}
              />
              <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected, unavailable && styles.cardLabelDisabled]}>
                {opt.label}
              </Text>
              <Text style={styles.cardDesc}>
                {unavailable ? 'Camera GPS unsupported' : opt.description}
              </Text>
            </TouchableOpacity>
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
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 4,
  },
  cardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentDim,
  },
  cardDisabled: {
    opacity: 0.35,
  },
  cardLabel: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textAlign: 'center',
  },
  cardLabelSelected: {
    color: Colors.accent,
  },
  cardLabelDisabled: {
    color: Colors.textTertiary,
  },
  cardDesc: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    textAlign: 'center',
  },
});
