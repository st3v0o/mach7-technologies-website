import type {
  AppIntegrationError,
  CameraCapabilities,
  CameraConnectionState,
  CameraDevice,
  CameraProviderType,
  CaptureSessionTelemetry,
  ExternalMediaAsset,
  RecordingConfig,
} from './types';

/**
 * CameraProvider — every camera backend (built-in, vendor SDK, UVC, mock)
 * must implement this interface.  The UI and CaptureSessionOrchestrator
 * interact exclusively through this contract; no provider-specific code
 * leaks outside its own file.
 */
export interface CameraProvider {
  // ── Identity ────────────────────────────────────────────────────────────
  readonly id: string;
  readonly displayName: string;
  readonly providerType: CameraProviderType;

  // ── Availability ────────────────────────────────────────────────────────
  /** Returns false if required hardware/OS features are missing. */
  isAvailableOnCurrentDevice(): boolean;

  /** Returns true when all required permissions are granted. */
  requestPermissionsIfNeeded(): Promise<boolean>;

  // ── Discovery & connection ──────────────────────────────────────────────
  /** Scan for connectable devices (BLE, Wi-Fi, USB, etc.). */
  discoverDevices(): Promise<CameraDevice[]>;

  /** Establish a control/data connection to the given device. */
  connect(deviceId: string): Promise<void>;

  /** Cleanly close the connection, flushing any pending operations. */
  disconnect(): Promise<void>;

  /** Current connection state — safe to call at any time. */
  getConnectionState(): CameraConnectionState;

  // ── Capabilities ────────────────────────────────────────────────────────
  /**
   * Returns the capability set for the currently connected device.
   * Before a device is connected this should return ZERO_CAPABILITIES.
   */
  getCapabilities(): CameraCapabilities;

  // ── Preview ─────────────────────────────────────────────────────────────
  /** Start camera preview. Only valid if supportsPreview === true. */
  startPreview(): Promise<void>;
  stopPreview(): Promise<void>;

  // ── Recording ───────────────────────────────────────────────────────────
  /** Begin recording. Returns when recording has actually started. */
  startRecording(config: RecordingConfig): Promise<void>;

  /**
   * Stop recording.
   * @returns The provider-local media ID of the recorded asset, or null.
   */
  stopRecording(): Promise<string | null>;

  // ── Media ───────────────────────────────────────────────────────────────
  /** List media on the camera's internal storage. */
  listMedia(): Promise<ExternalMediaAsset[]>;

  /**
   * Copy a media asset from the camera to the device.
   * @param mediaId Provider-local asset ID from listMedia().
   * @param destinationPath Absolute local path to write to.
   */
  importMedia(mediaId: string, destinationPath: string): Promise<ExternalMediaAsset>;

  // ── Diagnostics ─────────────────────────────────────────────────────────
  getLastError(): AppIntegrationError | null;
  getTelemetrySnapshot(): Partial<CaptureSessionTelemetry>;
}
