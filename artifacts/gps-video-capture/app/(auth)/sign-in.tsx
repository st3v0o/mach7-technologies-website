import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '@/lib/supabaseClient';

WebBrowser.maybeCompleteAuthSession();

type Tab = 'password' | 'magic-link';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    WebBrowser.warmUpAsync();
    return () => { WebBrowser.coolDownAsync(); };
  }, []);

  async function handlePasswordSignIn() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) { setError(error.message); return; }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
      if (error) { setError(error.message); return; }
      setMagicLinkSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send link');
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setError(null);
    setOauthLoading(provider);
    try {
      const redirectUrl = AuthSession.makeRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });
      if (error) { setError(error.message); return; }
      if (!data.url) return;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success' && result.url) {
        // Supabase returns tokens in the URL fragment (#access_token=...&refresh_token=...)
        const fragment = result.url.split('#')[1] ?? '';
        const params = Object.fromEntries(new URLSearchParams(fragment));
        const accessToken = params['access_token'];
        const refreshToken = params['refresh_token'];
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          router.back();
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : `${provider} sign-in failed`);
    } finally {
      setOauthLoading(null);
    }
  }

  if (magicLinkSent) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a sign-in link to {email}. Tap it to sign in — no password needed.
        </Text>
        <Pressable onPress={() => setMagicLinkSent(false)} style={{ marginTop: 12 }}>
          <Text style={styles.link}>Try a different email</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 8 }}>
          <Text style={[styles.link, { color: '#64748b' }]}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Sign in to Geospector</Text>
        <Text style={styles.subtitle}>Access your Atlas maps on any device</Text>

        {/* OAuth buttons */}
        <Pressable
          style={[styles.oauthBtn, (!!oauthLoading || loading) && styles.disabled]}
          onPress={() => handleOAuth('google')}
          disabled={!!oauthLoading || loading}
        >
          {oauthLoading === 'google' ? (
            <ActivityIndicator color="#e2e8f0" size="small" />
          ) : (
            <Text style={styles.oauthBtnText}>Continue with Google</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.oauthBtn, styles.appleBtn, (!!oauthLoading || loading) && styles.disabled]}
          onPress={() => handleOAuth('apple')}
          disabled={!!oauthLoading || loading}
        >
          {oauthLoading === 'apple' ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={[styles.oauthBtnText, styles.appleBtnText]}>Continue with Apple</Text>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, tab === 'password' && styles.tabActive]}
            onPress={() => { setTab('password'); setError(null); }}
          >
            <Text style={[styles.tabText, tab === 'password' && styles.tabTextActive]}>Password</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'magic-link' && styles.tabActive]}
            onPress={() => { setTab('magic-link'); setError(null); }}
          >
            <Text style={[styles.tabText, tab === 'magic-link' && styles.tabTextActive]}>Magic link</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#64748b"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {tab === 'password' && (
          <>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor="#64748b"
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handlePasswordSignIn}
            />
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        {tab === 'password' ? (
          <Pressable
            style={[styles.primaryBtn, (loading || !email.trim() || !password) && styles.disabled]}
            onPress={handlePasswordSignIn}
            disabled={loading || !email.trim() || !password}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign in</Text>}
          </Pressable>
        ) : (
          <Pressable
            style={[styles.primaryBtn, (loading || !email.trim()) && styles.disabled]}
            onPress={handleMagicLink}
            disabled={loading || !email.trim()}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send magic link</Text>}
          </Pressable>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable><Text style={styles.link}>Sign up</Text></Pressable>
          </Link>
        </View>

        <Pressable onPress={() => router.back()} style={{ marginTop: 8 }}>
          <Text style={[styles.link, { color: '#64748b', textAlign: 'center' }]}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 24,
    gap: 12,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#f8fafc', marginBottom: 2, marginTop: 8 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 8 },
  oauthBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  appleBtn: { backgroundColor: '#fff', borderColor: '#fff' },
  oauthBtnText: { color: '#e2e8f0', fontWeight: '600', fontSize: 15 },
  appleBtnText: { color: '#000' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1e293b' },
  dividerText: { color: '#64748b', fontSize: 12 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 4,
    gap: 4,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#1e293b' },
  tabText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#f8fafc' },
  label: { fontSize: 13, color: '#cbd5e1', fontWeight: '500' },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#f8fafc',
  },
  primaryBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.5 },
  error: { color: '#ef4444', fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  footerText: { color: '#94a3b8', fontSize: 14 },
  link: { color: '#3b82f6', fontSize: 14, fontWeight: '500', textAlign: 'center', marginTop: 4 },
});
