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
 * BuiltInPhoneCameraProvider
 *
 * Wraps the existing expo-camera / CameraView flow used by the
 * Capture tab (index.tsx).  This provider bridges the new architecture
 * to the current built-in camera implementation so the CaptureSessionOrchestrator
 * can manage it alongside vendor cameras.
 *
 * The actual capture UI lives in app/(tabs)/index.tsx and RecordingContext.
 * This provider is a thin adapter — it does NOT duplicate that logic.
 */
export class BuiltInPhoneCameraProvider implements CameraProvider {
  readonly id = 'builtin';
  readonly displayName = 'iPhone Camera';
  readonly providerType = 'builtin' as const;

  private _connectionState: CameraConnectionState = 'disconnected';
  private _lastError: AppIntegrationError | null = null;

  private static readonly CAPABILITIES: CameraCapabilities = {
    supportsPreview: true,
    supportsStartStopRecording: true,
    supportsPhotoCapture: true,
    supportsMediaImport: false,       // media stays in app local storage
    supportsLiveStream: false,
    supportsCameraGPS: false,         // GPS comes from IOSCoreLocationProvider
    supportsExposureControl: false,   // TODO: expose via native module if needed
    supportsResolutionSelection: false,
    supportsFrameRateSelection: false,
    supportsWirelessConnection: false,
    supportsWiredConnection: false,
  };

  isAvailableOnCurrentDevice(): boolean {
    return Platform.OS === 'ios';
  }

  async requestPermissionsIfNeeded(): Promise<boolean> {
    // expo-camera handles permissions in the Capture tab UI.
    // If you need programmatic permission checks here, import
    // Camera.requestCameraPermissionsAsync() from expo-camera.
    // TODO: delegate to RecordingContext permission flow if required.
    return true;
  }

  async discoverDevices(): Promise<CameraDevice[]> {
    // The built-in camera is always "connected" — there is only one device.
    return [
      {
        id: 'builtin-rear',
        name: 'Rear Camera',
        model: 'Built-in',
        providerType: 'builtin',
      },
    ];
  }

  async connect(_deviceId: string): Promise<void> {
    this._connectionState = 'connected';
  }

  async disconnect(): Promise<void> {
    this._connectionState = 'disconnected';
  }

  getConnectionState(): CameraConnectionState {
    return this._connectionState;
  }

  getCapabilities(): CameraCapabilities {
    if (this._connectionState !== 'connected') return ZERO_CAPABILITIES;
    return BuiltInPhoneCameraProvider.CAPABILITIES;
  }

  async startPreview(): Promise<void> {
    // Preview is managed by the CameraView component in index.tsx.
    // No additional action needed from this adapter.
  }

  async stopPreview(): Promise<void> {
    // Same as above — lifecycle is owned by the Capture tab.
  }

  async startRecording(_config: RecordingConfig): Promise<void> {
    // TODO: signal RecordingContext to begin recording if you want
    //       the orchestrator to drive the built-in camera.
    //       Currently the Capture tab UI manages this directly.
  }

  async stopRecording(): Promise<string | null> {
    // TODO: signal RecordingContext to stop and return the segment path.
    return null;
  }

  async listMedia(): Promise<ExternalMediaAsset[]> {
    // Built-in camera does not expose a browsable media library through
    // this provider.  Use the Log tab instead.
    return [];
  }

  async importMedia(_mediaId: string, _destinationPath: string): Promise<ExternalMediaAsset> {
    const err = makeIntegrationError(
      'IMPORT_UNSUPPORTED',
      'Built-in camera media is managed locally — import is not needed.',
      'builtin',
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
