/**
 * JS bridge to the native UvcCaptureModule.
 *
 * Uses Expo Modules API's `requireOptionalNativeModule` which:
 *  - Returns the native module instance when running on a physical iOS 17+ device
 *    with the uvc-capture module linked.
 *  - Returns null on simulators, web, Android, or when the module is not linked.
 */

import { requireOptionalNativeModule } from 'expo-modules-core';

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

// 'UvcCapture' matches the Name("UvcCapture") declaration in Swift.
const native: UvcCaptureNativeModule =
  requireOptionalNativeModule<UvcCaptureNativeModule>('UvcCapture') ?? noopModule;

export default native;
