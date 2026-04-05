/**
 * JS bridge to the native Insta360CameraModule.
 *
 * Uses Expo Modules API's `requireOptionalNativeModule` which:
 *  - Returns the native module instance when running on a physical iOS device
 *    with the Insta360 Open SDK linked (binary must be present at build time).
 *  - Returns null on simulators, web, Android, or when the SDK binary is absent.
 *
 * SDK_BINARY_REQUIRED: the Swift side only compiles once INSCameraSDK.xcframework
 * is present.  See docs/ManualVendorSDKHookupSteps.md for drop-in steps.
 */

import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { Insta360TelemetryEvent } from './index';

export interface Insta360NativeModule {
  discoverDevices(): Promise<Array<{
    id: string;
    name: string;
    model?: string;
    firmwareVersion?: string;
    batteryLevel?: number;
    signalStrength?: number;
  }>>;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  startPreview(): Promise<void>;
  stopPreview(): Promise<void>;
  startRecording(config: { resolution?: string; frameRate?: number }): Promise<void>;
  stopRecording(): Promise<string>;
  listMedia(): Promise<Array<{
    id: string;
    filename: string;
    mimeType: string;
    size?: number;
    createdAt?: number;
  }>>;
  importMedia(mediaId: string, destinationPath: string): Promise<string>;
}

const noopModule: Insta360NativeModule = {
  discoverDevices: async () => [],
  connect: async () => {},
  disconnect: async () => {},
  startPreview: async () => {},
  stopPreview: async () => {},
  startRecording: async () => {},
  stopRecording: async () => '',
  listMedia: async () => [],
  importMedia: async (_mediaId, destinationPath) => destinationPath,
};

// 'Insta360Camera' matches Name("Insta360Camera") in the Swift module.
const nativeModule = requireOptionalNativeModule<Insta360NativeModule>('Insta360Camera');

export const native: Insta360NativeModule = nativeModule ?? noopModule;

/** True when the Insta360 native module is linked (SDK binary present). */
export const isNativeModuleAvailable: boolean = nativeModule !== null;

// ── Event subscription ────────────────────────────────────────────────────────
// NativeEventEmitter works with both old and new React Native architectures.
// On web/Android (or when the module is absent) we fall back gracefully.
const _nativeEventEmitter: NativeEventEmitter | null = (() => {
  if (Platform.OS !== 'ios' || !nativeModule) return null;
  // Bridge the Expo module instance through NativeModules for NativeEventEmitter.
  // NativeModules['Insta360Camera'] is populated by Expo's auto-linking.
  const bridgedModule = NativeModules['Insta360Camera'] ?? nativeModule;
  try {
    return new NativeEventEmitter(bridgedModule as ConstructorParameters<typeof NativeEventEmitter>[0]);
  } catch {
    return null;
  }
})();

/**
 * Subscribe to Insta360 camera telemetry events (GPS, battery).
 * Returns an unsubscribe function.  Safe to call when the SDK is not linked
 * (returns a noop unsubscribe immediately).
 */
export function addTelemetryListener(
  callback: (event: Insta360TelemetryEvent) => void,
): () => void {
  if (!_nativeEventEmitter) return () => {};
  const sub = _nativeEventEmitter.addListener('onTelemetry', callback);
  return () => sub.remove();
}
