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
 * GoProCameraProvider
 *
 * Skeleton for GoPro cameras using the Open GoPro BLE + Wi-Fi protocol.
 * No proprietary SDK binary required — control goes over BLE and REST.
 *
 * HOW TO ACTIVATE:
 *   See docs/ManualVendorSDKHookupSteps.md → "GoPro Provider" section.
 *   Reference: https://gopro.github.io/OpenGoPro/
 *
 * Platform note: Requires Bluetooth and local network permissions.
 * GPS data is embedded in GPMF telemetry inside the .mp4 file —
 * not available as a live stream.
 */
export class GoProCameraProvider implements CameraProvider {
  readonly id = 'gopro';
  readonly displayName = 'GoPro';
  readonly providerType = 'gopro' as const;

  private _connectionState: CameraConnectionState = 'disconnected';
  private _connectedDevice: CameraDevice | null = null;
  private _wifiBase = 'http://10.5.5.9:8080';
  private _lastError: AppIntegrationError | null = null;

  private static readonly CAPABILITIES: CameraCapabilities = {
    supportsPreview: false,             // preview requires RTSP — model-dependent
    supportsStartStopRecording: true,
    supportsPhotoCapture: true,
    supportsMediaImport: true,
    supportsLiveStream: false,
    supportsCameraGPS: false,           // GPS is post-processing only (GPMF)
    supportsExposureControl: true,
    supportsResolutionSelection: true,
    supportsFrameRateSelection: true,
    supportsWirelessConnection: true,
    supportsWiredConnection: false,
  };

  isAvailableOnCurrentDevice(): boolean {
    // TODO: check that CoreBluetooth is available and BT is powered on.
    // For now, return false until BLE integration is wired.
    return false;
  }

  async requestPermissionsIfNeeded(): Promise<boolean> {
    // TODO: request NSBluetoothAlwaysUsageDescription permission via
    // expo-permissions or a native Bluetooth module.
    return false;
  }

  async discoverDevices(): Promise<CameraDevice[]> {
    // TODO: scan BLE for peripherals advertising service UUID FEA6.
    // Each discovered peripheral → CameraDevice.
    //
    // Example flow:
    //   const peripheral = await BleManager.scan([FEA6_SERVICE_UUID], 10, true)
    //   return peripherals.map(p => ({ id: p.id, name: p.name, providerType: 'gopro' }))
    return [];
  }

  async connect(deviceId: string): Promise<void> {
    this._connectionState = 'connecting';
    try {
      // TODO: Step 1 — BLE connect to peripheral with deviceId.
      //   await BleManager.connect(deviceId)

      // TODO: Step 2 — Pair via BLE command on characteristic 0xB5F90002.
      //   await BleManager.write(deviceId, FEA6_SERVICE, PAIRING_CHAR, PAIR_CMD)

      // TODO: Step 3 — Read Wi-Fi credentials from characteristic 0xB5F90003.
      //   const ssid = await BleManager.read(deviceId, FEA6_SERVICE, WIFI_SSID_CHAR)
      //   const pass  = await BleManager.read(deviceId, FEA6_SERVICE, WIFI_PASS_CHAR)

      // TODO: Step 4 — Join camera AP via a native Wi-Fi join native module.
      //   await WifiManager.connectToProtectedSSID(ssid, pass, false)

      // TODO: Step 5 — Verify REST API is up.
      //   const res = await fetch(`${this._wifiBase}/gopro/camera/state`)
      //   if (!res.ok) throw new Error('REST not reachable')

      throw new Error('GoPro BLE/Wi-Fi integration not yet implemented. See ManualVendorSDKHookupSteps.md.');
    } catch (e: any) {
      this._connectionState = 'error';
      this._lastError = makeIntegrationError('CONNECT_FAILED', e.message, 'gopro');
      throw this._lastError;
    }
  }

  async disconnect(): Promise<void> {
    // TODO: await BleManager.disconnect(this._connectedDevice?.id)
    // TODO: leave camera Wi-Fi AP (iOS handles this when switching networks)
    this._connectionState = 'disconnected';
    this._connectedDevice = null;
  }

  getConnectionState(): CameraConnectionState {
    return this._connectionState;
  }

  getCapabilities(): CameraCapabilities {
    if (this._connectionState !== 'connected') return ZERO_CAPABILITIES;
    return GoProCameraProvider.CAPABILITIES;
  }

  async startPreview(): Promise<void> {
    // TODO: POST /gopro/camera/stream/start to enable RTSP preview.
    // Parse the RTSP URL from response and open it with a video player.
  }

  async stopPreview(): Promise<void> {
    // TODO: POST /gopro/camera/stream/stop
  }

  async startRecording(config: RecordingConfig): Promise<void> {
    // TODO: apply resolution/fps settings via PUT /gopro/camera/setting
    // then POST /gopro/camera/shutter/start
    console.log('[GoPro] startRecording stub — config:', config);
  }

  async stopRecording(): Promise<string | null> {
    // TODO: POST /gopro/camera/shutter/stop
    // The file appears in listMedia() after stopping.
    return null;
  }

  async listMedia(): Promise<ExternalMediaAsset[]> {
    // TODO: GET /gopro/media/list
    // Map response.media[].fs[] to ExternalMediaAsset.
    return [];
  }

  async importMedia(mediaId: string, destinationPath: string): Promise<ExternalMediaAsset> {
    // TODO: GET /videos/DCIM/100GOPRO/<mediaId> → stream to destinationPath.
    // After download, parse GPMF telemetry for GPS data.
    const err = makeIntegrationError(
      'IMPORT_STUB',
      `GoPro import not yet implemented for mediaId=${mediaId}`,
      'gopro'
    );
    this._lastError = err;
    throw err;
  }

  getLastError(): AppIntegrationError | null {
    return this._lastError;
  }

  getTelemetrySnapshot(): Partial<CaptureSessionTelemetry> {
    // TODO: GET /gopro/camera/state and extract battery + signal info.
    return {
      batteryLevel: this._connectedDevice?.batteryLevel,
      signalStrength: this._connectedDevice?.signalStrength,
    };
  }
}
