/**
 * CanonCCAPIProvider — Canon Camera Connect API (CCAPI) over Wi-Fi.
 *
 * Protocol overview:
 *   Discovery: scan the local subnet for cameras responding on port 8080.
 *              Also tries 192.168.1.1 (Canon Wi-Fi AP mode default).
 *   Control:  REST API at http://<camera-ip>:8080/ccapi/ver100/…
 *
 * Supported cameras: EOS R series, EOS 90D, EOS 5D Mark IV, EOS 6D Mark II,
 *                    EOS 850D, EOS M50 Mark II, PowerShot G-series, etc.
 * Reference: https://developercommunity.usa.canon.com/s/article/ccapi
 *
 * Platform: iOS — camera must be on the same Wi-Fi network as the phone,
 *           OR the phone connects to the camera's own AP (EOS Utility mode).
 */

import NetInfo from '@react-native-community/netinfo';
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

// ─── CCAPI base path ─────────────────────────────────────────────────────────

const CCAPI_PATH = '/ccapi/ver100';
const CCAPI_PORT = 8080;
const PROBE_TIMEOUT_MS = 2000;
const REQUEST_TIMEOUT_MS = 8000;

// ─── known Canon AP-mode IPs and common router gateway IPs ───────────────────

const CANON_PROBE_FIXED: string[] = [
  '192.168.1.1',   // Canon Wi-Fi AP default
  '192.168.0.1',
  '192.168.2.1',
];

// ─── REST helpers ─────────────────────────────────────────────────────────────

async function ccapiFetch(
  cameraIp: string,
  path: string,
  opts: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(
      `http://${cameraIp}:${CCAPI_PORT}${CCAPI_PATH}${path}`,
      { ...opts, signal: ctrl.signal },
    );
  } finally {
    clearTimeout(timer);
  }
}

async function probeCanonCamera(ip: string): Promise<{ model: string; firmware: string } | null> {
  try {
    const res = await ccapiFetch(ip, '/deviceinformation', {}, PROBE_TIMEOUT_MS);
    if (!res.ok) return null;
    const body = await res.json();
    return {
      model: body?.productname ?? body?.model ?? 'Canon Camera',
      firmware: body?.firmwareversion ?? '',
    };
  } catch {
    return null;
  }
}

// ─── subnet scanner ───────────────────────────────────────────────────────────

async function scanSubnet(localIp: string): Promise<string[]> {
  const parts = localIp.split('.');
  if (parts.length !== 4) return [];
  const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;

  // Scan the 10 IPs around the phone, plus low IPs (routers / cameras)
  const myHost = parseInt(parts[3], 10);
  const candidates = new Set<number>();
  for (let i = Math.max(1, myHost - 5); i <= Math.min(254, myHost + 5); i++) candidates.add(i);
  [1, 2, 100, 101, 200, 201].forEach(h => candidates.add(h));
  candidates.delete(myHost); // skip self

  const probes = Array.from(candidates).map(h => probeCanonCamera(`${prefix}.${h}`));
  const results = await Promise.allSettled(probes);
  const ips: string[] = [];
  let idx = 0;
  for (const h of candidates) {
    const r = results[idx++];
    if (r.status === 'fulfilled' && r.value !== null) ips.push(`${prefix}.${h}`);
  }
  return ips;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class CanonCCAPIProvider implements CameraProvider {
  readonly id = 'canon';
  readonly displayName = 'Canon (CCAPI)';
  readonly providerType = 'canon' as const;

  private _connectionState: CameraConnectionState = 'disconnected';
  private _connectedDevice: CameraDevice | null = null;
  private _cameraIp: string | null = null;
  private _lastError: AppIntegrationError | null = null;

  private static readonly CAPABILITIES: CameraCapabilities = {
    supportsPreview: false,              // MJPEG live-view — future work
    supportsStartStopRecording: true,
    supportsPhotoCapture: true,
    supportsMediaImport: true,
    supportsLiveStream: false,
    supportsCameraGPS: false,           // GPS not exposed via CCAPI
    supportsExposureControl: true,
    supportsResolutionSelection: false, // resolution controlled on-camera
    supportsFrameRateSelection: false,
    supportsWirelessConnection: true,
    supportsWiredConnection: false,
  };

  isAvailableOnCurrentDevice(): boolean {
    return true; // Wi-Fi is always available on iOS
  }

  async requestPermissionsIfNeeded(): Promise<boolean> {
    // No special permission beyond local network (granted automatically on iOS
    // when the app first makes a local network request).
    return true;
  }

  async discoverDevices(): Promise<CameraDevice[]> {
    const found: CameraDevice[] = [];
    const checkedIps = new Set<string>();

    // 1. Fixed IPs (Canon AP mode defaults)
    for (const ip of CANON_PROBE_FIXED) {
      checkedIps.add(ip);
      const info = await probeCanonCamera(ip);
      if (info) {
        found.push(this._buildDevice(ip, info.model, info.firmware));
      }
    }

    // 2. Derive local subnet from NetInfo and scan nearby hosts
    try {
      const netState = await NetInfo.fetch();
      const localIp = (netState.details as any)?.ipAddress as string | undefined;
      if (localIp) {
        const subnetHits = await scanSubnet(localIp);
        for (const ip of subnetHits) {
          if (checkedIps.has(ip)) continue;
          checkedIps.add(ip);
          const info = await probeCanonCamera(ip);
          if (info) found.push(this._buildDevice(ip, info.model, info.firmware));
        }
      }
    } catch { /* NetInfo optional */ }

    return found;
  }

  async connect(deviceId: string): Promise<void> {
    this._connectionState = 'connecting';
    // deviceId stores the camera IP
    const ip = deviceId;
    try {
      const info = await probeCanonCamera(ip);
      if (!info) throw new Error(`Cannot reach Canon camera at ${ip}:${CCAPI_PORT}`);

      this._cameraIp = ip;
      this._connectedDevice = this._buildDevice(ip, info.model, info.firmware);
      this._connectionState = 'connected';
    } catch (e: any) {
      this._connectionState = 'error';
      this._lastError = makeIntegrationError('CONNECT_FAILED', e.message ?? String(e), 'canon');
      throw this._lastError;
    }
  }

  async disconnect(): Promise<void> {
    this._cameraIp = null;
    this._connectedDevice = null;
    this._connectionState = 'disconnected';
  }

  getConnectionState(): CameraConnectionState {
    return this._connectionState;
  }

  getCapabilities(): CameraCapabilities {
    if (this._connectionState !== 'connected') return ZERO_CAPABILITIES;
    return CanonCCAPIProvider.CAPABILITIES;
  }

  async startPreview(): Promise<void> {
    if (!this._cameraIp) return;
    // CCAPI live-view returns an MJPEG stream URL — rendering is future work.
    // POST /ccapi/ver100/shooting/liveview { "liveviewsize": "small", "cameradisplay": "off" }
    await ccapiFetch(this._cameraIp, '/shooting/liveview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ liveviewsize: 'small', cameradisplay: 'off' }),
    }).catch(console.warn);
  }

  async stopPreview(): Promise<void> {
    if (!this._cameraIp) return;
    await ccapiFetch(this._cameraIp, '/shooting/liveview', { method: 'DELETE' }).catch(console.warn);
  }

  async startRecording(_config: RecordingConfig): Promise<void> {
    if (!this._cameraIp) throw makeIntegrationError('NOT_CONNECTED', 'No camera connected.', 'canon');
    const res = await ccapiFetch(this._cameraIp, '/shooting/control/movierecording', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    });
    if (!res.ok && res.status !== 200) {
      throw makeIntegrationError('RECORD_FAILED', `Movie recording start HTTP ${res.status}`, 'canon');
    }
  }

  async stopRecording(): Promise<string | null> {
    if (!this._cameraIp) return null;
    const res = await ccapiFetch(this._cameraIp, '/shooting/control/movierecording', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
    if (!res.ok) {
      throw makeIntegrationError('RECORD_FAILED', `Movie recording stop HTTP ${res.status}`, 'canon');
    }
    return null; // File will appear in listMedia()
  }

  /** Capture a still photo (full AF + shutter press sequence). */
  async takePhoto(): Promise<void> {
    if (!this._cameraIp) throw makeIntegrationError('NOT_CONNECTED', 'No camera connected.', 'canon');
    await ccapiFetch(this._cameraIp, '/shooting/control/shutterbutton', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ af: true, action: 'full_press' }),
    });
    await new Promise(r => setTimeout(r, 300));
    await ccapiFetch(this._cameraIp, '/shooting/control/shutterbutton', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ af: false, action: 'release' }),
    });
  }

  async listMedia(): Promise<ExternalMediaAsset[]> {
    if (!this._cameraIp) return [];

    // List top-level directories on SD card
    const dirRes = await ccapiFetch(this._cameraIp, '/contents/sd/1');
    if (!dirRes.ok) return [];
    const dirBody = await dirRes.json();
    const directories: string[] = dirBody?.url ?? [];

    const assets: ExternalMediaAsset[] = [];

    for (const dirUrl of directories) {
      // dirUrl is a full URL like http://camera/ccapi/ver100/contents/sd/1/DCIM/100EOS/
      const dirPath = this._urlToPath(dirUrl);
      if (!dirPath) continue;

      const filesRes = await ccapiFetch(this._cameraIp, dirPath).catch(() => null);
      if (!filesRes?.ok) continue;
      const filesBody = await filesRes.json();
      const fileUrls: string[] = filesBody?.url ?? [];

      for (const fileUrl of fileUrls) {
        const filePath = this._urlToPath(fileUrl);
        if (!filePath) continue;
        const filename = filePath.split('/').pop() ?? filePath;
        const isVideo = /\.(MOV|MP4|MXF)$/i.test(filename);
        const isPhoto = /\.(JPG|JPEG|CR2|CR3|RAW|CRW|HEIF)$/i.test(filename);
        if (!isVideo && !isPhoto) continue;

        assets.push({
          id: filePath,           // use the CCAPI relative path as ID
          filename,
          mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
          createdAt: Date.now(), // CCAPI doesn't always return timestamps in listing
          imported: false,
        });
      }
    }

    return assets;
  }

  async importMedia(mediaId: string, destinationPath: string): Promise<ExternalMediaAsset> {
    if (!this._cameraIp) {
      throw makeIntegrationError('NOT_CONNECTED', 'No camera connected.', 'canon');
    }
    // mediaId is a CCAPI relative path e.g. /ccapi/ver100/contents/sd/1/DCIM/100EOS/IMG_0001.JPG
    const downloadUrl = `http://${this._cameraIp}:${CCAPI_PORT}${mediaId}`;
    const result = await FileSystem.downloadAsync(downloadUrl, destinationPath);
    if (result.status !== 200) {
      const err = makeIntegrationError(
        'DOWNLOAD_FAILED',
        `Canon file download HTTP ${result.status} for ${mediaId}`,
        'canon',
      );
      this._lastError = err;
      throw err;
    }

    const filename = mediaId.split('/').pop() ?? mediaId;
    const isVideo = /\.(MOV|MP4|MXF)$/i.test(filename);

    return {
      id: mediaId,
      filename,
      mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
      imported: true,
      localPath: destinationPath,
      createdAt: Date.now(),
    };
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

  // ─── private helpers ────────────────────────────────────────────────────────

  private _buildDevice(ip: string, model: string, firmware: string): CameraDevice {
    return {
      id: ip,           // IP address as device ID
      name: model,
      model,
      firmwareVersion: firmware,
      providerType: 'canon',
    };
  }

  /**
   * Convert a full CCAPI URL returned by the camera API back to a relative path
   * (the part after the camera's host:port).
   */
  private _urlToPath(url: string): string | null {
    try {
      const u = new URL(url);
      return u.pathname;
    } catch {
      return url.startsWith('/') ? url : null;
    }
  }
}
