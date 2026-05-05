import { useTranslation } from 'react-i18next';
import { Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

const expoDomain = process.env.EXPO_PUBLIC_EXPO_DEV_DOMAIN ?? '';
const EXPO_URL = expoDomain
  ? `exp://${expoDomain}`
  : 'exp://<dev-domain> — restart the app server to see the real URL';
const QR_API = expoDomain
  ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(`exp://${expoDomain}`)}`
  : null;

export default function ConnectScreen() {
  const { t } = useTranslation();
  if (!__DEV__ && Platform.OS !== 'web') return null;
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('connect.title')}</Text>
      <Text style={styles.subtitle}>{t('connect.subtitle')}</Text>

      <View style={styles.qrBox}>
        {QR_API ? (
          <Image source={{ uri: QR_API }} style={styles.qr} resizeMode="contain" />
        ) : (
          <View style={[styles.qr, styles.qrPlaceholder]}>
            <Text style={styles.qrPlaceholderText}>{t('connect.qrUnavailable')}</Text>
          </View>
        )}
      </View>

      <Text style={styles.orText}>{t('connect.or')}</Text>

      <View style={styles.urlBox}>
        <Text style={styles.urlText} selectable>{EXPO_URL}</Text>
      </View>

      <Text style={styles.steps}>{t('connect.steps')}</Text>

      {Platform.OS !== 'ios' && Platform.OS !== 'android' && (
        <Text style={styles.webNote}>{t('connect.webNote')}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  content: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 32,
  },
  qrBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 28,
    shadowColor: '#ff3b30',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  qr: {
    width: 280,
    height: 280,
  },
  qrPlaceholder: {
    backgroundColor: '#eeeeee',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  qrPlaceholderText: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  orText: {
    fontSize: 13,
    color: '#555555',
    marginBottom: 12,
  },
  urlBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 28,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333333',
  },
  urlText: {
    fontSize: 12,
    color: '#ff3b30',
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: 18,
  },
  steps: {
    fontSize: 14,
    color: '#777777',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  webNote: {
    fontSize: 13,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
