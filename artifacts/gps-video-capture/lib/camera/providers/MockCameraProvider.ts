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
import { ZERO_CAPABILITIES } from '../types';

/**
 * MockCameraProvider
 *
 * Used for simulator testing, CI, and UI development.
 * Simulates a fully capable external camera without any real hardware.
 * All operations succeed with realistic delays.
 */
export class MockCameraProvider implements CameraProvider {
  readonly id = 'mock';
  readonly displayName = 'Mock Camera (Simulator)';
  readonly providerType = 'mock' as const;

  private _connectionState: CameraConnectionState = 'disconnected';
  private _lastError: AppIntegrationError | null = null;
  private _recordingStartedAt: number | null = null;
  private _mediaCounter = 0;

  private static readonly MOCK_DEVICE: CameraDevice = {
    id: 'mock-device-001',
    name: 'Mock Camera Pro',
    model: 'MockCam 4K',
    firmwareVersion: '1.0.0',
    batteryLevel: 0.82,
    signalStrength: 0.95,
    providerType: 'mock',
  };

  private static readonly CAPABILITIES: CameraCapabilities = {
    supportsPreview: true,
    supportsStartStopRecording: true,
    supportsPhotoCapture: true,
    supportsMediaImport: true,
    supportsLiveStream: false,
    supportsCameraGPS: true,
    supportsExposureControl: true,
    supportsResolutionSelection: true,
    supportsFrameRateSelection: true,
    supportsWirelessConnection: true,
    supportsWiredConnection: false,
  };

  isAvailableOnCurrentDevice(): boolean {
    return true; // always available
  }

  async requestPermissionsIfNeeded(): Promise<boolean> {
    return true;
  }

  async discoverDevices(): Promise<CameraDevice[]> {
    await delay(800);
    return [MockCameraProvider.MOCK_DEVICE];
  }

  async connect(_deviceId: string): Promise<void> {
    this._connectionState = 'connecting';
    await delay(600);
    this._connectionState = 'connected';
  }

  async disconnect(): Promise<void> {
    await delay(200);
    this._connectionState = 'disconnected';
    this._recordingStartedAt = null;
  }

  getConnectionState(): CameraConnectionState {
    return this._connectionState;
  }

  getCapabilities(): CameraCapabilities {
    if (this._connectionState !== 'connected') return ZERO_CAPABILITIES;
    return MockCameraProvider.CAPABILITIES;
  }

  async startPreview(): Promise<void> {
    await delay(300);
    // Mock: no real preview surface
  }

  async stopPreview(): Promise<void> {
    await delay(100);
  }

  async startRecording(_config: RecordingConfig): Promise<void> {
    await delay(400);
    this._recordingStartedAt = Date.now();
  }

  async stopRecording(): Promise<string | null> {
    await delay(500);
    const id = `mock-media-${++this._mediaCounter}`;
    this._recordingStartedAt = null;
    return id;
  }

  async listMedia(): Promise<ExternalMediaAsset[]> {
    await delay(300);
    return Array.from({ length: this._mediaCounter }, (_, i) => ({
      id: `mock-media-${i + 1}`,
      filename: `MOCK_${String(i + 1).padStart(4, '0')}.mp4`,
      mimeType: 'video/mp4',
      durationMs: 30_000 + i * 5_000,
      sizeBytes: 250 * 1024 * 1024,
      createdAt: Date.now() - (this._mediaCounter - i) * 60_000,
      imported: false,
    }));
  }

  async importMedia(mediaId: string, destinationPath: string): Promise<ExternalMediaAsset> {
    await delay(1500); // simulate file copy
    return {
      id: mediaId,
      filename: `${mediaId}.mp4`,
      mimeType: 'video/mp4',
      durationMs: 30_000,
      sizeBytes: 250 * 1024 * 1024,
      createdAt: Date.now(),
      imported: true,
      localPath: destinationPath,
    };
  }

  getLastError(): AppIntegrationError | null {
    return this._lastError;
  }

  getTelemetrySnapshot(): Partial<CaptureSessionTelemetry> {
    const now = Date.now();
    return {
      batteryLevel: 0.82,
      signalStrength: 0.95,
      gpsHealth: 'good',
      gpsSource: 'camera',
      recordingDurationMs: this._recordingStartedAt
        ? now - this._recordingStartedAt
        : 0,
      frameCount: this._recordingStartedAt
        ? Math.floor((now - this._recordingStartedAt) / 1000) * 30
        : 0,
      errorCount: 0,
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
