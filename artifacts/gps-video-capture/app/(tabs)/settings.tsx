import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import {
  DYNAMIC_FEET_MAX,
  DYNAMIC_FEET_MIN,
  FIXED_FPS_OPTIONS,
  MPH_PER_MPS,
  MountType,
  feetToMeters,
  metersToFeet,
  useSettings,
} from '@/contexts/SettingsContext';
import { useStorageConfig } from '@/contexts/StorageConfigContext';
import StorageWizard from '@/components/StorageWizard';
import SuccessToast from '@/components/SuccessToast';

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

const PROVIDER_ICONS: Record<string, string> = {
  none: 'phone-portrait-outline',
  supabase: 'server-outline',
  webhook: 'link-outline',
};

const PROVIDER_COLORS: Record<string, string> = {
  none: Colors.textSecondary,
  supabase: Colors.gpsGreen,
  webhook: Colors.blue,
};

const MOUNT_OPTIONS: { value: MountType; label: string; icon: string }[] = [
  { value: 'vehicle', label: 'Vehicle', icon: 'car-outline' },
  { value: 'drone', label: 'Drone', icon: 'airplane-outline' },
  { value: 'handheld', label: 'Handheld', icon: 'hand-left-outline' },
  { value: 'bike', label: 'Bike', icon: 'bicycle-outline' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  const { providerType, providerLabel, isCloudConfigured, lastTestResult, testConnection, reloadConfig, clearConfig, isEnvPreconfigured } = useStorageConfig();
  const [wizardVisible, setWizardVisible] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [jobNameDraft, setJobNameDraft] = useState(settings.jobName);

  const currentFeet = Math.round(metersToFeet(settings.dynamicMeters));

  const fixedDesc =
    settings.fixedFps < 1
      ? `One frame every ${Math.round(1 / settings.fixedFps)} seconds`
      : settings.fixedFps === 1
      ? 'One frame per second'
      : `${settings.fixedFps} frames per second`;

  const dynamicDesc = `One frame every ${currentFeet} ft traveled`;

  function exampleFps(mph: number): string {
    const mps = mph / MPH_PER_MPS;
    const fps = mps / settings.dynamicMeters;
    return `~${fps.toFixed(1)} fps`;
  }

  const providerColor = PROVIDER_COLORS[providerType] ?? Colors.textSecondary;
  const providerIcon = PROVIDER_ICONS[providerType] ?? 'cloud-outline';

  const successToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successToastTimer.current) clearTimeout(successToastTimer.current);
    };
  }, []);

  const handleTestNow = async () => {
    setIsTesting(true);
    try {
      const result = await testConnection();
      if (result.success) {
        if (successToastTimer.current) clearTimeout(successToastTimer.current);
        setShowSuccessToast(true);
        successToastTimer.current = setTimeout(() => setShowSuccessToast(false), 2500);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const formatTestTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  type StorageStatusVariant = 'unconfigured' | 'untested' | 'verified' | 'failed';
  const storageVariant: StorageStatusVariant =
    providerType === 'none' ? 'unconfigured'
    : !lastTestResult ? 'untested'
    : lastTestResult.success ? 'verified'
    : 'failed';

  const STATUS_DOT_COLOR: Record<StorageStatusVariant, string> = {
    unconfigured: Colors.textTertiary,
    untested: Colors.amber,
    verified: Colors.gpsGreen,
    failed: Colors.accent,
  };

  const STATUS_LABEL: Record<StorageStatusVariant, string> = {
    unconfigured: 'Not configured',
    untested: 'Configured — not tested yet',
    verified: `Verified \u2713 ${lastTestResult ? formatTestTime(lastTestResult.testedAt) : ''}`,
    failed: 'Last test failed',
  };

  const STATUS_LABEL_COLOR: Record<StorageStatusVariant, string> = {
    unconfigured: Colors.textTertiary,
    untested: Colors.amber,
    verified: Colors.gpsGreen,
    failed: Colors.accent,
  };

  return (
    <View style={{ flex: 1 }}>
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

        {/* ── Job / Project ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACTIVE JOB</Text>
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Job Name</Text>
            <TextInput
              style={styles.settingsInput}
              value={jobNameDraft}
              onChangeText={setJobNameDraft}
              onEndEditing={() => updateSettings({ jobName: jobNameDraft.trim() })}
              onSubmitEditing={() => updateSettings({ jobName: jobNameDraft.trim() })}
              placeholder="e.g. Highway – Surface Condition Survey"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="words"
              returnKeyType="done"
            />
            <Text style={styles.inputHint}>
              Sessions captured while this name is active are grouped under the same project. Visible in the camera HUD.
            </Text>

            <View style={styles.divider} />

            <Text style={[styles.inputLabel, { marginTop: 4 }]}>Mount Type</Text>
            <View style={styles.mountRow}>
              {MOUNT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => updateSettings({ mountType: opt.value })}
                  style={({ pressed }) => [
                    styles.mountPill,
                    settings.mountType === opt.value && styles.mountPillSelected,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons
                    name={opt.icon as never}
                    size={14}
                    color={settings.mountType === opt.value ? '#000' : Colors.textSecondary}
                  />
                  <Text style={[
                    styles.mountPillText,
                    settings.mountType === opt.value && styles.mountPillTextSelected,
                  ]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CAPTURE MODE</Text>
          <View style={styles.modeRow}>
            <ModeButton
              label="Video"
              icon="videocam-outline"
              description="Record + extract frames"
              selected={settings.captureMode === 'video'}
              onPress={() => updateSettings({ captureMode: 'video' })}
            />
            <ModeButton
              label="Auto Photo"
              icon="camera-outline"
              description="Photos at set interval"
              selected={settings.captureMode === 'photo'}
              onPress={() => updateSettings({ captureMode: 'photo' })}
            />
            <ModeButton
              label="Manual"
              icon="aperture-outline"
              description="Tap to shoot"
              selected={settings.captureMode === 'manual'}
              onPress={() => updateSettings({ captureMode: 'manual' })}
            />
          </View>
        </View>

        {settings.captureMode !== 'manual' && (
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
        )}

        {settings.captureMode !== 'manual' && settings.frameMode === 'fixed' && (
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

        {settings.captureMode !== 'manual' && settings.frameMode === 'dynamic' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FEET PER FRAME</Text>
            <View style={styles.card}>
              <View style={styles.sliderValueRow}>
                <Text style={styles.sliderValue}>{currentFeet}</Text>
                <Text style={styles.sliderUnit}>ft</Text>
              </View>
              <View style={styles.sliderWrapper}>
                <Slider
                  style={styles.slider}
                  minimumValue={DYNAMIC_FEET_MIN}
                  maximumValue={DYNAMIC_FEET_MAX}
                  step={1}
                  value={currentFeet}
                  onValueChange={(ft) => updateSettings({ dynamicMeters: feetToMeters(ft) })}
                  minimumTrackTintColor={Colors.blue}
                  maximumTrackTintColor={Colors.border}
                  thumbTintColor={Colors.blue}
                />
              </View>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderMin}>{DYNAMIC_FEET_MIN} ft</Text>
                <Text style={styles.sliderMax}>{DYNAMIC_FEET_MAX} ft</Text>
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
          <Text style={styles.sectionTitle}>CAMERA</Text>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.75 }]}
              onPress={() => updateSettings({ lockFocusAtInfinity: !settings.lockFocusAtInfinity })}
            >
              <View style={styles.toggleLeft}>
                <Ionicons
                  name="infinite-outline"
                  size={20}
                  color={settings.lockFocusAtInfinity ? Colors.blue : Colors.textSecondary}
                />
                <View style={styles.toggleText}>
                  <Text style={[styles.toggleLabel, settings.lockFocusAtInfinity && { color: Colors.blue }]}>
                    Lock Focus at Infinity
                  </Text>
                  <Text style={styles.toggleDesc}>
                    Prevents autofocus from locking onto the dashboard or other nearby objects
                  </Text>
                </View>
              </View>
              <View style={[styles.toggleSwitch, settings.lockFocusAtInfinity && styles.toggleSwitchOn]}>
                <View style={[styles.toggleThumb, settings.lockFocusAtInfinity && styles.toggleThumbOn]} />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOCAL SAVE</Text>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.75 }]}
              onPress={() => updateSettings({ savePhotosToLibrary: !settings.savePhotosToLibrary })}
            >
              <View style={styles.toggleLeft}>
                <Ionicons
                  name="images-outline"
                  size={20}
                  color={settings.savePhotosToLibrary ? Colors.blue : Colors.textSecondary}
                />
                <View style={styles.toggleText}>
                  <Text style={[styles.toggleLabel, settings.savePhotosToLibrary && { color: Colors.blue }]}>
                    Save Photos to Camera Roll
                  </Text>
                  <Text style={styles.toggleDesc}>
                    Each captured photo is also saved to your iPhone Camera Roll
                  </Text>
                </View>
              </View>
              <View style={[styles.toggleSwitch, settings.savePhotosToLibrary && styles.toggleSwitchOn]}>
                <View style={[styles.toggleThumb, settings.savePhotosToLibrary && styles.toggleThumbOn]} />
              </View>
            </Pressable>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Ionicons name="folder-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.summaryText}>
                GPX tracks and frame data are also accessible via the Files app under Geospector
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 0 }]}>CLOUD STORAGE</Text>
            {isEnvPreconfigured && (
              <View style={styles.managedBadge}>
                <Text style={styles.managedBadgeText}>MANAGED</Text>
              </View>
            )}
          </View>
          <View style={styles.card}>
            {/* Provider row */}
            <View style={styles.storageStatusRow}>
              <View style={[styles.storageIconWrap, { backgroundColor: `${providerColor}18` }]}>
                <Ionicons name={providerIcon as never} size={20} color={providerColor} />
              </View>
              <View style={styles.storageText}>
                <Text style={[styles.storageProviderName, { color: providerColor }]}>
                  {providerLabel}
                </Text>
                <Text style={styles.storageProviderDesc}>
                  {providerType === 'none'
                    ? 'Frames saved on device — CSV log as database'
                    : 'Frames uploaded after each session'}
                </Text>
              </View>
            </View>

            {/* Connection status badge */}
            <View style={styles.connectionStatusRow}>
              {isTesting ? (
                <ActivityIndicator size="small" color={Colors.blue} />
              ) : (
                <View style={[styles.statusDot, { backgroundColor: STATUS_DOT_COLOR[storageVariant] }]} />
              )}
              <Text style={[styles.connectionStatusText, { color: STATUS_LABEL_COLOR[storageVariant] }]}>
                {isTesting ? 'Testing connection…' : STATUS_LABEL[storageVariant]}
              </Text>
            </View>

            {/* Failed error snippet */}
            {storageVariant === 'failed' && lastTestResult?.error && (
              <View style={styles.errorSnippetBox}>
                <Text style={styles.errorSnippetText} numberOfLines={2}>
                  {lastTestResult.error}
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Actions */}
            <View style={styles.storageActions}>
              <Pressable
                style={({ pressed }) => [styles.storageBtn, pressed && { opacity: 0.75 }]}
                onPress={() => setWizardVisible(true)}
              >
                <Ionicons name="settings-outline" size={14} color={Colors.blue} />
                <Text style={[styles.storageBtnText, { color: Colors.blue }]}>
                  {isCloudConfigured ? 'Reconfigure' : 'Set Up Cloud Storage'}
                </Text>
              </Pressable>

              {isCloudConfigured && (
                <Pressable
                  style={({ pressed }) => [styles.storageBtn, pressed && { opacity: 0.75 }]}
                  disabled={isTesting}
                  onPress={handleTestNow}
                >
                  {isTesting
                    ? <ActivityIndicator size="small" color={Colors.gpsGreen} />
                    : <Ionicons name="wifi-outline" size={14} color={Colors.gpsGreen} />}
                  <Text style={[styles.storageBtnText, { color: Colors.gpsGreen }]}>
                    Test Now
                  </Text>
                </Pressable>
              )}

              {isCloudConfigured && (
                <Pressable
                  style={({ pressed }) => [styles.storageBtn, pressed && { opacity: 0.75 }]}
                  onPress={clearConfig}
                >
                  <Ionicons name="trash-outline" size={14} color={Colors.accent} />
                  <Text style={[styles.storageBtnText, { color: Colors.accent }]}>Disconnect</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

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

      <StorageWizard
        visible={wizardVisible}
        onClose={() => setWizardVisible(false)}
        onSaved={reloadConfig}
      />
      <SuccessToast visible={showSuccessToast} message="Connection successful" />
    </View>
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginLeft: 2,
  },
  managedBadge: {
    backgroundColor: 'rgba(0,255,136,0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  managedBadgeText: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
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
  // ── Job / Active Job styles ─────────────────────────────────────────────────
  inputLabel: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    letterSpacing: 0.4,
    paddingHorizontal: 14,
    paddingTop: 14,
    marginBottom: 6,
  },
  settingsInput: {
    marginHorizontal: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: Colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  inputHint: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 14,
    paddingBottom: 14,
    marginTop: 6,
  },
  mountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
    marginTop: 6,
  },
  mountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mountPillSelected: {
    backgroundColor: Colors.gpsGreen,
    borderColor: Colors.gpsGreen,
  },
  mountPillText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  mountPillTextSelected: {
    color: '#000',
    fontFamily: 'Inter_600SemiBold',
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
  storageStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  storageIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageText: {
    flex: 1,
    gap: 2,
  },
  storageProviderName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  storageProviderDesc: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  connectionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  connectionStatusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    flex: 1,
  },
  errorSnippetBox: {
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.25)',
    padding: 10,
  },
  errorSnippetText: {
    color: Colors.accent,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  storageActions: {
    flexDirection: 'row',
    gap: 0,
  },
  storageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  storageBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
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
  sliderValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 4,
    gap: 4,
  },
  sliderValue: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 40,
    lineHeight: 44,
  },
  sliderUnit: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 18,
  },
  sliderWrapper: {
    paddingHorizontal: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: -4,
    marginBottom: 4,
  },
  sliderMin: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  sliderMax: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  toggleDesc: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  toggleSwitch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleSwitchOn: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.textTertiary,
  },
  toggleThumbOn: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },
});
