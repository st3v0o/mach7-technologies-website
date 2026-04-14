import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import {
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

const CONFIG_STORAGE_KEY = '@gps_storage_config';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type ProviderType = 'none' | 'supabase' | 'webhook';

export default function StorageWizard({ visible, onClose }: Props) {
  const [step, setStep] = useState<'choose' | 'supabase' | 'webhook'>('choose');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseBucket, setSupabaseBucket] = useState('frames');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setStep('choose');
    onClose();
  };

  const saveConfig = async (providerType: ProviderType) => {
    setSaving(true);
    try {
      const config =
        providerType === 'supabase'
          ? { providerType, supabaseUrl, supabaseKey, supabaseBucket }
          : providerType === 'webhook'
          ? { providerType, webhookUrl, webhookSecret }
          : { providerType: 'none' as const };
      await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {}
    setSaving(false);
    handleClose();
  };

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

              <Pressable style={[styles.choiceBtn, styles.choiceBtnNone]} onPress={() => saveConfig('none')}>
                <Ionicons name="phone-portrait-outline" size={24} color={Colors.textSecondary} />
                <View style={styles.choiceText}>
                  <Text style={styles.choiceName}>Local Only</Text>
                  <Text style={styles.choiceDesc}>Keep frames on device only</Text>
                </View>
              </Pressable>
            </View>
          )}

          {step === 'supabase' && (
            <View style={styles.form}>
              <Text style={styles.subtitle}>Enter your Supabase project credentials.</Text>
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
                <Pressable style={styles.backBtn} onPress={() => setStep('choose')}>
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, (!supabaseUrl || !supabaseKey || !supabaseBucket) && styles.saveBtnDisabled]}
                  disabled={!supabaseUrl || !supabaseKey || !supabaseBucket || saving}
                  onPress={() => saveConfig('supabase')}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {step === 'webhook' && (
            <View style={styles.form}>
              <Text style={styles.subtitle}>Enter your webhook endpoint URL.</Text>
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
                <Pressable style={styles.backBtn} onPress={() => setStep('choose')}>
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, !webhookUrl && styles.saveBtnDisabled]}
                  disabled={!webhookUrl || saving}
                  onPress={() => saveConfig('webhook')}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
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
  form: { gap: 12 },
  fieldLabel: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 8,
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
  formActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
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
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.blue,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
