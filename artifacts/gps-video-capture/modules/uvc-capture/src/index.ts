/**
 * uvc-capture
 *
 * Expo native module for USB Video Class (UVC) cameras connected to iPhone/iPad
 * via USB-C.  Wraps AVFoundation's .external capture device type (iOS 17+).
 *
 * All functions are no-ops on simulators and on iOS < 17.
 */

import UvcCaptureModuleImpl from './UvcCaptureModule';

export interface UvcDevice {
  /** AVCaptureDevice.uniqueID */
  id: string;
  /** Human-readable camera name */
  name: string;
  /** AVCaptureDevice model ID string */
  modelID?: string;
}

/**
 * Discover connected UVC cameras.
 * Returns an empty array on simulator or if no cameras are attached.
 */
export async function discoverUvcDevices(): Promise<UvcDevice[]> {
  return UvcCaptureModuleImpl.discoverDevices();
}

/**
 * Open an AVCaptureSession for the given device.
 * Must be called before startPreview / startRecording.
 */
export async function connectUvcDevice(deviceId: string): Promise<void> {
  return UvcCaptureModuleImpl.connect(deviceId);
}

/**
 * Stop the current capture session and release resources.
 */
export async function disconnectUvcDevice(): Promise<void> {
  return UvcCaptureModuleImpl.disconnect();
}

/**
 * Attach a live preview to the native view identified by viewTag.
 * The view must be a plain <View> rendered in the component tree;
 * pass its ref's nativeTag (findNodeHandle) as viewTag.
 */
export async function startUvcPreview(viewTag: number): Promise<void> {
  return UvcCaptureModuleImpl.startPreview(viewTag);
}

/**
 * Stop the live preview.
 */
export async function stopUvcPreview(): Promise<void> {
  return UvcCaptureModuleImpl.stopPreview();
}

/**
 * Start recording to a local file.
 * @param destinationPath  expo-file-system URI where the .mov will be written.
 */
export async function startUvcRecording(destinationPath: string): Promise<void> {
  return UvcCaptureModuleImpl.startRecording(destinationPath);
}

/**
 * Stop recording.
 * @returns The local file URI that was written.
 */
export async function stopUvcRecording(): Promise<string> {
  return UvcCaptureModuleImpl.stopRecording();
}
