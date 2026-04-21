import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
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
import { StorageConfig, testCredentials, useStorageConfig } from '@/contexts/StorageConfigContext';
import {
  SupabaseBucket,
  SupabaseProject,
  getAnonKey,
  listBuckets,
  listProjects,
} from '@/lib/supabaseManagement';

const CONFIG_STORAGE_KEY = '@gps_storage_config';
const TEST_RESULT_KEY = '@gps_storage_test_result';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type WizardStep =
  | 'preconfigured'
  | 'choose'
  | 'supabase-account'
  | 'bucket-select'
  | 'supabase'
  | 'webhook'
  | 'testing'
  | 'success'
  | 'error';

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
  const { isEnvPreconfigured } = useStorageConfig();
  const [step, setStep] = useState<WizardStep>('choose');
  const [pendingProvider, setPendingProvider] = useState<ProviderType>('none');

  // Manual Supabase / webhook state (unchanged)
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseBucket, setSupabaseBucket] = useState('frames');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [testError, setTestError] = useState('');
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  // PAT / account connect state (new)
  const [pat, setPat] = useState('');
  const [fetchingProjects, setFetchingProjects] = useState(false);
  const [projects, setProjects] = useState<SupabaseProject[]>([]);
  const [projectsError, setProjectsError] = useState('');
  const [selectedProject, setSelectedProject] = useState<SupabaseProject | null>(null);
  const [fetchingKey, setFetchingKey] = useState(false);
  const [fetchingBuckets, setFetchingBuckets] = useState(false);
  const [buckets, setBuckets] = useState<SupabaseBucket[]>([]);
  const [bucketsError, setBucketsError] = useState('');
  const [bucketInput, setBucketInput] = useState('frames');

  const [originStep, setOriginStep] = useState<WizardStep>('supabase');

  const isMounted = useRef(true);
  const testTokenRef = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (visible) {
      setStep(isEnvPreconfigured ? 'preconfigured' : 'choose');
    }
  }, [visible, isEnvPreconfigured]);

  const reset = () => {
    testTokenRef.current++;
    setStep(isEnvPreconfigured ? 'preconfigured' : 'choose');
    setPendingProvider('none');
    setSupabaseUrl('');
    setSupabaseKey('');
    setSupabaseBucket('frames');
    setWebhookUrl('');
    setWebhookSecret('');
    setTestError('');
    setInstructionsOpen(false);
    // PAT flow
    setPat('');
    setFetchingProjects(false);
    setProjects([]);
    setProjectsError('');
    setSelectedProject(null);
    setFetchingKey(false);
    setFetchingBuckets(false);
    setBuckets([]);
    setBucketsError('');
    setBucketInput('frames');
    setOriginStep('supabase');
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

  const runTest = async (config: StorageConfig) => {
    const token = ++testTokenRef.current;
    setPendingProvider(config.providerType);
    setStep('testing');

    const result = await testCredentials(config);
    if (!isMounted.current || testTokenRef.current !== token) return;

    if (result.success) {
      await persistTestResult(true);
      await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config)).catch(() => {});
      onSaved?.();
      setStep('success');
    } else {
      setTestError(result.error ?? 'Connection failed');
      setStep('error');
    }
  };

  const startTest = (provider: ProviderType) => {
    const origin: WizardStep = provider === 'supabase' ? 'supabase' : 'webhook';
    setOriginStep(origin);
    const config: StorageConfig = provider === 'supabase'
      ? { providerType: 'supabase', supabaseUrl, supabaseKey, supabaseBucket }
      : { providerType: 'webhook', webhookUrl, webhookSecret };
    return runTest(config);
  };

  const saveAnyway = async () => {
    const config = buildConfig();
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

  // ── PAT flow handlers ──────────────────────────────────────────────
  const handleFetchProjects = async () => {
    setFetchingProjects(true);
    setProjectsError('');
    setProjects([]);
    try {
      const list = await listProjects(pat.trim());
      if (!isMounted.current) return;
      setProjects(list);
    } catch (err) {
      if (!isMounted.current) return;
      setProjectsError(err instanceof Error ? err.message : String(err));
    } finally {
      if (isMounted.current) setFetchingProjects(false);
    }
  };

  const handleSelectProject = async (project: SupabaseProject) => {
    setSelectedProject(project);
    setFetchingKey(true);
    let resolvedUrl = '';
    let resolvedKey = '';

    // Step 1: fetch the anon key — if this fails, stay on supabase-account
    try {
      resolvedKey = await getAnonKey(pat.trim(), project.id);
      if (!isMounted.current) return;
      resolvedUrl = `https://${project.id}.supabase.co`;
      setSupabaseUrl(resolvedUrl);
      setSupabaseKey(resolvedKey);
    } catch (err) {
      if (!isMounted.current) return;
      setProjectsError(err instanceof Error ? err.message : String(err));
      setFetchingKey(false);
      return;
    }
    setFetchingKey(false);

    // Step 2: navigate to bucket-select, then fetch buckets.
    // If listBuckets fails we remain on bucket-select and show the manual text input.
    setStep('bucket-select');
    setFetchingBuckets(true);
    setBuckets([]);
    setBucketsError('');
    try {
      const bkts = await listBuckets(pat.trim(), project.id);
      if (!isMounted.current) return;
      setBuckets(bkts);
    } catch (err) {
      if (!isMounted.current) return;
      setBucketsError(err instanceof Error ? err.message : String(err));
    } finally {
      if (isMounted.current) setFetchingBuckets(false);
    }
  };

  const handleSelectBucket = (bucketName: string) => {
    // Update state for saveAnyway / buildConfig, then pass bucket explicitly to
    // runTest to avoid an async state race (setState is batched, so supabaseBucket
    // may not have updated by the time runTest reads it from state).
    setSupabaseBucket(bucketName);
    setBucketInput(bucketName);
    setOriginStep('bucket-select');
    runTest({ providerType: 'supabase', supabaseUrl, supabaseKey, supabaseBucket: bucketName });
  };

  // ─────────────────────────────────────────────────────────────────
  const supabaseReady = Boolean(supabaseUrl) && Boolean(supabaseKey) && Boolean(supabaseBucket);
  const webhookReady = Boolean(webhookUrl);
  const patReady = pat.trim().length > 10;

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

          {/* ── PRE-CONFIGURED (env vars) ───────────────────────── */}
          {step === 'preconfigured' && (
            <View style={styles.preconfiguredContainer}>
              <View style={styles.preconfiguredIconRow}>
                <View style={styles.preconfiguredIcon}>
                  <Ionicons name="shield-checkmark" size={32} color={Colors.gpsGreen} />
                </View>
              </View>

              <Text style={styles.preconfiguredTitle}>Pre-configured</Text>
              <Text style={styles.preconfiguredSubtitle}>
                This app has been set up with Supabase credentials by your administrator. No manual setup is required.
              </Text>

              <View style={styles.preconfiguredCard}>
                <View style={styles.preconfiguredRow}>
                  <Text style={styles.preconfiguredLabel}>PROJECT URL</Text>
                  <Text style={styles.preconfiguredValue} numberOfLines={1}>
                    {process.env.EXPO_PUBLIC_SUPABASE_URL ?? '—'}
                  </Text>
                </View>
                <View style={styles.preconfiguredDivider} />
                <View style={styles.preconfiguredRow}>
                  <Text style={styles.preconfiguredLabel}>BUCKET</Text>
                  <Text style={styles.preconfiguredValue}>
                    {process.env.EXPO_PUBLIC_SUPABASE_BUCKET ?? '—'}
                  </Text>
                </View>
                <View style={styles.preconfiguredDivider} />
                <View style={styles.preconfiguredRow}>
                  <Text style={styles.preconfiguredLabel}>ANON KEY</Text>
                  <Text style={styles.preconfiguredValue}>
                    {'••••••••••••••••••••'}
                  </Text>
                </View>
              </View>

              <InfoBox>
                <Text style={styles.infoBoxText}>
                  These credentials are baked into the app build. You can override them by reconfiguring manually below.
                </Text>
              </InfoBox>

              <Pressable
                style={styles.reconfigureBtn}
                onPress={() => setStep('choose')}
              >
                <Ionicons name="settings-outline" size={15} color={Colors.textSecondary} />
                <Text style={styles.reconfigureBtnText}>Reconfigure manually</Text>
              </Pressable>

              <Pressable style={[styles.doneBtn, { marginTop: 4 }]} onPress={handleClose}>
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          )}

          {/* ── CHOOSE PROVIDER ─────────────────────────────────── */}
          {step === 'choose' && (
            <View style={styles.choices}>
              <Text style={styles.subtitle}>Choose where to upload your captured frames.</Text>

              {/* NEW: Connect with Supabase Account */}
              <Pressable style={[styles.choiceBtn, styles.choiceBtnFeatured]} onPress={() => setStep('supabase-account')}>
                <View style={styles.choiceFeaturedIcon}>
                  <Ionicons name="person-circle-outline" size={22} color={Colors.gpsGreen} />
                </View>
                <View style={styles.choiceText}>
                  <View style={styles.choiceNameRow}>
                    <Text style={styles.choiceName}>Connect with Supabase Account</Text>
                    <View style={styles.choiceNewBadge}>
                      <Text style={styles.choiceNewBadgeText}>EASY</Text>
                    </View>
                  </View>
                  <Text style={styles.choiceDesc}>Sign in to your account and pick a project — no credentials to copy</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
              </Pressable>

              {/* Existing: Manual Supabase */}
              <Pressable style={styles.choiceBtn} onPress={() => setStep('supabase')}>
                <Ionicons name="server-outline" size={24} color={Colors.gpsGreen} />
                <View style={styles.choiceText}>
                  <Text style={styles.choiceName}>Supabase</Text>
                  <Text style={styles.choiceDesc}>Enter your Project URL, anon key, and bucket manually</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
              </Pressable>

              {/* Existing: Webhook */}
              <Pressable style={styles.choiceBtn} onPress={() => setStep('webhook')}>
                <Ionicons name="link-outline" size={24} color={Colors.blue} />
                <View style={styles.choiceText}>
                  <Text style={styles.choiceName}>Webhook</Text>
                  <Text style={styles.choiceDesc}>POST frames as base64 to any HTTP endpoint</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
              </Pressable>

              {/* Existing: Local Only */}
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

          {/* ── SUPABASE ACCOUNT (PAT) ───────────────────────────── */}
          {step === 'supabase-account' && (
            <View style={styles.form}>
              <Text style={styles.subtitle}>
                Enter your Supabase Personal Access Token to browse your projects.
              </Text>

              <InfoBox>
                <Text style={styles.infoBoxText}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', color: Colors.text }}>Your token is never stored.</Text>
                  {' '}It is kept in memory only during setup to fetch your project credentials, and is cleared when you close this screen.{'\n\n'}
                  Generate a token at{' '}
                  <Text style={{ color: Colors.blue }}>supabase.com/dashboard/account/tokens</Text>
                </Text>
              </InfoBox>

              <Text style={styles.fieldLabel}>Personal Access Token</Text>
              <TextInput
                style={styles.input}
                value={pat}
                onChangeText={(t) => {
                  setPat(t);
                  setProjects([]);
                  setProjectsError('');
                }}
                placeholder="sbp_..."
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                secureTextEntry
              />

              {/* Connect button */}
              <Pressable
                style={[styles.saveBtn, { marginTop: 16 }, !patReady && styles.saveBtnDisabled]}
                disabled={!patReady || fetchingProjects}
                onPress={handleFetchProjects}
              >
                {fetchingProjects
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="cloud-download-outline" size={15} color="#fff" />}
                <Text style={styles.saveBtnText}>
                  {fetchingProjects ? 'Fetching projects…' : 'Connect'}
                </Text>
              </Pressable>

              {/* Project list */}
              {projectsError !== '' && (
                <View style={styles.patErrorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color={Colors.accent} />
                  <Text style={styles.patErrorText}>{projectsError}</Text>
                </View>
              )}

              {projects.length > 0 && (
                <View style={styles.projectList}>
                  <Text style={styles.fieldLabel}>Your Projects</Text>
                  {projects.map((p) => (
                    <Pressable
                      key={p.id}
                      style={({ pressed }) => [
                        styles.projectCard,
                        pressed && { opacity: 0.7 },
                        fetchingKey && { opacity: 0.5 },
                      ]}
                      disabled={fetchingKey}
                      onPress={() => handleSelectProject(p)}
                    >
                      <View style={styles.projectCardLeft}>
                        <Text style={styles.projectCardName}>{p.name}</Text>
                        <Text style={styles.projectCardId}>{p.id}.supabase.co</Text>
                      </View>
                      <View style={styles.regionBadge}>
                        <Text style={styles.regionBadgeText}>{p.region}</Text>
                      </View>
                      {fetchingKey && selectedProject?.id === p.id
                        ? <ActivityIndicator size="small" color={Colors.gpsGreen} />
                        : <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />}
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Manual fallback */}
              <View style={styles.manualFallbackRow}>
                <Pressable onPress={() => setStep('supabase')}>
                  <Text style={styles.manualFallbackText}>Enter credentials manually instead</Text>
                </Pressable>
              </View>

              <View style={styles.formActions}>
                <Pressable style={[styles.backBtn, { flex: 1 }]} onPress={handleProviderBack}>
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── BUCKET SELECT ────────────────────────────────────── */}
          {step === 'bucket-select' && (
            <View style={styles.form}>
              <Text style={styles.subtitle}>
                {selectedProject
                  ? `Choose a storage bucket in "${selectedProject.name}".`
                  : 'Choose a storage bucket.'}
              </Text>

              {fetchingBuckets && (
                <View style={styles.centeredRow}>
                  <ActivityIndicator size="small" color={Colors.blue} />
                  <Text style={styles.fetchingText}>Loading buckets…</Text>
                </View>
              )}

              {!fetchingBuckets && buckets.length > 0 && (
                <View style={styles.bucketList}>
                  <Text style={styles.fieldLabel}>Available Buckets</Text>
                  {buckets.map((b) => (
                    <Pressable
                      key={b.id}
                      style={({ pressed }) => [styles.bucketCard, pressed && { opacity: 0.7 }]}
                      onPress={() => handleSelectBucket(b.name)}
                    >
                      <Ionicons
                        name={b.public ? 'globe-outline' : 'lock-closed-outline'}
                        size={16}
                        color={b.public ? Colors.gpsGreen : Colors.amber}
                      />
                      <Text style={styles.bucketCardName}>{b.name}</Text>
                      <View style={[
                        styles.bucketBadge,
                        { backgroundColor: b.public ? Colors.gpsDim : Colors.amberDim },
                      ]}>
                        <Text style={[
                          styles.bucketBadgeText,
                          { color: b.public ? Colors.gpsGreen : Colors.amber },
                        ]}>
                          {b.public ? 'Public' : 'Private'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                    </Pressable>
                  ))}
                </View>
              )}

              {!fetchingBuckets && bucketsError !== '' && (
                <View style={styles.patErrorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color={Colors.amber} />
                  <Text style={[styles.patErrorText, { color: Colors.amber }]}>
                    Could not load buckets: {bucketsError}
                  </Text>
                </View>
              )}

              {/* Create new bucket option — always shown below existing list */}
              {!fetchingBuckets && (
                <View style={{ marginTop: buckets.length > 0 ? 8 : 0 }}>
                  <Pressable
                    style={({ pressed }) => [styles.bucketCard, styles.bucketCardNew, pressed && { opacity: 0.7 }]}
                    onPress={() => setBucketInput('frames')}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={Colors.blue} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bucketCardName, { color: Colors.blue }]}>Create new bucket</Text>
                      <Text style={{ color: Colors.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 }}>
                        Enter a name in the field below
                      </Text>
                    </View>
                  </Pressable>
                </View>
              )}

              {/* Manual bucket name input */}
              <View style={[styles.dividerRow, { marginTop: 16 }]}>
                {buckets.length > 0 && (
                  <Text style={styles.dividerLabel}>or use an existing bucket name</Text>
                )}
              </View>
              <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Bucket Name</Text>
              <TextInput
                style={styles.input}
                value={bucketInput}
                onChangeText={setBucketInput}
                placeholder="frames"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
              />
              <Text style={styles.bucketHint}>
                The bucket must already exist in your Supabase project with public access or an anon-upload RLS policy.
              </Text>

              {selectedProject && (
                <>
                  <Pressable
                    style={styles.dashboardLink}
                    onPress={() =>
                      WebBrowser.openBrowserAsync(
                        `https://supabase.com/dashboard/project/${selectedProject.id}/storage/buckets/new`
                      )
                    }
                  >
                    <Ionicons name="open-outline" size={14} color={Colors.blue} />
                    <Text style={styles.dashboardLinkText}>Create a new bucket in Supabase ↗</Text>
                  </Pressable>
                  <Pressable
                    style={styles.dashboardLink}
                    onPress={() =>
                      WebBrowser.openBrowserAsync(
                        `https://supabase.com/dashboard/project/${selectedProject.id}/storage/policies`
                      )
                    }
                  >
                    <Ionicons name="open-outline" size={14} color={Colors.blue} />
                    <Text style={styles.dashboardLinkText}>Manage bucket permissions in Supabase ↗</Text>
                  </Pressable>
                </>
              )}

              <View style={styles.formActions}>
                <Pressable
                  style={styles.backBtn}
                  onPress={() => setStep('supabase-account')}
                >
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, !bucketInput.trim() && styles.saveBtnDisabled]}
                  disabled={!bucketInput.trim()}
                  onPress={() => handleSelectBucket(bucketInput.trim())}
                >
                  <Ionicons name="wifi-outline" size={15} color="#fff" />
                  <Text style={styles.saveBtnText}>Test & Save</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── SUPABASE CREDENTIALS (manual) ───────────────────── */}
          {step === 'supabase' && (
            <View style={styles.form}>
              <Text style={styles.subtitle}>Enter your Supabase project credentials.</Text>

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
                  onPress={() => setStep(originStep)}
                >
                  <Ionicons name="refresh-outline" size={16} color={Colors.text} />
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </Pressable>
                <Pressable style={styles.saveAnywayBtn} onPress={saveAnyway}>
                  <Text style={styles.saveAnywayText}>Save Anyway</Text>
                </Pressable>
              </View>
              {originStep === 'bucket-select' && (
                <Pressable
                  style={styles.changeProjectBtn}
                  onPress={() => setStep('supabase-account')}
                >
                  <Text style={styles.changeProjectText}>Change Project</Text>
                </Pressable>
              )}
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
  choiceBtnFeatured: {
    borderColor: 'rgba(0,255,136,0.35)',
    backgroundColor: 'rgba(0,255,136,0.06)',
  },
  choiceFeaturedIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,255,136,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceBtnNone: { opacity: 0.7 },
  choiceText: { flex: 1 },
  choiceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  choiceName: { color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  choiceDesc: { color: Colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  choiceNewBadge: {
    backgroundColor: 'rgba(0,255,136,0.2)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  choiceNewBadgeText: {
    color: Colors.gpsGreen,
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },

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

  // PAT / account connect
  patErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.accentDim,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
    padding: 12,
    marginTop: 12,
  },
  patErrorText: {
    color: Colors.accent,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  projectList: { marginTop: 8, gap: 8 },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  projectCardLeft: { flex: 1, gap: 2 },
  projectCardName: { color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  projectCardId: { color: Colors.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 11 },
  regionBadge: {
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  regionBadgeText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  manualFallbackRow: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  manualFallbackText: {
    color: Colors.blue,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textDecorationLine: 'underline',
  },

  // Bucket select
  centeredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  fetchingText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  bucketList: { gap: 8, marginTop: 4 },
  bucketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  bucketCardNew: {
    borderColor: 'rgba(10,132,255,0.3)',
    backgroundColor: 'rgba(10,132,255,0.06)',
  },
  bucketCardName: { color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 14, flex: 1 },
  bucketBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  bucketBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  dividerRow: {
    alignItems: 'center',
  },
  dividerLabel: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  bucketHint: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  dashboardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  dashboardLinkText: {
    color: Colors.blue,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
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
  changeProjectBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  changeProjectText: {
    color: Colors.blue,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },

  // Pre-configured (env vars)
  preconfiguredContainer: {
    alignItems: 'center',
    paddingTop: 20,
    gap: 16,
  },
  preconfiguredIconRow: {
    alignItems: 'center',
  },
  preconfiguredIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,255,136,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preconfiguredTitle: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    textAlign: 'center',
  },
  preconfiguredSubtitle: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
  preconfiguredCard: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  preconfiguredRow: {
    paddingVertical: 12,
    gap: 4,
  },
  preconfiguredLabel: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  preconfiguredValue: {
    color: Colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  preconfiguredDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  reconfigureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reconfigureBtnText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },

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
