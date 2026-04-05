/**
 * JS bridge to the native UvcCaptureModule.
 * Loads the native module when available; falls back to no-ops on web / simulator.
 */

import { NativeModules, Platform } from 'react-native';

interface UvcCaptureNativeModule {
  discoverDevices(): Promise<Array<{ id: string; name: string; modelID?: string }>>;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  startPreview(viewTag: number): Promise<void>;
  stopPreview(): Promise<void>;
  startRecording(destinationPath: string): Promise<void>;
  stopRecording(): Promise<string>;
}

const noopModule: UvcCaptureNativeModule = {
  discoverDevices: async () => [],
  connect: async () => {},
  disconnect: async () => {},
  startPreview: async () => {},
  stopPreview: async () => {},
  startRecording: async () => {},
  stopRecording: async () => '',
};

// On iOS the native module is auto-linked by Expo Modules / Podfile.
// On other platforms or simulators it may not exist; use the noop.
const native: UvcCaptureNativeModule =
  Platform.OS === 'ios' && NativeModules.UvcCaptureModule
    ? (NativeModules.UvcCaptureModule as UvcCaptureNativeModule)
    : noopModule;

export default native;
