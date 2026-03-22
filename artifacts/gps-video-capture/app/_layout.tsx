import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { UploadProvider, useUpload } from '@/contexts/UploadContext';
import { RecordingProvider, useRecording } from '@/contexts/RecordingContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function UploadConnector() {
  const { logEntries, sessionId } = useRecording();
  const { enqueueFrames } = useUpload();
  const enqueuedIds = useRef(new Set<string>());

  useEffect(() => {
    if (!sessionId) return;
    const newEntries = logEntries.filter((e) => !enqueuedIds.current.has(e.id));
    if (newEntries.length > 0) {
      newEntries.forEach((e) => enqueuedIds.current.add(e.id));
      enqueueFrames(newEntries, sessionId);
    }
  }, [logEntries, sessionId, enqueueFrames]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <UploadProvider>
            <RecordingProvider>
              <UploadConnector />
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </RecordingProvider>
          </UploadProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
