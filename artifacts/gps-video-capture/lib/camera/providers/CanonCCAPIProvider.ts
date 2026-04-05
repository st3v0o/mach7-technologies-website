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

// ─── CCAPI constants ──────────────────────────────────────────────────────────

const CCAPI_PATH = '/ccapi/ver100';
const CCAPI_PORT = 8080;
const PROBE_TIMEOUT_MS = 2000;
const REQUEST_TIMEOUT_MS = 8000;

// Fixed IPs tried unconditionally — covers Canon's Wi-Fi AP mode defaults.
// Subnet scan is performed for ±5 hosts around the phone's own IP, plus common
// router addresses on that subnet.  This covers typical home/studio networks but
// will miss cameras on non-adjacent subnets, VLANs, or enterprise /22+ networks.
// Limitation: no mDNS/Bonjour zero-config path; user can bypass by connecting
// via "Connect to IP" flow (future enhancement) and passing a fixed IP to connect().
const CANON_PROBE_FIXED: string[] = [
  '192.168.1.1',   // Canon Wi-Fi AP default
  '192.168.0.1',
  '192.168.2.1',
];

// ─── REST helpers ─────────────────────────────────────────────────────────────

/**
 * Make a CCAPI REST call.
 * `endpoint` must start with '/' and is the path AFTER `/ccapi/ver100`.
 * e.g. '/deviceinformation' → http://ip:8080/ccapi/ver100/deviceinformation
 */
async function ccapiFetch(
  cameraIp: string,
  endpoint: string,
  opts: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(
      `http://${cameraIp}:${CCAPI_PORT}${CCAPI_PATH}${endpoint}`,
      { ...opts, signal: ctrl.signal },
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The camera API returns full absolute URLs like:
 *   http://192.168.1.1:8080/ccapi/ver100/contents/sd/1/DCIM/100EOS/
 *
 * This function strips the scheme+host+port prefix, returning the full
 * absolute path (/ccapi/ver100/…).  Callers that need to pass to ccapiFetch
 * must also strip the CCAPI_PATH prefix.
 */
function extractAbsolutePath(url: string): string | null {
  try {
    return new URL(url).pathname;
  } catch {
    return url.startsWith('/') ? url : null;
  }
}

/**
 * Strip /ccapi/ver100 prefix so the result can be passed directly to ccapiFetch.
 * Returns the path unchanged if it doesn't start with the prefix.
 */
function toEndpoint(absolutePath: string): string {
  if (absolutePath.startsWith(CCAPI_PATH)) {
    return absolutePath.slice(CCAPI_PATH.length);
  }
  return absolutePath;
}

// ─── Discovery helpers ────────────────────────────────────────────────────────

async function probeCanonCamera(ip: string): Promise<{ model: string; firmware: string } | null> {
  try {
    const res = await ccapiFetch(ip, '/deviceinformation', {}, PROBE_TIMEOUT_MS);
    if (!res.ok) return null;
    const body: Record<string, unknown> = await res.json();
    return {
      model: String(body.productname ?? body.model ?? 'Canon Camera'),
      firmware: String(body.firmwareversion ?? ''),
    };
  } catch {
    return null;
  }
}

async function scanSubnet(localIp: string): Promise<string[]> {
  const parts = localIp.split('.');
  if (parts.length !== 4) return [];
  const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const myHost = parseInt(parts[3], 10);

  const candidates = new Set<number>();
  for (let i = Math.max(1, myHost - 5); i <= Math.min(254, myHost + 5); i++) candidates.add(i);
  [1, 2, 100, 101, 200, 201].forEach(h => candidates.add(h));
  candidates.delete(myHost);

  const ips = Array.from(candidates).map(h => `${prefix}.${h}`);
  const probes = await Promise.allSettled(ips.map(ip => probeCanonCamera(ip)));
  return ips.filter((_, i) => {
    const r = probes[i];
    return r.status === 'fulfilled' && r.value !== null;
  });
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
  private _liveviewUrl: string | null = null;

  private static readonly CAPABILITIES: CameraCapabilities = {
    supportsPreview: false,              // MJPEG live-view URL is stored but not rendered
    supportsStartStopRecording: true,
    supportsPhotoCapture: true,
    supportsMediaImport: true,
    supportsLiveStream: false,
    supportsCameraGPS: false,
    supportsExposureControl: true,
    supportsResolutionSelection: false,
    supportsFrameRateSelection: false,
    supportsWirelessConnection: true,
    supportsWiredConnection: false,
  };

  isAvailableOnCurrentDevice(): boolean {
    return true; // Wi-Fi is always available on iOS
  }

  async requestPermissionsIfNeeded(): Promise<boolean> {
    return true;
  }

  async discoverDevices(): Promise<CameraDevice[]> {
    const found: CameraDevice[] = [];
    const checkedIps = new Set<string>();

    // 1. Fixed IPs (Canon AP mode defaults)
    for (const ip of CANON_PROBE_FIXED) {
      checkedIps.add(ip);
      const info = await probeCanonCamera(ip);
      if (info) found.push(this._buildDevice(ip, info.model, info.firmware));
    }

    // 2. Derive local subnet via NetInfo and scan nearby hosts
    try {
      const netState = await NetInfo.fetch('wifi');
      const wifiDetails = netState.details as { ipAddress: string | null } | null;
      const localIp = wifiDetails?.ipAddress ?? null;
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
    const ip = deviceId;
    try {
      const info = await probeCanonCamera(ip);
      if (!info) throw new Error(`Cannot reach Canon CCAPI at ${ip}:${CCAPI_PORT}`);

      this._cameraIp = ip;
      this._connectedDevice = this._buildDevice(ip, info.model, info.firmware);
      this._connectionState = 'connected';
    } catch (e: unknown) {
      this._connectionState = 'error';
      const msg = e instanceof Error ? e.message : String(e);
      this._lastError = makeIntegrationError('CONNECT_FAILED', msg, 'canon');
      throw this._lastError;
    }
  }

  async disconnect(): Promise<void> {
    this._cameraIp = null;
    this._connectedDevice = null;
    this._liveviewUrl = null;
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
    // POST /ccapi/ver100/shooting/liveview — returns an MJPEG stream URL.
    // Store the URL for future use; rendering MJPEG is deferred (out-of-scope).
    try {
      const res = await ccapiFetch(this._cameraIp, '/shooting/liveview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liveviewsize: 'small', cameradisplay: 'off' }),
      });
      if (res.ok) {
        const body: Record<string, unknown> = await res.json();
        this._liveviewUrl = typeof body.url === 'string' ? body.url : null;
      }
    } catch { /* best-effort */ }
  }

  async stopPreview(): Promise<void> {
    if (!this._cameraIp) return;
    await ccapiFetch(this._cameraIp, '/shooting/liveview', { method: 'DELETE' }).catch(() => {});
    this._liveviewUrl = null;
  }

  async startRecording(_config: RecordingConfig): Promise<void> {
    if (!this._cameraIp) throw makeIntegrationError('NOT_CONNECTED', 'No camera connected.', 'canon');
    const ip = this._cameraIp;

    // 1. Switch to Movie mode via shooting control endpoint
    await ccapiFetch(ip, '/shooting/control/shootingmode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'movie' }),
    }).catch(() => {});  // some bodies do not support this control; continue anyway

    // 2. Run autofocus before starting
    await ccapiFetch(ip, '/shooting/control/af', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});

    // 3. Start movie recording
    const res = await ccapiFetch(ip, '/shooting/control/movierecording', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    });
    if (!res.ok) {
      throw makeIntegrationError('RECORD_FAILED', `Movie start HTTP ${res.status}`, 'canon');
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
      throw makeIntegrationError('RECORD_FAILED', `Movie stop HTTP ${res.status}`, 'canon');
    }
    return null; // File appears in listMedia()
  }

  /** Capture a still photo: AF → full shutter press → release. */
  async takePhoto(): Promise<void> {
    if (!this._cameraIp) throw makeIntegrationError('NOT_CONNECTED', 'No camera connected.', 'canon');
    const ip = this._cameraIp;

    // Autofocus
    await ccapiFetch(ip, '/shooting/control/af', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});

    // Full shutter press
    await ccapiFetch(ip, '/shooting/control/shutterbutton', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ af: false, action: 'full_press' }),
    });
    await new Promise(r => setTimeout(r, 300));

    // Release
    await ccapiFetch(ip, '/shooting/control/shutterbutton', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ af: false, action: 'release' }),
    });
  }

  async listMedia(): Promise<ExternalMediaAsset[]> {
    if (!this._cameraIp) return [];
    const ip = this._cameraIp;

    // List directories on SD card slot 1
    const dirRes = await ccapiFetch(ip, '/contents/sd/1').catch(() => null);
    if (!dirRes?.ok) return [];
    const dirBody: { url?: string[] } = await dirRes.json();
    const dirUrls = dirBody.url ?? [];

    const assets: ExternalMediaAsset[] = [];

    for (const dirUrl of dirUrls) {
      // dirUrl is a full camera URL, e.g. http://ip:8080/ccapi/ver100/contents/sd/1/DCIM/100EOS/
      const absoluteDirPath = extractAbsolutePath(dirUrl);
      if (!absoluteDirPath) continue;
      const dirEndpoint = toEndpoint(absoluteDirPath); // /contents/sd/1/DCIM/100EOS/

      const filesRes = await ccapiFetch(ip, dirEndpoint).catch(() => null);
      if (!filesRes?.ok) continue;
      const filesBody: { url?: string[] } = await filesRes.json();
      const fileUrls = filesBody.url ?? [];

      for (const fileUrl of fileUrls) {
        const absoluteFilePath = extractAbsolutePath(fileUrl);
        if (!absoluteFilePath) continue;
        const filename = absoluteFilePath.split('/').pop() ?? absoluteFilePath;
        const isVideo = /\.(MOV|MP4|MXF)$/i.test(filename);
        const isPhoto = /\.(JPG|JPEG|CR2|CR3|RAW|CRW|HEIF)$/i.test(filename);
        if (!isVideo && !isPhoto) continue;

        assets.push({
          // Store the full absolute path (/ccapi/ver100/…) as the ID so
          // importMedia() can build the download URL by prepending http://ip:port
          id: absoluteFilePath,
          filename,
          mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
          createdAt: Date.now(),
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
    // mediaId is the full absolute path: /ccapi/ver100/contents/sd/1/DCIM/.../IMG_0001.JPG
    const downloadUrl = `http://${this._cameraIp}:${CCAPI_PORT}${mediaId}`;
    const result = await FileSystem.downloadAsync(downloadUrl, destinationPath);
    if (result.status !== 200) {
      const err = makeIntegrationError(
        'DOWNLOAD_FAILED',
        `Canon download HTTP ${result.status} for ${mediaId}`,
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
      id: ip,
      name: model,
      model,
      firmwareVersion: firmware,
      providerType: 'canon',
    };
  }
}
