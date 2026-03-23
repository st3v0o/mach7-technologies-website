import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import {
  DYNAMIC_FEET_LABELS,
  DYNAMIC_METERS_OPTIONS,
  FIXED_FPS_OPTIONS,
  MPH_PER_MPS,
  metersToFeet,
  useSettings,
} from '@/contexts/SettingsContext';

function fpsLabel(fps: number): string {
  if (fps < 1) return `1 / ${Math.round(1 / fps)}s`;
  if (fps === 1) return '1 fps';
  return `${fps} fps`;
}

function OptionPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        selected && styles.pillSelected,
        pressed && !selected && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function ModeButton({
  label,
  icon,
  description,
  selected,
  onPress,
}: {
  label: string;
  icon: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeBtn,
        selected && styles.modeBtnSelected,
        pressed && !selected && { opacity: 0.7 },
      ]}
    >
      <Ionicons
        name={icon as never}
        size={22}
        color={selected ? Colors.blue : Colors.textSecondary}
        style={{ marginBottom: 6 }}
      />
      <Text style={[styles.modeBtnLabel, selected && styles.modeBtnLabelSelected]}>{label}</Text>
      <Text style={styles.modeBtnDesc}>{description}</Text>
    </Pressable>
  );
}

function selectedFeetIndex(dynamicMeters: number): number {
  let closest = 0;
  let minDiff = Infinity;
  DYNAMIC_METERS_OPTIONS.forEach((m, i) => {
    const diff = Math.abs(m - dynamicMeters);
    if (diff < minDiff) { minDiff = diff; closest = i; }
  });
  return closest;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();

  const selectedFtIdx = selectedFeetIndex(settings.dynamicMeters);
  const selectedFtLabel = DYNAMIC_FEET_LABELS[selectedFtIdx];

  const fixedDesc =
    settings.fixedFps < 1
      ? `One frame every ${Math.round(1 / settings.fixedFps)} seconds`
      : settings.fixedFps === 1
      ? 'One frame per second'
      : `${settings.fixedFps} frames per second`;

  const dynamicDesc = `One frame every ${selectedFtLabel} traveled`;

  function exampleFps(mph: number): string {
    const mps = mph / MPH_PER_MPS;
    const fps = mps / settings.dynamicMeters;
    return `~${fps.toFixed(1)} fps`;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Frame extraction configuration</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EXTRACTION MODE</Text>

        <View style={styles.modeRow}>
          <ModeButton
            label="Fixed Rate"
            icon="time-outline"
            description="Constant interval"
            selected={settings.frameMode === 'fixed'}
            onPress={() => updateSettings({ frameMode: 'fixed' })}
          />
          <ModeButton
            label="By Distance"
            icon="speedometer-outline"
            description="Based on GPS speed"
            selected={settings.frameMode === 'dynamic'}
            onPress={() => updateSettings({ frameMode: 'dynamic' })}
          />
        </View>
      </View>

      {settings.frameMode === 'fixed' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FRAME RATE</Text>
          <View style={styles.card}>
            <View style={styles.pillRow}>
              {FIXED_FPS_OPTIONS.map((fps) => (
                <OptionPill
                  key={fps}
                  label={fpsLabel(fps)}
                  selected={settings.fixedFps === fps}
                  onPress={() => updateSettings({ fixedFps: fps })}
                />
              ))}
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Ionicons name="information-circle-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.summaryText}>{fixedDesc}</Text>
            </View>
          </View>
        </View>
      )}

      {settings.frameMode === 'dynamic' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FEET PER FRAME</Text>
          <View style={styles.card}>
            <View style={styles.pillRow}>
              {DYNAMIC_METERS_OPTIONS.map((m, i) => (
                <OptionPill
                  key={m}
                  label={DYNAMIC_FEET_LABELS[i]}
                  selected={selectedFtIdx === i}
                  onPress={() => updateSettings({ dynamicMeters: m })}
                />
              ))}
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Ionicons name="information-circle-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.summaryText}>{dynamicDesc}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="navigate-outline" size={18} color={Colors.blue} />
            <Text style={styles.infoTitle}>How Dynamic Mode Works</Text>
          </View>
          <Text style={styles.infoBody}>
            In distance mode, the app uses live GPS speed to decide when to extract a frame. A
            frame is saved every time you travel the set distance — so you get consistent spatial
            coverage regardless of how fast you're moving.
          </Text>
          <View style={styles.infoExamples}>
            <View style={styles.infoExample}>
              <Text style={styles.infoExampleSpeed}>20 mph</Text>
              <Text style={styles.infoExampleFps}>{exampleFps(20)}</Text>
            </View>
            <View style={styles.infoExampleDivider} />
            <View style={styles.infoExample}>
              <Text style={styles.infoExampleSpeed}>60 mph</Text>
              <Text style={styles.infoExampleFps}>{exampleFps(60)}</Text>
            </View>
            <View style={styles.infoExampleDivider} />
            <View style={styles.infoExample}>
              <Text style={styles.infoExampleSpeed}>0 mph</Text>
              <Text style={styles.infoExampleFps}>No frames</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 0,
  },
  header: {
    marginBottom: 28,
  },
  headerTitle: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'flex-start',
  },
  modeBtnSelected: {
    borderColor: Colors.blue,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
  },
  modeBtnLabel: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginBottom: 3,
  },
  modeBtnLabelSelected: {
    color: Colors.text,
  },
  modeBtnDesc: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillSelected: {
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    borderColor: Colors.blue,
  },
  pillText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  pillTextSelected: {
    color: Colors.blue,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 14,
  },
  summaryText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    flex: 1,
  },
  infoCard: {
    backgroundColor: 'rgba(10, 132, 255, 0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.2)',
    padding: 16,
    gap: 10,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoTitle: {
    color: Colors.blue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  infoBody: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  infoExamples: {
    flexDirection: 'row',
    marginTop: 4,
    backgroundColor: Colors.card,
    borderRadius: 10,
    overflow: 'hidden',
  },
  infoExample: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 3,
  },
  infoExampleDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  infoExampleSpeed: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  infoExampleFps: {
    color: Colors.blue,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
});
