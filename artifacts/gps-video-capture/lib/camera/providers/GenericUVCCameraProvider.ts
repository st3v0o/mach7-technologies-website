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

/**
 * GenericUVCCameraProvider
 *
 * Skeleton for USB Video Class cameras connected via USB-C.
 * Uses AVFoundation's `.external` device type — no vendor SDK required.
 *
 * HOW TO ACTIVATE:
 *   See docs/ManualVendorSDKHookupSteps.md → "Generic UVC Provider" section.
 *
 * Platform note:
 *   - iOS 17+ on USB-C iPhones (iPhone 15 series) or compatible iPads.
 *   - Simulator: NOT supported (no USB hardware access).
 *   - Older Lightning iPhones: NOT supported.
 *   See docs/PlatformLimitationsAndAssumptions.md.
 *
 * Implementation note:
 *   AVFoundation UVC capture must be implemented in a native Expo module
 *   (Swift/ObjC) because AVCaptureSession cannot be created in JS.
 *   A placeholder native module name `UVCCaptureModule` is used below.
 */
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
    supportsPhotoCapture: true,
    supportsMediaImport: false,           // UVC camera storage is not browsable
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
    // TODO: check iOS version >= 17 at runtime using Platform.Version.
    // AVCaptureDevice.DeviceType.external was introduced in iOS 17.
    // Example check (native module or API):
    //   const version = parseInt(Platform.Version as string, 10)
    //   return version >= 17
    return false;
  }

  async requestPermissionsIfNeeded(): Promise<boolean> {
    // Camera permission is the only requirement for UVC access.
    // TODO: call Camera.requestCameraPermissionsAsync() from expo-camera.
    return false;
  }

  async discoverDevices(): Promise<CameraDevice[]> {
    // TODO: call native module UVCCaptureModule.discoverDevices()
    // which runs AVCaptureDevice.DiscoverySession(
    //   deviceTypes: [.external],
    //   mediaType: .video,
    //   position: .unspecified
    // ).devices
    //
    // Wrap in #available(iOS 17, *) guard inside the native module.
    return [];
  }

  async connect(deviceId: string): Promise<void> {
    this._connectionState = 'connecting';
    try {
      // TODO: call UVCCaptureModule.connect(deviceId)
      // which creates an AVCaptureSession with the chosen AVCaptureDevice.
      throw new Error('UVC native module not yet implemented. See ManualVendorSDKHookupSteps.md.');
    } catch (e: any) {
      this._connectionState = 'error';
      this._lastError = makeIntegrationError('CONNECT_FAILED', e.message, 'generic_uvc');
      throw this._lastError;
    }
  }

  async disconnect(): Promise<void> {
    // TODO: UVCCaptureModule.disconnect() — stops AVCaptureSession.
    this._connectionState = 'disconnected';
    this._connectedDevice = null;
  }

  getConnectionState(): CameraConnectionState {
    return this._connectionState;
  }

  getCapabilities(): CameraCapabilities {
    if (this._connectionState !== 'connected') return ZERO_CAPABILITIES;
    // TODO: query actual device capability map from AVCaptureDevice.formats.
    return GenericUVCCameraProvider.CAPABILITIES;
  }

  async startPreview(): Promise<void> {
    // TODO: UVCCaptureModule.startPreview(viewTag)
    // which attaches AVCaptureVideoPreviewLayer to a native UIView.
  }

  async stopPreview(): Promise<void> {
    // TODO: UVCCaptureModule.stopPreview()
  }

  async startRecording(config: RecordingConfig): Promise<void> {
    // TODO: UVCCaptureModule.startRecording(destinationPath, config)
    // which starts AVCaptureMovieFileOutput at destinationPath.
    console.log('[GenericUVC] startRecording stub — config:', config);
  }

  async stopRecording(): Promise<string | null> {
    // TODO: UVCCaptureModule.stopRecording()
    // Returns the file path of the recorded asset.
    return null;
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
      false
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
}
