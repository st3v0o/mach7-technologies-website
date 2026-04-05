/**
 * GoProCameraProvider — Open GoPro BLE + Wi-Fi REST implementation.
 *
 * Protocol overview:
 *   1. BLE scan for peripherals advertising service UUID FEA6.
 *   2. Connect via BLE; send pairing command on the Command characteristic.
 *   3. Read Wi-Fi SSID / password from BLE characteristics.
 *   4. Join the camera's Wi-Fi AP via react-native-wifi-reborn.
 *   5. All recording/media commands go over REST to http://10.5.5.9:8080.
 *   6. After file import, parse GPMF telemetry for GPS points.
 *
 * Reference: https://gopro.github.io/OpenGoPro/
 */

import { BleManager, type Device, State as BleState } from 'react-native-ble-plx';
import WifiManager from 'react-native-wifi-reborn';
import * as FileSystem from 'expo-file-system/legacy';

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
import { extractGpsFromGoProMp4 } from '../gpmf';

// ─── BLE UUIDs (Open GoPro spec) ─────────────────────────────────────────────

const SERVICE_FEA6 = 'FEA6';

// GP-0001 / GP-0002: command request / response
const CHAR_CMD_REQ  = 'b5f90072-aa8d-11e3-9046-0002a5d5c51b';
const CHAR_CMD_RESP = 'b5f90073-aa8d-11e3-9046-0002a5d5c51b';

// GP-0091 / GP-0092: network management request / response
const CHAR_WIFI_AP_SSID = 'b5f90002-aa8d-11e3-9046-0002a5d5c51b';
const CHAR_WIFI_AP_PASS = 'b5f90003-aa8d-11e3-9046-0002a5d5c51b';

// Pairing command: AP_CONTROL enable (value 0x17 0x01 0x01)
const CMD_AP_ENABLE = btoa(String.fromCharCode(0x03, 0x17, 0x01, 0x01));

// REST base URL for Open GoPro
const REST_BASE = 'http://10.5.5.9:8080';
const REST_TIMEOUT_MS = 8000;

// ─── Module-level BLE singleton ───────────────────────────────────────────────

let _bleManager: BleManager | null = null;

function getBleManager(): BleManager {
  if (!_bleManager) _bleManager = new BleManager();
  return _bleManager;
}

// ─── REST helpers ─────────────────────────────────────────────────────────────

async function goProFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REST_TIMEOUT_MS);
  try {
    const res = await fetch(`${REST_BASE}${path}`, { ...opts, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─── GoPro media list types ───────────────────────────────────────────────────

interface GoProMediaItem {
  n: string;  // filename
  s?: string; // size in bytes (string)
  cre?: string; // creation time
  mod?: string; // modification time
  dur?: string; // duration in seconds
}

interface GoProMediaDirectory {
  d: string;           // directory name (e.g. "100GOPRO")
  fs: GoProMediaItem[]; // files
}

interface GoProMediaList {
  id: string;
  media: GoProMediaDirectory[];
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class GoProCameraProvider implements CameraProvider {
  readonly id = 'gopro';
  readonly displayName = 'GoPro';
  readonly providerType = 'gopro' as const;

  private _connectionState: CameraConnectionState = 'disconnected';
  private _connectedDevice: CameraDevice | null = null;
  private _lastError: AppIntegrationError | null = null;

  // BLE device reference (kept alive to maintain connection)
  private _bleDevice: Device | null = null;

  // Discovered BLE peripherals during scan
  private _discovered = new Map<string, Device>();

  private static readonly CAPABILITIES: CameraCapabilities = {
    supportsPreview: false,              // RTSP/WebRTC — out-of-scope
    supportsStartStopRecording: true,
    supportsPhotoCapture: true,
    supportsMediaImport: true,
    supportsLiveStream: false,
    supportsCameraGPS: false,            // GPS is post-process only (GPMF)
    supportsExposureControl: true,
    supportsResolutionSelection: true,
    supportsFrameRateSelection: true,
    supportsWirelessConnection: true,
    supportsWiredConnection: false,
  };

  isAvailableOnCurrentDevice(): boolean {
    // Bluetooth hardware presence can't be checked synchronously without an
    // already-initialised BleManager. Return true so the camera appears in the
    // UI; actual availability is gated by requestPermissionsIfNeeded().
    return true;
  }

  async requestPermissionsIfNeeded(): Promise<boolean> {
    const mgr = getBleManager();
    return new Promise<boolean>(resolve => {
      const sub = mgr.onStateChange(state => {
        sub.remove();
        resolve(state === BleState.PoweredOn);
      }, true);
    });
  }

  async discoverDevices(): Promise<CameraDevice[]> {
    this._discovered.clear();

    const mgr = getBleManager();
    const state = await mgr.state();
    if (state !== BleState.PoweredOn) {
      throw makeIntegrationError('BLE_OFF', 'Bluetooth is not powered on.', 'gopro');
    }

    return new Promise<CameraDevice[]>((resolve, reject) => {
      const scanDurationMs = 10_000;
      const timeoutId = setTimeout(() => {
        mgr.stopDeviceScan();
        resolve(Array.from(this._discovered.values()).map(d => this._deviceToCamera(d)));
      }, scanDurationMs);

      mgr.startDeviceScan(
        [SERVICE_FEA6],
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            clearTimeout(timeoutId);
            mgr.stopDeviceScan();
            reject(makeIntegrationError('SCAN_ERROR', error.message, 'gopro'));
            return;
          }
          if (device && (device.name?.startsWith('GoPro') || device.localName?.startsWith('GoPro'))) {
            this._discovered.set(device.id, device);
          }
        },
      );
    });
  }

  async connect(deviceId: string): Promise<void> {
    this._connectionState = 'connecting';
    const mgr = getBleManager();
    try {
      mgr.stopDeviceScan();

      // 1. BLE connect
      const device = await mgr.connectToDevice(deviceId, { autoConnect: false });
      await device.discoverAllServicesAndCharacteristics();
      this._bleDevice = device;

      // 2. Enable notifications on command response characteristic
      await device.monitorCharacteristicForService(
        SERVICE_FEA6,
        CHAR_CMD_RESP,
        (_err, _char) => { /* response handler — fire and forget for pairing */ },
      );

      // 3. Send AP_CONTROL enable command to activate Wi-Fi AP on camera
      await device.writeCharacteristicWithResponseForService(
        SERVICE_FEA6,
        CHAR_CMD_REQ,
        CMD_AP_ENABLE,
      );

      // Small delay for camera to bring up its AP
      await new Promise(r => setTimeout(r, 1500));

      // 4. Read Wi-Fi credentials
      const ssidChar = await device.readCharacteristicForService(SERVICE_FEA6, CHAR_WIFI_AP_SSID);
      const passChar = await device.readCharacteristicForService(SERVICE_FEA6, CHAR_WIFI_AP_PASS);

      const ssid = ssidChar.value ? atob(ssidChar.value) : '';
      const pass = passChar.value ? atob(passChar.value) : '';

      if (!ssid) throw new Error('Could not read Wi-Fi SSID from camera');

      // 5. Join the camera AP
      await WifiManager.connectToProtectedSSID(ssid, pass, false, false);

      // 6. Small delay for DHCP
      await new Promise(r => setTimeout(r, 2000));

      // 7. Verify REST is up
      const stateRes = await goProFetch('/gopro/camera/state');
      if (!stateRes.ok) throw new Error(`Camera REST not reachable: HTTP ${stateRes.status}`);

      // 8. Read camera info for device metadata
      const infoRes = await goProFetch('/gopro/camera/info');
      let model = 'GoPro';
      if (infoRes.ok) {
        try {
          const info = await infoRes.json();
          model = info?.info?.model_name ?? 'GoPro';
        } catch { /* ignore */ }
      }

      this._connectedDevice = {
        id: deviceId,
        name: this._bleDevice?.name ?? 'GoPro Camera',
        model,
        providerType: 'gopro',
      };
      this._connectionState = 'connected';
    } catch (e: any) {
      this._connectionState = 'error';
      this._lastError = makeIntegrationError('CONNECT_FAILED', e.message ?? String(e), 'gopro');
      throw this._lastError;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this._bleDevice) {
        await this._bleDevice.cancelConnection();
        this._bleDevice = null;
      }
    } catch { /* best-effort */ }
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
    // GoPro preview requires RTSP + a video player native module (out-of-scope).
    // POST /gopro/camera/stream/start would return an RTSP URL.
  }

  async stopPreview(): Promise<void> {
    // POST /gopro/camera/stream/stop
  }

  async startRecording(config: RecordingConfig): Promise<void> {
    // Apply resolution setting (setting ID 2)
    if (config.resolution) {
      const resOption = GoProCameraProvider._resolutionOption(config.resolution);
      if (resOption !== null) {
        await goProFetch('/gopro/camera/setting', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setting: 2, option: resOption }),
        }).catch(console.warn);
      }
    }
    // Apply frame rate setting (setting ID 3)
    if (config.frameRate) {
      const fpsOption = GoProCameraProvider._fpsOption(config.frameRate);
      if (fpsOption !== null) {
        await goProFetch('/gopro/camera/setting', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setting: 3, option: fpsOption }),
        }).catch(console.warn);
      }
    }
    // Start recording
    const res = await goProFetch('/gopro/camera/shutter/start', { method: 'POST' });
    if (!res.ok) {
      throw makeIntegrationError('RECORD_FAILED', `Shutter start failed: HTTP ${res.status}`, 'gopro');
    }
  }

  async stopRecording(): Promise<string | null> {
    const res = await goProFetch('/gopro/camera/shutter/stop', { method: 'POST' });
    if (!res.ok) {
      throw makeIntegrationError('RECORD_FAILED', `Shutter stop failed: HTTP ${res.status}`, 'gopro');
    }
    return null; // File will appear in listMedia()
  }

  async listMedia(): Promise<ExternalMediaAsset[]> {
    const res = await goProFetch('/gopro/media/list');
    if (!res.ok) throw makeIntegrationError('LIST_FAILED', `Media list HTTP ${res.status}`, 'gopro');

    const body: GoProMediaList = await res.json();
    const assets: ExternalMediaAsset[] = [];

    for (const dir of body.media ?? []) {
      for (const file of dir.fs ?? []) {
        const isVideo = /\.(MP4|MOV|LRV|THM)$/i.test(file.n);
        const isPhoto = /\.(JPG|JPEG|RAW|GPR)$/i.test(file.n);
        if (!isVideo && !isPhoto) continue;

        assets.push({
          id: `${dir.d}/${file.n}`,
          filename: file.n,
          mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
          durationMs: file.dur ? parseFloat(file.dur) * 1000 : undefined,
          sizeBytes: file.s ? parseInt(file.s, 10) : undefined,
          createdAt: file.cre ? parseInt(file.cre, 10) * 1000 : Date.now(),
          imported: false,
        });
      }
    }
    return assets;
  }

  async importMedia(mediaId: string, destinationPath: string): Promise<ExternalMediaAsset> {
    // mediaId is "DIRECTORY/FILENAME" e.g. "100GOPRO/GX010001.MP4"
    const url = `${REST_BASE}/videos/DCIM/${mediaId}`;

    const downloadResult = await FileSystem.downloadAsync(url, destinationPath);
    if (downloadResult.status !== 200) {
      const err = makeIntegrationError(
        'DOWNLOAD_FAILED',
        `Download HTTP ${downloadResult.status} for ${mediaId}`,
        'gopro',
      );
      this._lastError = err;
      throw err;
    }

    const filename = mediaId.split('/').pop() ?? mediaId;
    const isVideo = /\.(MP4|MOV)$/i.test(filename);

    // Parse GPMF GPS data from the downloaded file
    let gpsPoints: Array<Omit<import('../types').GPSPoint, 'source'>> = [];
    if (isVideo) {
      try {
        gpsPoints = await extractGpsFromGoProMp4(destinationPath, Date.now());
      } catch (gpsErr) {
        console.warn('[GoPro] GPMF parse failed:', gpsErr);
      }
    }

    const asset: ExternalMediaAsset = {
      id: mediaId,
      filename,
      mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
      imported: true,
      localPath: destinationPath,
      createdAt: Date.now(),
    };

    // Attach GPS points to the asset as a non-standard property for the orchestrator
    (asset as any).gpsPoints = gpsPoints;

    return asset;
  }

  getLastError(): AppIntegrationError | null {
    return this._lastError;
  }

  getTelemetrySnapshot(): Partial<CaptureSessionTelemetry> {
    // Return last-known values synchronously.
    // Background telemetry polling can call _refreshTelemetry() and store results.
    return {
      batteryLevel: this._connectedDevice?.batteryLevel,
      signalStrength: this._connectedDevice?.signalStrength,
    };
  }

  /** Optionally call this periodically to refresh battery/signal from REST. */
  async refreshTelemetry(): Promise<void> {
    if (this._connectionState !== 'connected' || !this._connectedDevice) return;
    try {
      const res = await goProFetch('/gopro/camera/state');
      if (!res.ok) return;
      const body = await res.json();
      const status = body?.status ?? {};
      const batteryRaw: number = status['70'] ?? status['2'] ?? -1;
      if (batteryRaw >= 0) {
        this._connectedDevice = {
          ...this._connectedDevice,
          batteryLevel: Math.round(batteryRaw) / 100,
        };
      }
    } catch { /* best-effort */ }
  }

  // ─── private helpers ───────────────────────────────────────────────────────

  private _deviceToCamera(d: Device): CameraDevice {
    return {
      id: d.id,
      name: d.name ?? d.localName ?? 'GoPro Camera',
      providerType: 'gopro',
    };
  }

  /** Map a resolution string to a GoPro setting option ID. */
  private static _resolutionOption(res: string): number | null {
    const map: Record<string, number> = {
      '3840x2160': 1,   // 4K
      '2704x2028': 4,   // 2.7K 4:3
      '2704x1520': 6,   // 2.7K
      '1920x1440': 8,   // 1440p
      '1920x1080': 9,   // 1080p
      '1280x720': 12,   // 720p
    };
    return map[res] ?? null;
  }

  /** Map a frame rate to a GoPro setting option ID. */
  private static _fpsOption(fps: number): number | null {
    const map: Record<number, number> = {
      240: 0,
      120: 1,
      60: 2,
      30: 5,
      25: 6,
      24: 7,
    };
    return map[fps] ?? null;
  }
}
