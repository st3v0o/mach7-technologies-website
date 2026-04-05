/**
 * uvc-capture
 *
 * Expo native module for USB Video Class (UVC) cameras connected to iPhone/iPad
 * via USB-C.  Wraps AVFoundation's .external capture device type (iOS 17+).
 *
 * All functions silently no-op on simulators and iOS < 17.
 */

import { requireNativeViewManager } from 'expo-modules-core';
import React from 'react';
import { View, type ViewProps } from 'react-native';
import NativeImpl from './UvcCaptureModule';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UvcDevice {
  /** AVCaptureDevice.uniqueID */
  id: string;
  /** Human-readable camera name */
  name: string;
  /** AVCaptureDevice modelID string */
  modelID?: string;
}

// ─── Functions ────────────────────────────────────────────────────────────────

/** Discover connected UVC cameras via AVCaptureDevice.DiscoverySession(.external). */
export async function discoverUvcDevices(): Promise<UvcDevice[]> {
  return NativeImpl.discoverDevices();
}

/** Open an AVCaptureSession for the given device ID. */
export async function connectUvcDevice(deviceId: string): Promise<void> {
  return NativeImpl.connect(deviceId);
}

/**
 * Ensure the capture session is running and the preview layer is live.
 * The UvcPreviewView auto-attaches to the session via UvcSessionManager;
 * call this before rendering <UvcPreviewView> to guarantee the session is running.
 */
export async function startUvcPreview(): Promise<void> {
  return NativeImpl.startPreview();
}

/**
 * Stop the live preview.  The preview layer detaches when disconnectUvcDevice()
 * is called; this function is provided for API symmetry.
 */
export async function stopUvcPreview(): Promise<void> {
  return NativeImpl.stopPreview();
}

/** Stop the current capture session and release AVFoundation resources. */
export async function disconnectUvcDevice(): Promise<void> {
  return NativeImpl.disconnect();
}

/**
 * Start recording to a local file.
 * @param destinationPath expo-file-system URI (file:///…) to write the .mov to.
 */
export async function startUvcRecording(destinationPath: string): Promise<void> {
  return NativeImpl.startRecording(destinationPath);
}

/**
 * Stop recording.
 * @returns The local file URI written (may be empty string on simulator).
 */
export async function stopUvcRecording(): Promise<string> {
  return NativeImpl.stopRecording();
}

// ─── Preview View ─────────────────────────────────────────────────────────────

// On iOS the native view manager 'UvcPreviewView' renders the AVCaptureVideoPreviewLayer.
// On other platforms we fall back to a plain View so Metro doesn't crash.
const NativeViewManager = (() => {
  try {
    return requireNativeViewManager('UvcPreviewView');
  } catch {
    return null;
  }
})();

/**
 * Full-size live preview from the connected UVC camera.
 * Renders an AVCaptureVideoPreviewLayer (iOS 17+) or a plain View elsewhere.
 *
 * The view automatically attaches to the current AVCaptureSession managed by
 * the uvc-capture native module; just render it after calling connectUvcDevice().
 */
export function UvcPreviewView(props: ViewProps): React.ReactElement {
  if (NativeViewManager) {
    return React.createElement(NativeViewManager as React.ComponentType<ViewProps>, props);
  }
  return React.createElement(View, props);
}
