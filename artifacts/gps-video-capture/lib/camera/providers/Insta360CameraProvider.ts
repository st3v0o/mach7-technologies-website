import {
  Insta360Camera,
  addTelemetryListener,
  isInsta360Available,
} from 'insta360-camera';
import type { Insta360TelemetryEvent } from 'insta360-camera';
import type { CameraProvider } from '../CameraProvider';
import type {
  AppIntegrationError,
  CameraCapabilities,
  CameraConnectionState,
  CameraDevice,
  CaptureSessionTelemetry,
  ExternalMediaAsset,
  GPSPoint,
  RecordingConfig,
} from '../types';
import { ZERO_CAPABILITIES, makeIntegrationError } from '../types';

/**
 * Insta360CameraProvider
 *
 * Controls Insta360 cameras via the native `insta360-camera` Expo module,
 * which wraps the Insta360 Open SDK (INSCameraSDK).
 *
 * HOW TO ACTIVATE (SDK_BINARY_REQUIRED):
 *   See docs/ManualVendorSDKHookupSteps.md → "Insta360 Provider" section.
 *   The native module returns noop stubs until the SDK binary is dropped in.
 *
 * SDK source: https://developer.insta360.com (NDA required)
 *
 * Platform note: Requires physical iOS device.  Wi-Fi + Bluetooth entitlements
 * must be declared in Info.plist (already done in app.json).
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
    supportsLiveStream: false,           // model-dependent; check SDK manifest
    supportsCameraGPS: true,             // embedded GPS streamed via onTelemetry
    supportsExposureControl: true,
    supportsResolutionSelection: true,
    supportsFrameRateSelection: true,
    supportsWirelessConnection: true,
    supportsWiredConnection: false,
  };

  isAvailableOnCurrentDevice(): boolean {
    // True only when the Insta360 Open SDK binary is linked in an EAS build.
    return isInsta360Available;
  }

  async requestPermissionsIfNeeded(): Promise<boolean> {
    // Bluetooth permission is requested by the BLE system when the SDK first
    // scans.  No additional JS-layer permission call is needed here.
    return this.isAvailableOnCurrentDevice();
  }

  async discoverDevices(): Promise<CameraDevice[]> {
    try {
      const rawDevices = await Insta360Camera.discoverDevices();
      return rawDevices.map((raw) => ({
        id: raw.id,
        name: raw.name,
        model: raw.model,
        firmwareVersion: raw.firmwareVersion,
        batteryLevel: raw.batteryLevel,
        signalStrength: raw.signalStrength,
        providerType: 'insta360' as const,
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this._lastError = makeIntegrationError('DISCOVER_FAILED', msg, 'insta360');
      throw this._lastError;
    }
  }

  async connect(deviceId: string): Promise<void> {
    this._connectionState = 'connecting';
    try {
      await Insta360Camera.connect(deviceId);
      this._connectionState = 'connected';

      // Cache a lightweight device record so getTelemetrySnapshot() can
      // surface battery info without an extra round-trip.
      // A full device record will be populated after discoverDevices() is
      // called; here we store just the ID.
      this._connectedDevice = {
        id: deviceId,
        name: deviceId,
        providerType: 'insta360',
      };
    } catch (e: unknown) {
      this._connectionState = 'error';
      const msg = e instanceof Error ? e.message : String(e);
      this._lastError = makeIntegrationError('CONNECT_FAILED', msg, 'insta360');
      throw this._lastError;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await Insta360Camera.disconnect();
    } catch (e: unknown) {
      // Best-effort disconnect; log and continue.
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[Insta360] disconnect error:', msg);
    } finally {
      this._connectionState = 'disconnected';
      this._connectedDevice = null;
    }
  }

  getConnectionState(): CameraConnectionState {
    return this._connectionState;
  }

  getCapabilities(): CameraCapabilities {
    if (this._connectionState !== 'connected') return ZERO_CAPABILITIES;
    return Insta360CameraProvider.CAPABILITIES;
  }

  async startPreview(): Promise<void> {
    try {
      await Insta360Camera.startPreview();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this._lastError = makeIntegrationError('PREVIEW_FAILED', msg, 'insta360');
      throw this._lastError;
    }
  }

  async stopPreview(): Promise<void> {
    try {
      await Insta360Camera.stopPreview();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[Insta360] stopPreview error:', msg);
    }
  }

  async startRecording(config: RecordingConfig): Promise<void> {
    try {
      await Insta360Camera.startRecording({
        resolution: config.resolution,
        frameRate: config.frameRate,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this._lastError = makeIntegrationError('RECORD_FAILED', msg, 'insta360');
      throw this._lastError;
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      const fileKey = await Insta360Camera.stopRecording();
      return fileKey || null;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this._lastError = makeIntegrationError('RECORD_STOP_FAILED', msg, 'insta360');
      throw this._lastError;
    }
  }

  async listMedia(): Promise<ExternalMediaAsset[]> {
    try {
      const rawItems = await Insta360Camera.listMedia();
      return rawItems.map((item) => ({
        id: item.id,
        filename: item.filename,
        mimeType: item.mimeType,
        sizeBytes: item.size,
        createdAt: item.createdAt ?? 0,
        imported: false,
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this._lastError = makeIntegrationError('LIST_MEDIA_FAILED', msg, 'insta360');
      throw this._lastError;
    }
  }

  async importMedia(mediaId: string, destinationPath: string): Promise<ExternalMediaAsset> {
    try {
      const localPath = await Insta360Camera.importMedia(mediaId, destinationPath);
      const filename = (mediaId.split('/').pop() ?? mediaId);
      const isVideo = /\.(insv|mp4|mov)$/i.test(filename);
      return {
        id: mediaId,
        filename,
        mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
        localPath,
        createdAt: Date.now(),
        imported: true,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const err = makeIntegrationError('IMPORT_FAILED', msg, 'insta360');
      this._lastError = err;
      throw err;
    }
  }

  getLastError(): AppIntegrationError | null {
    return this._lastError;
  }

  getTelemetrySnapshot(): Partial<CaptureSessionTelemetry> {
    return {
      batteryLevel: this._connectedDevice?.batteryLevel,
      signalStrength: this._connectedDevice?.signalStrength,
    };
  }

  // ── Live GPS telemetry subscription ──────────────────────────────────────

  /**
   * Subscribes to the camera's live GPS telemetry stream.
   * Called by ExternalCameraGPSProvider.startLocationStream() when this
   * camera is attached and supportsCameraGPS === true.
   *
   * Returns an unsubscribe function.  Every GPS 'onTelemetry' event from
   * the native module is forwarded to the provided callback so it can be
   * ingested into the session GPS track via ExternalCameraGPSProvider.
   */
  subscribeToGPSTelemetry(callback: (point: Omit<GPSPoint, 'source'>) => void): () => void {
    return addTelemetryListener((event: Insta360TelemetryEvent) => {
      if (
        event.type === 'gps' &&
        typeof event.latitude === 'number' &&
        typeof event.longitude === 'number'
      ) {
        callback({
          timestamp: event.timestamp ?? Date.now(),
          latitude: event.latitude,
          longitude: event.longitude,
          altitude: event.altitude,
          speed: event.speed,
        });
      }

      // Keep the cached device record's battery level fresh.
      if (event.type === 'battery' && typeof event.batteryLevel === 'number') {
        if (this._connectedDevice) {
          this._connectedDevice = {
            ...this._connectedDevice,
            batteryLevel: event.batteryLevel,
          };
        }
      }
    });
  }
}
