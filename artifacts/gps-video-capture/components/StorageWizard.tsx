import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Colors from '@/constants/colors';
import { StorageConfig, testCredentials } from '@/contexts/StorageConfigContext';

const CONFIG_STORAGE_KEY = '@gps_storage_config';
const TEST_RESULT_KEY = '@gps_storage_test_result';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type WizardStep = 'choose' | 'supabase' | 'webhook' | 'testing' | 'success' | 'error';
type ProviderType = 'none' | 'supabase' | 'webhook';

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.infoBox}>
      <Ionicons name="information-circle" size={16} color={Colors.blue} style={{ marginTop: 1 }} />
      <View style={styles.infoBoxContent}>{children}</View>
    </View>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <View style={styles.codeBlock}>
      <Text style={styles.codeText}>{children}</Text>
    </View>
  );
}

function SetupStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View style={styles.setupStep}>
      <View style={styles.setupStepNum}>
        <Text style={styles.setupStepNumText}>{n}</Text>
      </View>
      <View style={styles.setupStepBody}>{children}</View>
    </View>
  );
}

export default function StorageWizard({ visible, onClose, onSaved }: Props) {
  const [step, setStep] = useState<WizardStep>('choose');
  const [pendingProvider, setPendingProvider] = useState<ProviderType>('none');

  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseBucket, setSupabaseBucket] = useState('frames');

  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  const [testError, setTestError] = useState('');
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const isMounted = useRef(true);
  const testTokenRef = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const reset = () => {
    testTokenRef.current++; // invalidate any in-flight test
    setStep('choose');
    setPendingProvider('none');
    setSupabaseUrl('');
    setSupabaseKey('');
    setSupabaseBucket('frames');
    setWebhookUrl('');
    setWebhookSecret('');
    setTestError('');
    setInstructionsOpen(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const persistTestResult = async (success: boolean, error?: string) => {
    const result = { success, error, testedAt: Date.now() };
    await AsyncStorage.setItem(TEST_RESULT_KEY, JSON.stringify(result)).catch(() => {});
  };

  const buildConfig = (): StorageConfig => {
    if (pendingProvider === 'supabase') {
      return { providerType: 'supabase', supabaseUrl, supabaseKey, supabaseBucket };
    }
    if (pendingProvider === 'webhook') {
      return { providerType: 'webhook', webhookUrl, webhookSecret };
    }
    return { providerType: 'none' };
  };

  const startTest = async (provider: ProviderType) => {
    const token = ++testTokenRef.current;
    setPendingProvider(provider);
    setStep('testing');
    const config: StorageConfig = provider === 'supabase'
      ? { providerType: 'supabase', supabaseUrl, supabaseKey, supabaseBucket }
      : { providerType: 'webhook', webhookUrl, webhookSecret };

    const result = await testCredentials(config);
    // Guard against stale callbacks: component unmounted or a newer test started
    if (!isMounted.current || testTokenRef.current !== token) return;

    if (result.success) {
      // Only persist test result and save config when the test actually passed
      await persistTestResult(true);
      await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config)).catch(() => {});
      onSaved?.();
      setStep('success');
    } else {
      // Keep the failure local to wizard state only — don't touch the persisted
      // test result so Settings continues to reflect the previously saved config
      setTestError(result.error ?? 'Connection failed');
      setStep('error');
    }
  };

  const saveAnyway = async () => {
    const config = buildConfig();
    // New (untested) config is being saved — clear any existing test result so
    // Settings correctly shows "Configured, not tested" rather than a stale result
    await AsyncStorage.removeItem(TEST_RESULT_KEY).catch(() => {});
    await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config)).catch(() => {});
    onSaved?.();
    reset();
    onClose();
  };

  const handleProviderBack = () => {
    setStep('choose');
    setInstructionsOpen(false);
  };

  const supabaseReady = Boolean(supabaseUrl) && Boolean(supabaseKey) && Boolean(supabaseBucket);
  const webhookReady = Boolean(webhookUrl);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Cloud Storage</Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* ── CHOOSE PROVIDER ─────────────────────────────────── */}
          {step === 'choose' && (
            <View style={styles.choices}>
              <Text style={styles.subtitle}>Choose where to upload your captured frames.</Text>

              <Pressable style={styles.choiceBtn} onPress={() => setStep('supabase')}>
                <Ionicons name="server-outline" size={24} color={Colors.gpsGreen} />
                <View style={styles.choiceText}>
                  <Text style={styles.choiceName}>Supabase</Text>
                  <Text style={styles.choiceDesc}>Upload frames to a Supabase Storage bucket</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
              </Pressable>

              <Pressable style={styles.choiceBtn} onPress={() => setStep('webhook')}>
                <Ionicons name="link-outline" size={24} color={Colors.blue} />
                <View style={styles.choiceText}>
                  <Text style={styles.choiceName}>Webhook</Text>
                  <Text style={styles.choiceDesc}>POST frames as base64 to any HTTP endpoint</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
              </Pressable>

              <Pressable
                style={[styles.choiceBtn, styles.choiceBtnNone]}
                onPress={async () => {
                  await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ providerType: 'none' })).catch(() => {});
                  await AsyncStorage.removeItem(TEST_RESULT_KEY).catch(() => {});
                  onSaved?.();
                  reset();
                  onClose();
                }}
              >
                <Ionicons name="phone-portrait-outline" size={24} color={Colors.textSecondary} />
                <View style={styles.choiceText}>
                  <Text style={styles.choiceName}>Local Only</Text>
                  <Text style={styles.choiceDesc}>Keep frames on device only</Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* ── SUPABASE CREDENTIALS ────────────────────────────── */}
          {step === 'supabase' && (
            <View style={styles.form}>
              <Text style={styles.subtitle}>Enter your Supabase project credentials.</Text>

              {/* Instructions toggle */}
              <Pressable
                style={styles.instructionsToggle}
                onPress={() => setInstructionsOpen((v) => !v)}
              >
                <Ionicons name="help-circle-outline" size={16} color={Colors.blue} />
                <Text style={styles.instructionsToggleText}>How to set this up</Text>
                <Ionicons
                  name={instructionsOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={Colors.blue}
                />
              </Pressable>

              {instructionsOpen && (
                <View style={styles.instructionsPanel}>
                  <SetupStep n={1}>
                    <Text style={styles.setupText}>
                      Go to{' '}
                      <Text style={styles.setupLink}>supabase.com</Text>
                      {' '}and create a project (or open an existing one).
                    </Text>
                  </SetupStep>

                  <SetupStep n={2}>
                    <Text style={styles.setupText}>
                      In the left sidebar, open{' '}
                      <Text style={styles.setupBold}>Storage</Text>
                      {' '}→{' '}
                      <Text style={styles.setupBold}>New Bucket</Text>.
                    </Text>
                    <Text style={[styles.setupText, { marginTop: 4 }]}>
                      Name it anything (e.g. <Text style={styles.setupCode}>frames</Text>).
                      Set the bucket to{' '}
                      <Text style={styles.setupBold}>Public</Text>
                      {' '}or configure an RLS policy that permits anon uploads.
                    </Text>
                  </SetupStep>

                  <SetupStep n={3}>
                    <Text style={styles.setupText}>
                      Go to{' '}
                      <Text style={styles.setupBold}>Project Settings → API</Text>
                      {' '}and copy:
                    </Text>
                    <View style={styles.bulletList}>
                      <Text style={styles.bullet}>• <Text style={styles.setupBold}>Project URL</Text> → paste below</Text>
                      <Text style={styles.bullet}>• <Text style={styles.setupBold}>anon / public</Text> key → paste below</Text>
                    </View>
                  </SetupStep>

                  <SetupStep n={4}>
                    <Text style={styles.setupText}>
                      The app creates folder structure automatically — no manual setup needed:
                    </Text>
                    <CodeBlock>
                      {`${supabaseBucket || 'frames'}/\n└── <sessionId>/\n    ├── frame_001.jpg\n    ├── frame_002.jpg\n    └── ...`}
                    </CodeBlock>
                    <Text style={[styles.setupText, { marginTop: 4, color: Colors.textTertiary }]}>
                      One folder per recording session (named by UUID).
                    </Text>
                  </SetupStep>
                </View>
              )}

              <Text style={styles.fieldLabel}>Project URL</Text>
              <TextInput
                style={styles.input}
                value={supabaseUrl}
                onChangeText={setSupabaseUrl}
                placeholder="https://abc.supabase.co"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                keyboardType="url"
              />
              <Text style={styles.fieldLabel}>Anon Key</Text>
              <TextInput
                style={styles.input}
                value={supabaseKey}
                onChangeText={setSupabaseKey}
                placeholder="eyJ..."
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
              />
              <Text style={styles.fieldLabel}>Bucket Name</Text>
              <TextInput
                style={styles.input}
                value={supabaseBucket}
                onChangeText={setSupabaseBucket}
                placeholder="frames"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
              />

              <View style={styles.formActions}>
                <Pressable style={styles.backBtn} onPress={handleProviderBack}>
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, !supabaseReady && styles.saveBtnDisabled]}
                  disabled={!supabaseReady}
                  onPress={() => startTest('supabase')}
                >
                  <Ionicons name="wifi-outline" size={15} color="#fff" />
                  <Text style={styles.saveBtnText}>Test & Save</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── WEBHOOK CREDENTIALS ─────────────────────────────── */}
          {step === 'webhook' && (
            <View style={styles.form}>
              <Text style={styles.subtitle}>Enter your webhook endpoint URL.</Text>

              <Pressable
                style={styles.instructionsToggle}
                onPress={() => setInstructionsOpen((v) => !v)}
              >
                <Ionicons name="help-circle-outline" size={16} color={Colors.blue} />
                <Text style={styles.instructionsToggleText}>How to set this up</Text>
                <Ionicons
                  name={instructionsOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={Colors.blue}
                />
              </Pressable>

              {instructionsOpen && (
                <View style={styles.instructionsPanel}>
                  <SetupStep n={1}>
                    <Text style={styles.setupText}>
                      Deploy an HTTP endpoint that accepts{' '}
                      <Text style={styles.setupBold}>POST</Text>
                      {' '}requests.
                    </Text>
                  </SetupStep>

                  <SetupStep n={2}>
                    <Text style={styles.setupText}>
                      The app sends a JSON body with these fields:
                    </Text>
                    <CodeBlock>{`{\n  "id": "uuid",\n  "sessionId": "uuid",\n  "filename": "frame_001.jpg",\n  "timestamp": 1700000000000,\n  "latitude": 37.7749,\n  "longitude": -122.4194,\n  "segmentName": "seg_001",\n  "imageBase64": "<base64 JPEG>"\n}`}</CodeBlock>
                  </SetupStep>

                  <SetupStep n={3}>
                    <Text style={styles.setupText}>
                      Respond with any{' '}
                      <Text style={styles.setupBold}>2xx status</Text>
                      {' '}and optionally include:
                    </Text>
                    <CodeBlock>{'{ "url": "https://..." }'}</CodeBlock>
                    <Text style={[styles.setupText, { marginTop: 4 }]}>
                      The <Text style={styles.setupCode}>url</Text> field, if returned, is recorded in the session log as the remote file location.
                    </Text>
                  </SetupStep>

                  <SetupStep n={4}>
                    <Text style={styles.setupText}>
                      The optional{' '}
                      <Text style={styles.setupBold}>Secret</Text>
                      {' '}value is sent as the{' '}
                      <Text style={styles.setupCode}>x-webhook-secret</Text>
                      {' '}request header for basic authentication.
                    </Text>
                  </SetupStep>
                </View>
              )}

              <Text style={styles.fieldLabel}>Endpoint URL</Text>
              <TextInput
                style={styles.input}
                value={webhookUrl}
                onChangeText={setWebhookUrl}
                placeholder="https://example.com/frames"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                keyboardType="url"
              />
              <Text style={styles.fieldLabel}>Secret (optional)</Text>
              <TextInput
                style={styles.input}
                value={webhookSecret}
                onChangeText={setWebhookSecret}
                placeholder="Sent as x-webhook-secret header"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
              />

              <View style={styles.formActions}>
                <Pressable style={styles.backBtn} onPress={handleProviderBack}>
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, !webhookReady && styles.saveBtnDisabled]}
                  disabled={!webhookReady}
                  onPress={() => startTest('webhook')}
                >
                  <Ionicons name="wifi-outline" size={15} color="#fff" />
                  <Text style={styles.saveBtnText}>Test & Save</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── TESTING ─────────────────────────────────────────── */}
          {step === 'testing' && (
            <View style={styles.centeredStep}>
              <ActivityIndicator size="large" color={Colors.blue} />
              <Text style={styles.testingTitle}>Testing connection…</Text>
              <Text style={styles.testingSubtitle}>
                Connecting to your {pendingProvider === 'supabase' ? 'Supabase bucket' : 'webhook endpoint'}, please wait.
              </Text>
            </View>
          )}

          {/* ── SUCCESS ─────────────────────────────────────────── */}
          {step === 'success' && (
            <View style={styles.centeredStep}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={40} color="#fff" />
              </View>
              <Text style={styles.successTitle}>Connected!</Text>
              <Text style={styles.successSubtitle}>
                {pendingProvider === 'supabase'
                  ? 'Frames will upload to your Supabase bucket after each session. Uploads retry automatically if you go offline.'
                  : 'Frames will be POSTed to your endpoint after each session. Uploads retry automatically if you go offline.'}
              </Text>
              <InfoBox>
                <Text style={styles.infoBoxText}>
                  Uploads are queued and sent in the background. If the device goes offline, they resume automatically when connectivity is restored.
                </Text>
              </InfoBox>
              <Pressable style={styles.doneBtn} onPress={handleClose}>
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          )}

          {/* ── ERROR ───────────────────────────────────────────── */}
          {step === 'error' && (
            <View style={styles.centeredStep}>
              <View style={styles.errorIcon}>
                <Ionicons name="close" size={38} color="#fff" />
              </View>
              <Text style={styles.errorTitle}>Connection Failed</Text>
              <View style={styles.errorBox}>
                <Text style={styles.errorMessage}>{testError}</Text>
              </View>
              <Text style={styles.errorHint}>
                Check that your credentials are correct and that the bucket exists with public access or an anon-upload RLS policy.
              </Text>
              <View style={styles.errorActions}>
                <Pressable
                  style={styles.retryBtn}
                  onPress={() => setStep(pendingProvider === 'supabase' ? 'supabase' : 'webhook')}
                >
                  <Ionicons name="refresh-outline" size={16} color={Colors.text} />
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </Pressable>
                <Pressable style={styles.saveAnywayBtn} onPress={saveAnyway}>
                  <Text style={styles.saveAnywayText}>Save Anyway</Text>
                </Pressable>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { color: Colors.text, fontFamily: 'Inter_700Bold', fontSize: 18 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  subtitle: { color: Colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 14, marginBottom: 20 },

  // Choose
  choices: { gap: 12 },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  choiceBtnNone: { opacity: 0.7 },
  choiceText: { flex: 1 },
  choiceName: { color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  choiceDesc: { color: Colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },

  // Form
  form: { gap: 4 },
  fieldLabel: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  backBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  backBtnText: { color: Colors.textSecondary, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 },

  // Instructions
  instructionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 2,
  },
  instructionsToggleText: {
    color: Colors.blue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    flex: 1,
  },
  instructionsPanel: {
    backgroundColor: 'rgba(10,132,255,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.2)',
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
  setupStep: { flexDirection: 'row', gap: 10 },
  setupStepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  setupStepNumText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 10 },
  setupStepBody: { flex: 1, gap: 4 },
  setupText: { color: Colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  setupBold: { color: Colors.text, fontFamily: 'Inter_600SemiBold' },
  setupLink: { color: Colors.blue, fontFamily: 'Inter_400Regular' },
  setupCode: {
    color: Colors.gpsGreen,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 12,
  },
  bulletList: { gap: 3, marginTop: 4 },
  bullet: { color: Colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 13 },
  codeBlock: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  codeText: {
    color: Colors.gpsGreen,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },

  // Centered steps (testing / success / error)
  centeredStep: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 16,
  },
  testingTitle: { color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 18, textAlign: 'center' },
  testingSubtitle: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },

  // Success
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.gpsGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { color: Colors.text, fontFamily: 'Inter_700Bold', fontSize: 24 },
  successSubtitle: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 21,
  },
  doneBtn: {
    marginTop: 8,
    backgroundColor: Colors.blue,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 16 },

  // Error
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: { color: Colors.text, fontFamily: 'Inter_700Bold', fontSize: 22 },
  errorBox: {
    width: '100%',
    backgroundColor: Colors.accentDim,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.accent,
    padding: 14,
  },
  errorMessage: {
    color: Colors.accent,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 13,
    lineHeight: 19,
  },
  errorHint: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 19,
  },
  errorActions: { flexDirection: 'row', gap: 12, width: '100%' },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryBtnText: { color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  saveAnywayBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveAnywayText: { color: Colors.textSecondary, fontFamily: 'Inter_600SemiBold', fontSize: 15 },

  // Info box
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(10,132,255,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.2)',
    padding: 12,
    width: '100%',
  },
  infoBoxContent: { flex: 1 },
  infoBoxText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
});
