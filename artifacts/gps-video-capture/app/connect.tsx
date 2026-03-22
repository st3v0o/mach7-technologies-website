import { Image, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const EXPO_URL = 'exp://9815bcbe-9608-4faf-9115-f3e74e40fc22-00-3opqmqomuutt9.expo.worf.replit.dev';
const QR_API = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(EXPO_URL)}`;

export default function ConnectScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Connect Expo Go</Text>
      <Text style={styles.subtitle}>Open your iPhone Camera app and scan this QR code</Text>

      <View style={styles.qrBox}>
        <Image source={{ uri: QR_API }} style={styles.qr} resizeMode="contain" />
      </View>

      <Text style={styles.orText}>— or enter this URL manually in Expo Go —</Text>

      <View style={styles.urlBox}>
        <Text style={styles.urlText} selectable>{EXPO_URL}</Text>
      </View>

      <Text style={styles.steps}>
        {'1. Open the Camera app on your iPhone\n2. Point it at the QR code above\n3. Tap the notification to open in Expo Go\n\nMake sure Expo Go is installed from the App Store.'}
      </Text>

      {Platform.OS === 'web' && (
        <TouchableOpacity style={styles.button} onPress={() => Linking.openURL(EXPO_URL)}>
          <Text style={styles.buttonText}>Open on this device</Text>
        </TouchableOpacity>
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
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
