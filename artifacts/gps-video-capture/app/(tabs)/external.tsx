import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { ExternalCameraProvider, useExternalCamera } from '@/contexts/ExternalCameraContext';
import { CameraSourceSelector } from '@/components/ExternalCamera/CameraSourceSelector';
import { DeviceDiscoveryList } from '@/components/ExternalCamera/DeviceDiscoveryList';
import { GPSSourceSelector } from '@/components/ExternalCamera/GPSSourceSelector';
import { CapabilityPanel } from '@/components/ExternalCamera/CapabilityPanel';
import { ExternalCameraStatusBar } from '@/components/ExternalCamera/StatusBar';
import { MediaBrowser } from '@/components/ExternalCamera/MediaBrowser';

// ─── Inner screen (requires context) ─────────────────────────────────────────

function ExternalScreen() {
  const insets = useSafeAreaInsets();
  const cam = useExternalCamera();

  const [importingId, setImportingId] = useState<string | null>(null);

  const capabilities = cam.selectedProvider?.getCapabilities() ?? null;
  const isConnected = cam.connectionState === 'connected';

  async function handleImport(mediaId: string) {
    setImportingId(mediaId);
    await cam.importMedia(mediaId);
    setImportingId(null);
  }

  async function handleStartStop() {
    if (!cam.isSessionActive) {
      await cam.startSession();
    }
    if (cam.recordingState === 'recording') {
      await cam.stopRecording();
    } else if (cam.recordingState === 'idle') {
      await cam.startRecording();
    }
  }

  function handleError() {
    if (!cam.lastError) return;
    Alert.alert('Error', cam.lastError.message, [
      { text: 'Dismiss', onPress: cam.clearError },
    ]);
  }

  // Show error alert when a new error arrives
  React.useEffect(() => {
    if (cam.lastError) handleError();
  }, [cam.lastError?.timestamp]);

  const canRecord =
    isConnected && capabilities?.supportsStartStopRecording && cam.isSessionActive;
  const isRecording = cam.recordingState === 'recording';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>External Camera</Text>
        <Text style={styles.subtitle}>Extensible provider architecture</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status bar */}
        <ExternalCameraStatusBar
          connectionState={cam.connectionState}
          recordingState={cam.recordingState}
          gpsMode={cam.gpsMode}
          lastGPSPoint={cam.lastGPSPoint}
          providerName={cam.selectedProvider?.displayName ?? 'None'}
        />

        <Divider />

        {/* Camera source */}
        <BlurView intensity={16} tint="dark" style={styles.card}>
          <CameraSourceSelector
            providers={cam.allProviders}
            selected={cam.selectedProvider}
            onSelect={cam.selectProvider}
          />
        </BlurView>

        {/* Device discovery (only when a provider is selected) */}
        {cam.selectedProvider && (
          <>
            <BlurView intensity={16} tint="dark" style={styles.card}>
              <DeviceDiscoveryList
                devices={cam.discoveredDevices}
                isDiscovering={cam.isDiscovering}
                connectedDeviceId={cam.connectedDeviceId}
                connectionState={cam.connectionState}
                onDiscover={cam.discoverDevices}
                onConnect={cam.connectDevice}
                onDisconnect={cam.disconnectDevice}
              />
            </BlurView>
          </>
        )}

        {/* GPS source (only when connected) */}
        {isConnected && (
          <BlurView intensity={16} tint="dark" style={styles.card}>
            <GPSSourceSelector
              selected={cam.gpsMode}
              capabilities={capabilities}
              onSelect={cam.setGPSMode}
            />
          </BlurView>
        )}

        {/* Capabilities (only when connected) */}
        {isConnected && capabilities && (
          <BlurView intensity={16} tint="dark" style={styles.card}>
            <CapabilityPanel capabilities={capabilities} />
          </BlurView>
        )}

        {/* Session + recording controls (only when connected) */}
        {isConnected && (
          <BlurView intensity={16} tint="dark" style={styles.card}>
            <Text style={styles.sectionLabel}>SESSION</Text>
            <View style={styles.sessionRow}>
              {!cam.isSessionActive ? (
                <TouchableOpacity
                  style={styles.sessionBtn}
                  onPress={cam.startSession}
                >
                  <Ionicons name="play-circle-outline" size={18} color={Colors.gpsGreen} />
                  <Text style={styles.sessionBtnLabel}>Start Session</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.sessionBtn, styles.sessionBtnStop]}
                  onPress={cam.endSession}
                >
                  <Ionicons name="stop-circle-outline" size={18} color={Colors.textSecondary} />
                  <Text style={[styles.sessionBtnLabel, { color: Colors.textSecondary }]}>End Session</Text>
                </TouchableOpacity>
              )}

              {cam.isSessionActive && capabilities?.supportsStartStopRecording && (
                <TouchableOpacity
                  style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
                  onPress={handleStartStop}
                >
                  <Ionicons
                    name={isRecording ? 'stop' : 'radio-button-on'}
                    size={16}
                    color={isRecording ? '#fff' : Colors.accent}
                  />
                  <Text style={[styles.recordBtnLabel, isRecording && styles.recordBtnLabelActive]}>
                    {isRecording ? 'Stop Rec' : 'Record'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Provider-specific notice when features are unsupported */}
            {cam.isSessionActive && !capabilities?.supportsStartStopRecording && (
              <View style={styles.notice}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.amber} />
                <Text style={styles.noticeText}>
                  This provider does not support remote recording control.
                </Text>
              </View>
            )}
          </BlurView>
        )}

        {/* Media browser (only when connected and import is supported) */}
        {isConnected && capabilities?.supportsMediaImport && (
          <BlurView intensity={16} tint="dark" style={styles.card}>
            <MediaBrowser
              assets={cam.mediaList}
              isLoading={false}
              onFetch={cam.fetchMedia}
              onImport={handleImport}
              importingId={importingId}
            />
          </BlurView>
        )}

        {/* Preview placeholder (when preview is supported but native surface is not wired) */}
        {isConnected && capabilities?.supportsPreview && (
          <BlurView intensity={16} tint="dark" style={styles.card}>
            <Text style={styles.sectionLabel}>PREVIEW</Text>
            <View style={styles.previewPlaceholder}>
              <Ionicons name="videocam-outline" size={28} color={Colors.textTertiary} />
              <Text style={styles.previewText}>
                Preview requires a vendor SDK native module.{'\n'}
                See ManualVendorSDKHookupSteps.md for hookup instructions.
              </Text>
            </View>
          </BlurView>
        )}

        {/* Entry state — nothing selected */}
        {!cam.selectedProvider && (
          <View style={styles.onboarding}>
            <Ionicons name="hardware-chip-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.onboardingTitle}>Choose a Camera Source</Text>
            <Text style={styles.onboardingBody}>
              Select a camera provider above to begin.{'\n'}
              Providers marked "SDK needed" require vendor integration before they can connect.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ─── Root export (wraps with context) ────────────────────────────────────────

export default function ExternalTab() {
  return (
    <ExternalCameraProvider>
      <ExternalScreen />
    </ExternalCameraProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  title: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  subtitle: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 10,
    paddingTop: 8,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  divider: {
    height: 4,
  },
  sectionLabel: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sessionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gpsGreen,
    backgroundColor: 'rgba(0,210,100,0.08)',
  },
  sessionBtnStop: {
    borderColor: Colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  sessionBtnLabel: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: 'rgba(255,107,0,0.08)',
  },
  recordBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  recordBtnLabel: {
    color: Colors.accent,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  recordBtnLabelActive: {
    color: '#fff',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.amberDim,
  },
  noticeText: {
    flex: 1,
    color: Colors.amber,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  previewPlaceholder: {
    height: 140,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  previewText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  onboarding: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
    paddingHorizontal: 20,
  },
  onboardingTitle: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    textAlign: 'center',
  },
  onboardingBody: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
