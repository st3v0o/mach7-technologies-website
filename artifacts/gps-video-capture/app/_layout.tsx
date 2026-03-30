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
import { DetectionProvider } from '@/contexts/DetectionContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { UploadProvider, useUpload } from '@/contexts/UploadContext';
import { RecordingProvider, useRecording } from '@/contexts/RecordingContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function UploadConnector() {
  const { logEntries } = useRecording();
  const { enqueueFrames, clearQueue, queueLoaded } = useUpload();
  const enqueuedIds = useRef(new Set<string>());
  const prevLengthRef = useRef(logEntries.length);

  useEffect(() => {
    if (!queueLoaded) return;

    if (logEntries.length === 0 && prevLengthRef.current > 0) {
      enqueuedIds.current.clear();
      clearQueue();
    }
    prevLengthRef.current = logEntries.length;

    const newEntries = logEntries.filter((e) => e.sessionId && !enqueuedIds.current.has(e.id));
    if (newEntries.length > 0) {
      newEntries.forEach((e) => enqueuedIds.current.add(e.id));
      enqueueFrames(newEntries);
    }
  }, [logEntries, enqueueFrames, clearQueue, queueLoaded]);

  return null;
}

function UploadSyncConnector() {
  const { queue } = useUpload();
  const { updateFrameUrl } = useRecording();
  const syncedIds = useRef(new Set<string>());

  useEffect(() => {
    for (const item of queue) {
      if (item.status === 'uploaded' && item.supabaseUrl && !syncedIds.current.has(item.id)) {
        syncedIds.current.add(item.id);
        updateFrameUrl(item.id, item.supabaseUrl);
      }
    }
  }, [queue, updateFrameUrl]);

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
          <SettingsProvider>
            <DetectionProvider>
              <UploadProvider>
                <RecordingProvider>
                  <UploadConnector />
                  <UploadSyncConnector />
                  <GestureHandlerRootView>
                    <KeyboardProvider>
                      <RootLayoutNav />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </RecordingProvider>
              </UploadProvider>
            </DetectionProvider>
          </SettingsProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
