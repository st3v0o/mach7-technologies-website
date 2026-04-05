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

/**
 * Insta360CameraProvider
 *
 * Skeleton for Insta360 cameras using the Insta360 Open SDK.
 *
 * HOW TO ACTIVATE:
 *   See docs/ManualVendorSDKHookupSteps.md → "Insta360 Provider" section.
 *   All SDK calls are marked with TODO comments below.
 *
 * SDK source: https://developer.insta360.com (NDA required)
 *
 * Platform note: Requires physical iOS device. Wi-Fi + Bluetooth entitlements
 * must be declared in Info.plist.  See docs/PlatformLimitationsAndAssumptions.md.
 */
export class Insta360CameraProvider implements CameraProvider {
  readonly id = 'insta360';
  readonly displayName = 'Insta360';
  readonly providerType = 'insta360' as const;

  private _connectionState: CameraConnectionState = 'disconnected';
  private _connectedDevice: CameraDevice | null = null;
  private _lastError: AppIntegrationError | null = null;

  private static readonly CAPABILITIES: CameraCapabilities = {
    supportsPreview: true,
    supportsStartStopRecording: true,
    supportsPhotoCapture: true,
    supportsMediaImport: true,
    supportsLiveStream: false,            // model-dependent; update after SDK check
    supportsCameraGPS: true,              // embedded in video telemetry
    supportsExposureControl: true,
    supportsResolutionSelection: true,
    supportsFrameRateSelection: true,
    supportsWirelessConnection: true,
    supportsWiredConnection: false,
  };

  isAvailableOnCurrentDevice(): boolean {
    // TODO: return INSCameraManager.isAvailable() once SDK is linked.
    // For now, always false so the UI shows "SDK not installed".
    return false;
  }

  async requestPermissionsIfNeeded(): Promise<boolean> {
    // TODO: request Bluetooth permission via expo-permissions or native module.
    // The SDK may trigger its own permission dialogs on first use.
    return false;
  }

  async discoverDevices(): Promise<CameraDevice[]> {
    // TODO: call INSCameraManager.socket().cameras to enumerate nearby cameras.
    // Example stub — replace with real SDK call:
    //
    // const cameras = await INSCameraManager.shared.discoverCameras();
    // return cameras.map(cam => ({
    //   id: cam.serialNumber,
    //   name: cam.name,
    //   model: cam.model,
    //   firmwareVersion: cam.firmware,
    //   batteryLevel: cam.batteryLevel,
    //   signalStrength: cam.signalStrength,
    //   providerType: 'insta360',
    // }));
    return [];
  }

  async connect(deviceId: string): Promise<void> {
    this._connectionState = 'connecting';
    try {
      // TODO: INSCameraManager.socket().connect(deviceId)
      // Wait for the delegate callback INSCameraDelegate.cameraDidConnect()
      // before setting state to 'connected'.
      throw new Error('Insta360 SDK not yet integrated. See ManualVendorSDKHookupSteps.md.');
    } catch (e: any) {
      this._connectionState = 'error';
      this._lastError = makeIntegrationError('CONNECT_FAILED', e.message, 'insta360');
      throw this._lastError;
    }
  }

  async disconnect(): Promise<void> {
    // TODO: INSCameraManager.socket().disconnect()
    this._connectionState = 'disconnected';
    this._connectedDevice = null;
  }

  getConnectionState(): CameraConnectionState {
    return this._connectionState;
  }

  getCapabilities(): CameraCapabilities {
    if (this._connectionState !== 'connected') return ZERO_CAPABILITIES;
    // TODO: refine based on connected model's feature set from the SDK manifest.
    return Insta360CameraProvider.CAPABILITIES;
  }

  async startPreview(): Promise<void> {
    // TODO: INSCameraManager.socket().startPreviewWith(options:)
    // Wire the returned preview stream to a UIView/Surface via a native module.
  }

  async stopPreview(): Promise<void> {
    // TODO: INSCameraManager.socket().stopPreview()
  }

  async startRecording(config: RecordingConfig): Promise<void> {
    // TODO: build INSCaptureOptions from config, then call:
    // INSCameraManager.socket().startCapture(options:) { error in … }
    //
    // Resolution mapping example:
    //   "3840x2160" → INSCaptureResolution._4K
    //   "1920x1080" → INSCaptureResolution._1080p
    console.log('[Insta360] startRecording stub — config:', config);
  }

  async stopRecording(): Promise<string | null> {
    // TODO: INSCameraManager.socket().stopCapture { mediaInfo, error in … }
    // Return mediaInfo.fileKey as the local media ID.
    return null;
  }

  async listMedia(): Promise<ExternalMediaAsset[]> {
    // TODO: INSCameraMediaFetcher.fetchMediaList { list, error in … }
    // Map each item to ExternalMediaAsset.
    return [];
  }

  async importMedia(mediaId: string, destinationPath: string): Promise<ExternalMediaAsset> {
    // TODO: INSCameraMediaFetcher.downloadMedia(mediaId, to: destinationPath)
    const err = makeIntegrationError(
      'IMPORT_STUB',
      `Insta360 SDK import not yet implemented for mediaId=${mediaId}`,
      'insta360'
    );
    this._lastError = err;
    throw err;
  }

  getLastError(): AppIntegrationError | null {
    return this._lastError;
  }

  getTelemetrySnapshot(): Partial<CaptureSessionTelemetry> {
    // TODO: read battery/signal from INSCameraManager telemetry delegate.
    return {
      batteryLevel: this._connectedDevice?.batteryLevel,
      signalStrength: this._connectedDevice?.signalStrength,
    };
  }
}
