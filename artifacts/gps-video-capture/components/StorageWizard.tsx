import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
  { icon: string; title: string; description: string; color: string }
> = {
  none: {
    icon: 'phone-portrait-outline',
    title: 'Local Only',
    description: 'Frames & GPS saved on device. CSV spreadsheet acts as your database.',
    color: Colors.textSecondary,
  },
  supabase: {
    icon: 'server-outline',
    title: 'Supabase',
    description: 'Upload to your own Supabase project — storage bucket + database table.',
    color: Colors.gpsGreen,
  },
  webhook: {
    icon: 'link-outline',
    title: 'Custom Webhook',
    description: 'POST each frame to any REST endpoint — your own server, Firebase, R2, etc.',
    color: Colors.blue,
  },
};

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

  const [webhookUrl, setWebhookUrl] = useState(
    config?.provider === 'webhook' ? config.url : ''
  );
  const [webhookToken, setWebhookToken] = useState(
    config?.provider === 'webhook' ? (config.bearerToken ?? '') : ''
  );

  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(700)).current;

  useEffect(() => {
    if (visible) {
      setStep('choose');
      setSelectedProvider(config?.provider ?? 'none');
      setTestError(null);
      if (config?.provider === 'supabase') {
        setSupabaseUrl(config.url);
        setSupabaseKey(config.anonKey);
        setSupabaseBucket(config.bucket);
        setSupabaseTable(config.table);
      }
      if (config?.provider === 'webhook') {
        setWebhookUrl(config.url);
        setWebhookToken(config.bearerToken ?? '');
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
      return {
        provider: 'webhook',
        url: webhookUrl.trim(),
        bearerToken: webhookToken.trim() || undefined,
      } as StorageConfigWebhook;
    }
    return { provider: 'none' };
  }

  function credentialsValid(): boolean {
    if (selectedProvider === 'supabase') {
      return supabaseUrl.trim().startsWith('http') && supabaseKey.trim().length > 10;
    }
    if (selectedProvider === 'webhook') {
      return webhookUrl.trim().startsWith('http');
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
                {step === 'configure' && (
                  <ConfigureStep
                    provider={selectedProvider}
                    supabaseUrl={supabaseUrl}
                    supabaseKey={supabaseKey}
                    supabaseBucket={supabaseBucket}
                    supabaseTable={supabaseTable}
                    webhookUrl={webhookUrl}
                    webhookToken={webhookToken}
                    onChangeSupabaseUrl={setSupabaseUrl}
                    onChangeSupabaseKey={setSupabaseKey}
                    onChangeSupabaseBucket={setSupabaseBucket}
                    onChangeSupabaseTable={setSupabaseTable}
                    onChangeWebhookUrl={setWebhookUrl}
                    onChangeWebhookToken={setWebhookToken}
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
                <Text style={[styles.providerTitle, isSelected && { color: info.color }]}>
                  {info.title}
                </Text>
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

function ConfigureStep({
  provider,
  supabaseUrl,
  supabaseKey,
  supabaseBucket,
  supabaseTable,
  webhookUrl,
  webhookToken,
  onChangeSupabaseUrl,
  onChangeSupabaseKey,
  onChangeSupabaseBucket,
  onChangeSupabaseTable,
  onChangeWebhookUrl,
  onChangeWebhookToken,
  onBack,
  onSave,
  testing,
  testError,
  canSave,
}: {
  provider: StorageProviderType;
  supabaseUrl: string;
  supabaseKey: string;
  supabaseBucket: string;
  supabaseTable: string;
  webhookUrl: string;
  webhookToken: string;
  onChangeSupabaseUrl: (v: string) => void;
  onChangeSupabaseKey: (v: string) => void;
  onChangeSupabaseBucket: (v: string) => void;
  onChangeSupabaseTable: (v: string) => void;
  onChangeWebhookUrl: (v: string) => void;
  onChangeWebhookToken: (v: string) => void;
  onBack: () => void;
  onSave: () => void;
  testing: boolean;
  testError: string | null;
  canSave: boolean;
}) {
  const info = PROVIDER_INFO[provider];

  return (
    <>
      <SheetHeader
        title={`Configure ${info.title}`}
        subtitle="Enter your credentials below"
        onClose={onBack}
        closeIcon="arrow-back"
      />
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {provider === 'supabase' && (
          <>
            <Field
              label="Project URL"
              placeholder="https://xxxx.supabase.co"
              value={supabaseUrl}
              onChangeText={onChangeSupabaseUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Field
              label="Anon / Public Key"
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              value={supabaseKey}
              onChangeText={onChangeSupabaseKey}
              autoCapitalize="none"
              secureTextEntry
            />
            <Field
              label="Storage Bucket"
              placeholder="gps-frames"
              value={supabaseBucket}
              onChangeText={onChangeSupabaseBucket}
              autoCapitalize="none"
            />
            <Field
              label="Database Table"
              placeholder="frames"
              value={supabaseTable}
              onChangeText={onChangeSupabaseTable}
              autoCapitalize="none"
            />
            <View style={styles.helpCard}>
              <Ionicons name="information-circle-outline" size={15} color={Colors.blue} />
              <Text style={styles.helpText}>
                Create a public storage bucket and a{' '}
                <Text style={styles.helpCode}>frames</Text> table with columns:{' '}
                <Text style={styles.helpCode}>session_id, filename, url, timestamp, latitude, longitude, segment_name</Text>.
              </Text>
            </View>
          </>
        )}

        {provider === 'webhook' && (
          <>
            <Field
              label="Endpoint URL"
              placeholder="https://your-server.com/frames"
              value={webhookUrl}
              onChangeText={onChangeWebhookUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Field
              label="Bearer Token (optional)"
              placeholder="Leave blank if not required"
              value={webhookToken}
              onChangeText={onChangeWebhookToken}
              autoCapitalize="none"
              secureTextEntry
            />
            <View style={styles.helpCard}>
              <Ionicons name="information-circle-outline" size={15} color={Colors.blue} />
              <Text style={styles.helpText}>
                Your server will receive a POST with JSON body:{' '}
                <Text style={styles.helpCode}>
                  {'{ session_id, filename, timestamp, latitude, longitude, segment_name, image_base64 }'}
                </Text>
                . Respond with{' '}
                <Text style={styles.helpCode}>{'{ "url": "..." }'}</Text> to store a public link.
              </Text>
            </View>
          </>
        )}

        {testError != null && (
          <View style={styles.errorCard}>
            <Ionicons name="close-circle-outline" size={16} color={Colors.accent} />
            <Text style={styles.errorText}>{testError}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            (!canSave || testing) && styles.primaryBtnDisabled,
            pressed && canSave && !testing && { opacity: 0.85 },
          ]}
          onPress={onSave}
          disabled={!canSave || testing}
        >
          {testing ? (
            <>
              <ActivityIndicator size="small" color="#000" />
              <Text style={styles.primaryBtnText}>Testing…</Text>
            </>
          ) : (
            <Text style={styles.primaryBtnText}>Test & Save</Text>
          )}
        </Pressable>
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

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'url' | 'email-address';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
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
    maxHeight: '90%',
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
    maxHeight: 440,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
  },
  providerCardSelected: {
    borderColor: Colors.blue,
    backgroundColor: 'rgba(10,132,255,0.06)',
  },
  providerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerText: {
    flex: 1,
    gap: 3,
  },
  providerTitle: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  providerDesc: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  field: {
    gap: 7,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.4,
    marginLeft: 2,
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
