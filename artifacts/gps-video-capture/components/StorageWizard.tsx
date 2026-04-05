import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { useStorageConfig } from '@/contexts/StorageConfigContext';
import {
  AuthType,
  BodyFormat,
  CustomHeader,
  HttpMethod,
  StorageConfig,
  StorageConfigSupabase,
  StorageConfigWebhook,
  StorageProviderType,
} from '@/lib/storage/types';

type Step = 'choose' | 'configure' | 'done';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PROVIDER_INFO: Record<
  StorageProviderType,
  { icon: string; title: string; subtitle: string; description: string; color: string }
> = {
  none: {
    icon: 'phone-portrait-outline',
    title: 'Local Only',
    subtitle: 'No upload',
    description: 'Frames & GPS data stay on your device. Export via CSV or GPX share.',
    color: Colors.textSecondary,
  },
  supabase: {
    icon: 'server-outline',
    title: 'Supabase',
    subtitle: 'Free tier · Postgres + Storage',
    description: 'Upload frames to Supabase Storage and log GPS metadata to a Postgres table — queryable from the Supabase dashboard instantly.',
    color: Colors.gpsGreen,
  },
  webhook: {
    icon: 'globe-outline',
    title: 'HTTP Endpoint',
    subtitle: 'Works with AWS S3, R2, n8n, Zapier, any REST API',
    description: 'POST or PUT each frame to any URL. Configure auth, headers, and payload format — JSON or multipart.',
    color: Colors.blue,
  },
};

const HTTP_PRESETS: {
  id: string;
  label: string;
  method: HttpMethod;
  bodyFormat: BodyFormat;
  authType: AuthType;
  help: string;
}[] = [
  {
    id: 'rest-api',
    label: 'My Server',
    method: 'POST',
    bodyFormat: 'json',
    authType: 'bearer',
    help: 'Your server receives a POST with JSON — GPS metadata plus the image as a base64 string. Respond with { "url": "..." } to store a public link.',
  },
  {
    id: 'n8n',
    label: 'n8n / Zapier / Make',
    method: 'POST',
    bodyFormat: 'json',
    authType: 'none',
    help: 'Paste your webhook trigger URL. Each frame arrives as a JSON POST. Use n8n, Zapier, or Make to route it to S3, Google Drive, Notion, Airtable — anywhere.',
  },
  {
    id: 's3-r2',
    label: 'S3 / R2 / GCS',
    method: 'PUT',
    bodyFormat: 'multipart',
    authType: 'none',
    help: 'Set this URL to a backend endpoint that generates a presigned PUT URL for each frame, then returns { "url": "..." }. The app uploads binary directly — no base64 overhead.',
  },
];

const SUPABASE_SQL = `create table frames (
  id uuid default gen_random_uuid() primary key,
  session_id text,
  filename text,
  url text,
  timestamp bigint,
  latitude float8,
  longitude float8,
  segment_name text,
  created_at timestamptz default now()
);`;

export default function StorageWizard({ visible, onClose }: Props) {
  const { config, saveConfig, testConnection } = useStorageConfig();

  const [step, setStep] = useState<Step>('choose');
  const [selectedProvider, setSelectedProvider] = useState<StorageProviderType>(
    config?.provider ?? 'none'
  );

  const [supabaseUrl, setSupabaseUrl] = useState(
    config?.provider === 'supabase' ? config.url : ''
  );
  const [supabaseKey, setSupabaseKey] = useState(
    config?.provider === 'supabase' ? config.anonKey : ''
  );
  const [supabaseBucket, setSupabaseBucket] = useState(
    config?.provider === 'supabase' ? config.bucket : 'gps-frames'
  );
  const [supabaseTable, setSupabaseTable] = useState(
    config?.provider === 'supabase' ? config.table : 'frames'
  );

  const wh = config?.provider === 'webhook' ? (config as StorageConfigWebhook) : null;
  const [httpUrl, setHttpUrl] = useState(wh?.url ?? '');
  const [httpMethod, setHttpMethod] = useState<HttpMethod>(wh?.method ?? 'POST');
  const [httpBodyFormat, setHttpBodyFormat] = useState<BodyFormat>(wh?.bodyFormat ?? 'json');
  const [httpAuthType, setHttpAuthType] = useState<AuthType>(wh?.authType ?? 'none');
  const [httpAuthValue, setHttpAuthValue] = useState(wh?.authValue ?? '');
  const [httpAuthHeader, setHttpAuthHeader] = useState(wh?.authHeader ?? 'x-api-key');
  const [httpAuthUsername, setHttpAuthUsername] = useState(wh?.authUsername ?? '');
  const [httpCustomHeaders, setHttpCustomHeaders] = useState<CustomHeader[]>(
    wh?.customHeaders ?? []
  );
  const [httpPreset, setHttpPreset] = useState('');

  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  const slideAnim = useRef(new Animated.Value(700)).current;

  useEffect(() => {
    if (visible) {
      setStep('choose');
      setSelectedProvider(config?.provider ?? 'none');
      setTestError(null);
      setSqlCopied(false);
      if (config?.provider === 'supabase') {
        setSupabaseUrl(config.url);
        setSupabaseKey(config.anonKey);
        setSupabaseBucket(config.bucket);
        setSupabaseTable(config.table);
      }
      const w = config?.provider === 'webhook' ? (config as StorageConfigWebhook) : null;
      if (w) {
        setHttpUrl(w.url);
        setHttpMethod(w.method ?? 'POST');
        setHttpBodyFormat(w.bodyFormat ?? 'json');
        setHttpAuthType(w.authType ?? 'none');
        setHttpAuthValue(w.authValue ?? '');
        setHttpAuthHeader(w.authHeader ?? 'x-api-key');
        setHttpAuthUsername(w.authUsername ?? '');
        setHttpCustomHeaders(w.customHeaders ?? []);
        setHttpPreset('');
      }
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 68,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 700,
        duration: 240,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  function applyPreset(id: string) {
    setHttpPreset(id);
    const p = HTTP_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setHttpMethod(p.method);
    setHttpBodyFormat(p.bodyFormat);
    setHttpAuthType(p.authType);
    setHttpAuthValue('');
    setHttpAuthHeader('x-api-key');
    setHttpAuthUsername('');
  }

  function buildConfig(): StorageConfig {
    if (selectedProvider === 'supabase') {
      return {
        provider: 'supabase',
        url: supabaseUrl.trim(),
        anonKey: supabaseKey.trim(),
        bucket: supabaseBucket.trim() || 'gps-frames',
        table: supabaseTable.trim() || 'frames',
      } as StorageConfigSupabase;
    }
    if (selectedProvider === 'webhook') {
      const cfg: StorageConfigWebhook = {
        provider: 'webhook',
        url: httpUrl.trim(),
        method: httpMethod,
        bodyFormat: httpBodyFormat,
        authType: httpAuthType,
        customHeaders: httpCustomHeaders.filter((h) => h.key.trim() && h.value.trim()),
      };
      if (httpAuthType === 'bearer') cfg.authValue = httpAuthValue.trim() || undefined;
      if (httpAuthType === 'api-key') {
        cfg.authHeader = httpAuthHeader.trim() || 'x-api-key';
        cfg.authValue = httpAuthValue.trim() || undefined;
      }
      if (httpAuthType === 'basic') {
        cfg.authUsername = httpAuthUsername.trim() || undefined;
        cfg.authValue = httpAuthValue.trim() || undefined;
      }
      return cfg;
    }
    return { provider: 'none' };
  }

  function credentialsValid(): boolean {
    if (selectedProvider === 'supabase') {
      return supabaseUrl.trim().startsWith('http') && supabaseKey.trim().length > 10;
    }
    if (selectedProvider === 'webhook') {
      if (!httpUrl.trim().startsWith('http')) return false;
      if (httpAuthType === 'bearer' && !httpAuthValue.trim()) return false;
      if (httpAuthType === 'api-key' && (!httpAuthHeader.trim() || !httpAuthValue.trim())) return false;
      if (httpAuthType === 'basic' && (!httpAuthUsername.trim() || !httpAuthValue.trim())) return false;
      return true;
    }
    return true;
  }

  async function handleSave() {
    setTestError(null);
    const cfg = buildConfig();

    if (cfg.provider === 'none') {
      await saveConfig(cfg);
      setStep('done');
      return;
    }

    setTesting(true);
    const result = await testConnection(cfg);
    setTesting(false);

    if (!result.ok) {
      setTestError(result.error ?? 'Connection failed. Check your credentials and try again.');
      return;
    }

    await saveConfig(cfg);
    setStep('done');
  }

  function handleChooseNext() {
    if (selectedProvider === 'none') {
      saveConfig({ provider: 'none' });
      setStep('done');
    } else {
      setTestError(null);
      setStep('configure');
    }
  }

  async function handleCopySQL() {
    await Clipboard.setStringAsync(SUPABASE_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={step === 'done' ? onClose : undefined}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <Pressable>
              <BlurView intensity={90} tint="dark" style={styles.sheetInner}>
                {step === 'choose' && (
                  <ChooseStep
                    selected={selectedProvider}
                    onSelect={setSelectedProvider}
                    onNext={handleChooseNext}
                    onClose={onClose}
                  />
                )}
                {step === 'configure' && selectedProvider === 'supabase' && (
                  <SupabaseConfigStep
                    supabaseUrl={supabaseUrl}
                    supabaseKey={supabaseKey}
                    supabaseBucket={supabaseBucket}
                    supabaseTable={supabaseTable}
                    onChangeUrl={setSupabaseUrl}
                    onChangeKey={setSupabaseKey}
                    onChangeBucket={setSupabaseBucket}
                    onChangeTable={setSupabaseTable}
                    onBack={() => setStep('choose')}
                    onSave={handleSave}
                    testing={testing}
                    testError={testError}
                    canSave={credentialsValid()}
                    sqlCopied={sqlCopied}
                    onCopySQL={handleCopySQL}
                  />
                )}
                {step === 'configure' && selectedProvider === 'webhook' && (
                  <HttpConfigStep
                    url={httpUrl}
                    method={httpMethod}
                    bodyFormat={httpBodyFormat}
                    authType={httpAuthType}
                    authValue={httpAuthValue}
                    authHeader={httpAuthHeader}
                    authUsername={httpAuthUsername}
                    customHeaders={httpCustomHeaders}
                    preset={httpPreset}
                    onChangeUrl={setHttpUrl}
                    onChangeMethod={setHttpMethod}
                    onChangeBodyFormat={setHttpBodyFormat}
                    onChangeAuthType={setHttpAuthType}
                    onChangeAuthValue={setHttpAuthValue}
                    onChangeAuthHeader={setHttpAuthHeader}
                    onChangeAuthUsername={setHttpAuthUsername}
                    onChangeCustomHeaders={setHttpCustomHeaders}
                    onApplyPreset={applyPreset}
                    onBack={() => setStep('choose')}
                    onSave={handleSave}
                    testing={testing}
                    testError={testError}
                    canSave={credentialsValid()}
                  />
                )}
                {step === 'done' && (
                  <DoneStep provider={selectedProvider} onClose={onClose} />
                )}
              </BlurView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChooseStep({
  selected,
  onSelect,
  onNext,
  onClose,
}: {
  selected: StorageProviderType;
  onSelect: (p: StorageProviderType) => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const providers: StorageProviderType[] = ['none', 'supabase', 'webhook'];

  return (
    <>
      <SheetHeader title="Cloud Storage Setup" subtitle="Where should frames be uploaded?" onClose={onClose} />
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {providers.map((p) => {
          const info = PROVIDER_INFO[p];
          const isSelected = selected === p;
          return (
            <Pressable
              key={p}
              onPress={() => onSelect(p)}
              style={({ pressed }) => [
                styles.providerCard,
                isSelected && styles.providerCardSelected,
                { borderColor: isSelected ? info.color : Colors.border },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={[styles.providerIconWrap, isSelected && { backgroundColor: `${info.color}22` }]}>
                <Ionicons
                  name={info.icon as never}
                  size={22}
                  color={isSelected ? info.color : Colors.textTertiary}
                />
              </View>
              <View style={styles.providerText}>
                <View style={styles.providerTitleRow}>
                  <Text style={[styles.providerTitle, isSelected && { color: info.color }]}>
                    {info.title}
                  </Text>
                  <Text style={styles.providerSubtitle}>{info.subtitle}</Text>
                </View>
                <Text style={styles.providerDesc}>{info.description}</Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={20} color={info.color} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          onPress={onNext}
        >
          <Text style={styles.primaryBtnText}>
            {selected === 'none' ? 'Use Local Storage' : 'Continue'}
          </Text>
          {selected !== 'none' && (
            <Ionicons name="arrow-forward" size={16} color="#000" />
          )}
        </Pressable>
      </View>
    </>
  );
}

function SupabaseConfigStep({
  supabaseUrl,
  supabaseKey,
  supabaseBucket,
  supabaseTable,
  onChangeUrl,
  onChangeKey,
  onChangeBucket,
  onChangeTable,
  onBack,
  onSave,
  testing,
  testError,
  canSave,
  sqlCopied,
  onCopySQL,
}: {
  supabaseUrl: string;
  supabaseKey: string;
  supabaseBucket: string;
  supabaseTable: string;
  onChangeUrl: (v: string) => void;
  onChangeKey: (v: string) => void;
  onChangeBucket: (v: string) => void;
  onChangeTable: (v: string) => void;
  onBack: () => void;
  onSave: () => void;
  testing: boolean;
  testError: string | null;
  canSave: boolean;
  sqlCopied: boolean;
  onCopySQL: () => void;
}) {
  return (
    <>
      <SheetHeader
        title="Configure Supabase"
        subtitle="Enter your project credentials"
        onClose={onBack}
        closeIcon="arrow-back"
      />
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.setupLink}
          onPress={() => Linking.openURL('https://supabase.com/dashboard')}
        >
          <Ionicons name="open-outline" size={13} color={Colors.blue} />
          <Text style={styles.setupLinkText}>Don't have a project yet? Open Supabase dashboard →</Text>
        </Pressable>

        <Field
          label="Project URL"
          hint="Found in Settings → API"
          placeholder="https://xxxxxxxxxxxx.supabase.co"
          value={supabaseUrl}
          onChangeText={onChangeUrl}
          autoCapitalize="none"
          keyboardType="url"
        />
        <Field
          label="Anon / Public Key"
          hint="Found in Settings → API → Project API keys"
          placeholder="eyJhbGciOiJIUzI1NiIs..."
          value={supabaseKey}
          onChangeText={onChangeKey}
          autoCapitalize="none"
          secureTextEntry
        />
        <Field
          label="Storage Bucket"
          hint="Create a public bucket in Storage → New bucket"
          placeholder="gps-frames"
          value={supabaseBucket}
          onChangeText={onChangeBucket}
          autoCapitalize="none"
        />
        <Field
          label="Database Table"
          hint="Table where GPS metadata rows are inserted"
          placeholder="frames"
          value={supabaseTable}
          onChangeText={onChangeTable}
          autoCapitalize="none"
        />

        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>CREATE TABLE SQL</Text>
          <Pressable onPress={onCopySQL} hitSlop={8}>
            <Text style={[styles.copyBtn, sqlCopied && styles.copyBtnDone]}>
              {sqlCopied ? '✓ Copied' : 'Copy'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.sqlBlock}>
          <Text style={styles.sqlText}>{SUPABASE_SQL}</Text>
        </View>
        <View style={styles.helpCard}>
          <Ionicons name="information-circle-outline" size={15} color={Colors.blue} />
          <Text style={styles.helpText}>
            Run the SQL above in{' '}
            <Text style={styles.helpCode}>SQL Editor → New query</Text>
            {' '}inside your Supabase project to create the table.
          </Text>
        </View>

        {testError != null && <ErrorCard message={testError} />}
      </ScrollView>

      <View style={styles.actions}>
        <SaveButton onPress={onSave} testing={testing} disabled={!canSave} />
      </View>
    </>
  );
}

function HttpConfigStep({
  url,
  method,
  bodyFormat,
  authType,
  authValue,
  authHeader,
  authUsername,
  customHeaders,
  preset,
  onChangeUrl,
  onChangeMethod,
  onChangeBodyFormat,
  onChangeAuthType,
  onChangeAuthValue,
  onChangeAuthHeader,
  onChangeAuthUsername,
  onChangeCustomHeaders,
  onApplyPreset,
  onBack,
  onSave,
  testing,
  testError,
  canSave,
}: {
  url: string;
  method: HttpMethod;
  bodyFormat: BodyFormat;
  authType: AuthType;
  authValue: string;
  authHeader: string;
  authUsername: string;
  customHeaders: CustomHeader[];
  preset: string;
  onChangeUrl: (v: string) => void;
  onChangeMethod: (v: HttpMethod) => void;
  onChangeBodyFormat: (v: BodyFormat) => void;
  onChangeAuthType: (v: AuthType) => void;
  onChangeAuthValue: (v: string) => void;
  onChangeAuthHeader: (v: string) => void;
  onChangeAuthUsername: (v: string) => void;
  onChangeCustomHeaders: (v: CustomHeader[]) => void;
  onApplyPreset: (id: string) => void;
  onBack: () => void;
  onSave: () => void;
  testing: boolean;
  testError: string | null;
  canSave: boolean;
}) {
  const activePreset = HTTP_PRESETS.find((p) => p.id === preset);

  function addHeader() {
    onChangeCustomHeaders([...customHeaders, { key: '', value: '' }]);
  }

  function updateHeader(i: number, field: 'key' | 'value', val: string) {
    const next = [...customHeaders];
    next[i] = { ...next[i], [field]: val };
    onChangeCustomHeaders(next);
  }

  function removeHeader(i: number) {
    onChangeCustomHeaders(customHeaders.filter((_, idx) => idx !== i));
  }

  return (
    <>
      <SheetHeader
        title="HTTP Endpoint"
        subtitle="Configure your upload target"
        onClose={onBack}
        closeIcon="arrow-back"
      />
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>START WITH A PRESET</Text>
        </View>
        <View style={styles.presetRow}>
          {HTTP_PRESETS.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => onApplyPreset(p.id)}
              style={[styles.presetChip, preset === p.id && styles.presetChipActive]}
            >
              <Text style={[styles.presetChipText, preset === p.id && styles.presetChipTextActive]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Field
          label="Endpoint URL"
          placeholder="https://your-server.com/upload"
          value={url}
          onChangeText={onChangeUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>HTTP METHOD</Text>
        </View>
        <SegmentedControl
          options={[
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
          ]}
          value={method}
          onChange={(v) => onChangeMethod(v as HttpMethod)}
        />

        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>BODY FORMAT</Text>
        </View>
        <SegmentedControl
          options={[
            { label: 'JSON (base64)', value: 'json' },
            { label: 'Multipart (binary)', value: 'multipart' },
          ]}
          value={bodyFormat}
          onChange={(v) => onChangeBodyFormat(v as BodyFormat)}
        />

        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>AUTHENTICATION</Text>
        </View>
        <View style={styles.authChips}>
          {(['none', 'bearer', 'api-key', 'basic'] as AuthType[]).map((a) => (
            <Pressable
              key={a}
              onPress={() => onChangeAuthType(a)}
              style={[styles.authChip, authType === a && styles.authChipActive]}
            >
              <Text style={[styles.authChipText, authType === a && styles.authChipTextActive]}>
                {a === 'none' ? 'None' : a === 'bearer' ? 'Bearer Token' : a === 'api-key' ? 'API Key' : 'Basic Auth'}
              </Text>
            </Pressable>
          ))}
        </View>

        {authType === 'bearer' && (
          <Field
            label="Bearer Token"
            placeholder="your-token"
            value={authValue}
            onChangeText={onChangeAuthValue}
            autoCapitalize="none"
            secureTextEntry
          />
        )}
        {authType === 'api-key' && (
          <>
            <Field
              label="Header Name"
              placeholder="x-api-key"
              value={authHeader}
              onChangeText={onChangeAuthHeader}
              autoCapitalize="none"
            />
            <Field
              label="API Key Value"
              placeholder="your-api-key"
              value={authValue}
              onChangeText={onChangeAuthValue}
              autoCapitalize="none"
              secureTextEntry
            />
          </>
        )}
        {authType === 'basic' && (
          <>
            <Field
              label="Username"
              placeholder="username"
              value={authUsername}
              onChangeText={onChangeAuthUsername}
              autoCapitalize="none"
            />
            <Field
              label="Password"
              placeholder="password"
              value={authValue}
              onChangeText={onChangeAuthValue}
              autoCapitalize="none"
              secureTextEntry
            />
          </>
        )}

        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>CUSTOM HEADERS</Text>
          <Pressable onPress={addHeader} hitSlop={8}>
            <Text style={styles.addHeaderBtn}>+ Add header</Text>
          </Pressable>
        </View>
        {customHeaders.map((h, i) => (
          <View key={i} style={styles.headerRow}>
            <TextInput
              style={[styles.fieldInput, styles.headerKey]}
              placeholder="Header name"
              placeholderTextColor={Colors.textTertiary}
              value={h.key}
              onChangeText={(v) => updateHeader(i, 'key', v)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardAppearance="dark"
            />
            <TextInput
              style={[styles.fieldInput, styles.headerValue]}
              placeholder="Value"
              placeholderTextColor={Colors.textTertiary}
              value={h.value}
              onChangeText={(v) => updateHeader(i, 'value', v)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardAppearance="dark"
            />
            <Pressable onPress={() => removeHeader(i)} hitSlop={10} style={styles.headerRemove}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </Pressable>
          </View>
        ))}
        {customHeaders.length === 0 && (
          <Text style={styles.emptyHint}>No custom headers — tap "+ Add header" above if needed.</Text>
        )}

        {activePreset && (
          <View style={styles.helpCard}>
            <Ionicons name="information-circle-outline" size={15} color={Colors.blue} />
            <Text style={styles.helpText}>{activePreset.help}</Text>
          </View>
        )}
        {!activePreset && (
          <View style={styles.helpCard}>
            <Ionicons name="information-circle-outline" size={15} color={Colors.blue} />
            <Text style={styles.helpText}>
              <Text style={styles.helpCode}>JSON</Text> sends GPS metadata + image as base64.{' '}
              <Text style={styles.helpCode}>Multipart</Text> sends binary — better for large images and direct-to-bucket uploads.
              Respond with <Text style={styles.helpCode}>{'{ "url": "..." }'}</Text> to store a public link.
            </Text>
          </View>
        )}

        {testError != null && <ErrorCard message={testError} />}
      </ScrollView>

      <View style={styles.actions}>
        <SaveButton onPress={onSave} testing={testing} disabled={!canSave} />
      </View>
    </>
  );
}

function DoneStep({
  provider,
  onClose,
}: {
  provider: StorageProviderType;
  onClose: () => void;
}) {
  const info = PROVIDER_INFO[provider];
  const isLocal = provider === 'none';

  return (
    <>
      <View style={styles.doneBody}>
        <View style={[styles.doneIcon, { backgroundColor: `${info.color}22` }]}>
          <Ionicons
            name={isLocal ? 'checkmark-circle' : 'cloud-done-outline'}
            size={40}
            color={info.color}
          />
        </View>
        <Text style={styles.doneTitle}>
          {isLocal ? 'Local Storage Active' : `${info.title} Connected`}
        </Text>
        <Text style={styles.doneDesc}>
          {isLocal
            ? 'Frames are saved on your device. Your CSV log acts as the session database.'
            : `Frames will be uploaded to ${info.title} after each session. You can change this any time in Settings.`}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          onPress={onClose}
        >
          <Text style={styles.primaryBtnText}>Done</Text>
        </Pressable>
      </View>
    </>
  );
}

function SheetHeader({
  title,
  subtitle,
  onClose,
  closeIcon = 'close',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  closeIcon?: string;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
        <Ionicons name={closeIcon as never} size={22} color={Colors.textSecondary} />
      </Pressable>
    </View>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[styles.segmentOption, value === o.value && styles.segmentOptionActive]}
        >
          <Text style={[styles.segmentText, value === o.value && styles.segmentTextActive]}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Field({
  label,
  hint,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
}: {
  label: string;
  hint?: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'url' | 'email-address';
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      </View>
      <TextInput
        style={styles.fieldInput}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
        spellCheck={false}
        keyboardType={keyboardType ?? 'default'}
        keyboardAppearance="dark"
        returnKeyType="next"
      />
    </View>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <View style={styles.errorCard}>
      <Ionicons name="close-circle-outline" size={16} color={Colors.accent} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function SaveButton({
  onPress,
  testing,
  disabled,
}: {
  onPress: () => void;
  testing: boolean;
  disabled: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primaryBtn,
        (disabled || testing) && styles.primaryBtnDisabled,
        pressed && !disabled && !testing && { opacity: 0.85 },
      ]}
      onPress={onPress}
      disabled={disabled || testing}
    >
      {testing ? (
        <>
          <ActivityIndicator size="small" color="#000" />
          <Text style={styles.primaryBtnText}>Testing connection…</Text>
        </>
      ) : (
        <Text style={styles.primaryBtnText}>Test & Save</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    maxHeight: '92%',
  },
  sheetInner: {
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  headerTitle: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  closeBtn: {
    padding: 2,
    marginTop: 2,
  },
  scrollBody: {
    maxHeight: 500,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
  },
  providerCardSelected: {
    backgroundColor: 'rgba(10,132,255,0.06)',
  },
  providerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  providerText: {
    flex: 1,
    gap: 4,
  },
  providerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  providerTitle: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  providerSubtitle: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  providerDesc: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  setupLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  setupLinkText: {
    color: Colors.blue,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: -2,
  },
  sectionLabelText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  copyBtn: {
    color: Colors.blue,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  copyBtnDone: {
    color: Colors.gpsGreen,
  },
  sqlBlock: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  sqlText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 18,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  presetChipActive: {
    borderColor: Colors.blue,
    backgroundColor: 'rgba(10,132,255,0.12)',
  },
  presetChipText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  presetChipTextActive: {
    color: Colors.blue,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  segmentOption: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  segmentOptionActive: {
    backgroundColor: 'rgba(10,132,255,0.18)',
  },
  segmentText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  segmentTextActive: {
    color: Colors.blue,
  },
  authChips: {
    flexDirection: 'row',
    gap: 7,
    flexWrap: 'wrap',
  },
  authChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  authChipActive: {
    borderColor: Colors.blue,
    backgroundColor: 'rgba(10,132,255,0.12)',
  },
  authChipText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  authChipTextActive: {
    color: Colors.blue,
  },
  addHeaderBtn: {
    color: Colors.blue,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  headerKey: {
    flex: 2,
  },
  headerValue: {
    flex: 3,
  },
  headerRemove: {
    padding: 2,
  },
  emptyHint: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 2,
  },
  field: {
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 2,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  fieldHint: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  fieldInput: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  helpCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(10,132,255,0.07)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.18)',
    padding: 12,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  helpText: {
    flex: 1,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  helpCode: {
    fontFamily: 'Inter_500Medium',
    color: Colors.blue,
  },
  errorCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,69,58,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.25)',
    padding: 12,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  errorText: {
    flex: 1,
    color: Colors.accent,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  doneBody: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 28,
    gap: 12,
  },
  doneIcon: {
    width: 76,
    height: 76,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  doneTitle: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    textAlign: 'center',
  },
  doneDesc: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.gpsGreen,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    color: '#000',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
});
