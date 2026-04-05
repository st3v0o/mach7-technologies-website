/**
 * GenericUVCCameraProvider
 *
 * Controls USB Video Class (UVC) cameras connected via USB-C using the
 * uvc-capture native Expo module (AVFoundation .external device type, iOS 17+).
 *
 * Platform notes:
 *   - Requires iPhone 15 or later (USB-C) or iPad with USB-C running iOS/iPadOS 17+.
 *   - Simulator: NOT supported — no USB hardware access.
 *   - Legacy Lightning iPhones: NOT supported.
 *   See docs/PlatformLimitationsAndAssumptions.md.
 */

import { Platform } from 'react-native';
import type { CameraProvider } from '../CameraProvider';
import type {
  AppIntegrationError,
  CameraCapabilities,
  CameraConnectionState,
  CameraDevice,
  CaptureSessionTelemetry,
  ExternalMediaAsset,
  RecordingConfig,
} from '../types';
import { ZERO_CAPABILITIES, makeIntegrationError } from '../types';
import {
  discoverUvcDevices,
  connectUvcDevice,
  disconnectUvcDevice,
  startUvcRecording,
  stopUvcRecording,
  type UvcDevice,
} from 'uvc-capture';

export class GenericUVCCameraProvider implements CameraProvider {
  readonly id = 'generic_uvc';
  readonly displayName = 'USB Camera (UVC)';
  readonly providerType = 'generic_uvc' as const;

  private _connectionState: CameraConnectionState = 'disconnected';
  private _connectedDevice: CameraDevice | null = null;
  private _lastError: AppIntegrationError | null = null;

  private static readonly CAPABILITIES: CameraCapabilities = {
    supportsPreview: true,
    supportsStartStopRecording: true,
    supportsPhotoCapture: false,          // AVCapturePhotoOutput — future work
    supportsMediaImport: false,           // UVC storage is not browsable via AVFoundation
    supportsLiveStream: false,
    supportsCameraGPS: false,
    supportsExposureControl: false,       // depends on UVC device capabilities
    supportsResolutionSelection: true,
    supportsFrameRateSelection: true,
    supportsWirelessConnection: false,
    supportsWiredConnection: true,
  };

  isAvailableOnCurrentDevice(): boolean {
    if (Platform.OS !== 'ios') return false;
    const version = parseInt(Platform.Version as string, 10);
    return version >= 17;
  }

  async requestPermissionsIfNeeded(): Promise<boolean> {
    // Camera permission (NSCameraUsageDescription) is already declared.
    // expo-camera handles the permission prompt for the built-in camera;
    // AVFoundation UVC devices share the same permission.
    return true;
  }

  async discoverDevices(): Promise<CameraDevice[]> {
    try {
      const devices: UvcDevice[] = await discoverUvcDevices();
      return devices.map(d => ({
        id: d.id,
        name: d.name,
        model: d.modelID,
        providerType: 'generic_uvc' as const,
      }));
    } catch (e: any) {
      this._lastError = makeIntegrationError('DISCOVER_FAILED', e.message ?? String(e), 'generic_uvc');
      return [];
    }
  }

  async connect(deviceId: string): Promise<void> {
    this._connectionState = 'connecting';
    try {
      await connectUvcDevice(deviceId);
      this._connectedDevice = {
        id: deviceId,
        name: 'USB Camera',
        providerType: 'generic_uvc',
      };
      this._connectionState = 'connected';
    } catch (e: any) {
      this._connectionState = 'error';
      this._lastError = makeIntegrationError('CONNECT_FAILED', e.message ?? String(e), 'generic_uvc');
      throw this._lastError;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await disconnectUvcDevice();
    } catch { /* best-effort */ }
    this._connectionState = 'disconnected';
    this._connectedDevice = null;
  }

  getConnectionState(): CameraConnectionState {
    return this._connectionState;
  }

  getCapabilities(): CameraCapabilities {
    if (this._connectionState !== 'connected') return ZERO_CAPABILITIES;
    return GenericUVCCameraProvider.CAPABILITIES;
  }

  async startPreview(): Promise<void> {
    // Preview is handled via UvcCameraPreview component (native view).
    // The orchestrator passes a viewTag; GenericUVCCameraProvider.startPreview()
    // is intentionally a no-op here — see UvcCaptureModule.startPreview(viewTag).
  }

  async stopPreview(): Promise<void> {
    // See startPreview() note above.
  }

  async startRecording(config: RecordingConfig): Promise<void> {
    const destPath = await this._buildDestinationPath();
    try {
      await startUvcRecording(destPath);
    } catch (e: any) {
      const err = makeIntegrationError('RECORD_FAILED', e.message ?? String(e), 'generic_uvc');
      this._lastError = err;
      throw err;
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      const path = await stopUvcRecording();
      return path || null;
    } catch (e: any) {
      const err = makeIntegrationError('RECORD_FAILED', e.message ?? String(e), 'generic_uvc');
      this._lastError = err;
      throw err;
    }
  }

  async listMedia(): Promise<ExternalMediaAsset[]> {
    // UVC cameras do not expose internal storage via AVFoundation.
    return [];
  }

  async importMedia(_mediaId: string, _destinationPath: string): Promise<ExternalMediaAsset> {
    const err = makeIntegrationError(
      'IMPORT_UNSUPPORTED',
      'UVC cameras do not support media import.',
      'generic_uvc',
      false,
    );
    this._lastError = err;
    throw err;
  }

  getLastError(): AppIntegrationError | null {
    return this._lastError;
  }

  getTelemetrySnapshot(): Partial<CaptureSessionTelemetry> {
    return {};
  }

  // ─── private helpers ─────────────────────────────────────────────────────

  private async _buildDestinationPath(): Promise<string> {
    const FileSystem = await import('expo-file-system/legacy');
    const dir = (FileSystem as any).documentDirectory ?? (FileSystem as any).cacheDirectory ?? '';
    const timestamp = Date.now();
    return `${dir}uvc_${timestamp}.mov`;
  }
}
