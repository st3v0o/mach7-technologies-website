import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '@/constants/colors';
import type { CameraProvider } from '@/lib/camera/CameraProvider';

const PROVIDER_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  builtin: 'phone-portrait-outline',
  insta360: 'camera-outline',
  gopro: 'videocam-outline',
  generic_uvc: 'usb-outline' as any,
  mock: 'bug-outline',
};

interface Props {
  providers: CameraProvider[];
  selected: CameraProvider | null;
  onSelect: (p: CameraProvider) => void;
}

export function CameraSourceSelector({ providers, selected, onSelect }: Props) {
  return (
    <View>
      <Text style={styles.sectionLabel}>CAMERA SOURCE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {providers.map(p => {
          const available = p.isAvailableOnCurrentDevice();
          const isSelected = selected?.id === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
                !available && styles.chipDisabled,
              ]}
              onPress={() => available && onSelect(p)}
              activeOpacity={available ? 0.75 : 1}
            >
              <Ionicons
                name={PROVIDER_ICON[p.providerType] ?? 'camera-outline'}
                size={16}
                color={isSelected ? Colors.background : available ? Colors.text : Colors.textTertiary}
              />
              <Text
                style={[
                  styles.chipLabel,
                  isSelected && styles.chipLabelSelected,
                  !available && styles.chipLabelDisabled,
                ]}
              >
                {p.displayName}
              </Text>
              {!available && (
                <Text style={styles.unavailableBadge}>SDK needed</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  scroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipLabel: {
    color: Colors.text,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  chipLabelSelected: {
    color: Colors.background,
  },
  chipLabelDisabled: {
    color: Colors.textTertiary,
  },
  unavailableBadge: {
    color: Colors.amber,
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    marginLeft: 2,
  },
});
