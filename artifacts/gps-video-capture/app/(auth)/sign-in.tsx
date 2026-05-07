import React, { useCallback, useEffect, useState } from 'react';
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
import { useSignIn, useSSO } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { type Href, useRouter, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [ssoLoading, setSsoLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    WebBrowser.warmUpAsync();
    return () => { WebBrowser.coolDownAsync(); };
  }, []);

  const handleEmailSignIn = async () => {
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) {
      console.error(JSON.stringify(error, null, 2));
      return;
    }

    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session.currentTask);
            return;
          }
          const url = decorateUrl('/');
          if (url.startsWith('http')) {
            return;
          }
          router.push(url as Href);
        },
      });
    } else if (signIn.status === 'needs_client_trust') {
      const emailCodeFactor = signIn.supportedSecondFactors.find(
        (f) => f.strategy === 'email_code',
      );
      if (emailCodeFactor) {
        await signIn.mfa.sendEmailCode();
      }
    } else if (signIn.status === 'needs_second_factor') {
      // MFA — not yet handled
      console.log('MFA required:', signIn.status);
    }
  };

  const handleVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code: verifyCode });
    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session.currentTask);
            return;
          }
          const url = decorateUrl('/');
          if (!url.startsWith('http')) {
            router.push(url as Href);
          }
        },
      });
    }
  };

  const handleGoogle = useCallback(async () => {
    try {
      setSsoLoading(true);
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId) {
        await setActive!({
          session: createdSessionId,
          navigate: async ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              console.log(session.currentTask);
              return;
            }
            router.push(decorateUrl('/') as Href);
          },
        });
      }
    } catch (e) {
      console.error('Google SSO error:', JSON.stringify(e, null, 2));
    } finally {
      setSsoLoading(false);
    }
  }, [startSSOFlow, router]);

  const isLoading = fetchStatus === 'fetching' || ssoLoading;

  if (signIn.status === 'needs_client_trust') {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.title}>Verify your account</Text>
        <TextInput
          style={styles.input}
          value={verifyCode}
          placeholder="Enter verification code"
          placeholderTextColor="#64748b"
          onChangeText={setVerifyCode}
          keyboardType="numeric"
          autoFocus
        />
        {errors.fields.code && <Text style={styles.error}>{errors.fields.code.message}</Text>}
        <Pressable
          style={[styles.primaryBtn, isLoading && styles.disabled]}
          onPress={handleVerify}
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify</Text>}
        </Pressable>
        <Pressable onPress={() => signIn.mfa.sendEmailCode()}>
          <Text style={styles.link}>Resend code</Text>
        </Pressable>
        <Pressable onPress={() => signIn.reset()}>
          <Text style={[styles.link, { color: '#64748b' }]}>Start over</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Sign in to Geospector</Text>
        <Text style={styles.subtitle}>Access your Atlas maps on any device</Text>

        <Pressable
          style={[styles.socialBtn, ssoLoading && styles.disabled]}
          onPress={handleGoogle}
          disabled={isLoading}
        >
          {ssoLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.socialBtnText}>Continue with Google</Text>}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
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
        {errors.fields.identifier && <Text style={styles.error}>{errors.fields.identifier.message}</Text>}

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          placeholderTextColor="#64748b"
          secureTextEntry
        />
        {errors.fields.password && <Text style={styles.error}>{errors.fields.password.message}</Text>}

        <Pressable
          style={[styles.primaryBtn, (isLoading || !email || !password) && styles.disabled]}
          onPress={handleEmailSignIn}
          disabled={isLoading || !email || !password}
        >
          {fetchStatus === 'fetching'
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryBtnText}>Sign in</Text>}
        </Pressable>

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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
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
  socialBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  socialBtnText: { color: '#e2e8f0', fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1e293b' },
  dividerText: { color: '#64748b', fontSize: 13 },
  error: { color: '#ef4444', fontSize: 12, marginTop: -4 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  footerText: { color: '#94a3b8', fontSize: 14 },
  link: { color: '#3b82f6', fontSize: 14, fontWeight: '500' },
});
