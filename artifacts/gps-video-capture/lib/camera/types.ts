// ─── Enum-like string unions ──────────────────────────────────────────────────

export type CameraProviderType =
  | 'builtin'
  | 'insta360'
  | 'gopro'
  | 'canon'
  | 'generic_uvc'
  | 'mock';

export type GPSProviderType =
  | 'ios_core_location'
  | 'external_camera'
  | 'hybrid';

export type GPSSourceType = 'phone' | 'camera' | 'hybrid_fallback';

export type CameraConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export type RecordingState =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'stopping'
  | 'error';

// ─── Camera device ────────────────────────────────────────────────────────────

export interface CameraDevice {
  id: string;
  name: string;
  model?: string;
  firmwareVersion?: string;
  batteryLevel?: number;          // 0–1
  signalStrength?: number;        // 0–1
  providerType: CameraProviderType;
}

// ─── Capability model ─────────────────────────────────────────────────────────

export interface CameraCapabilities {
  supportsPreview: boolean;
  supportsStartStopRecording: boolean;
  supportsPhotoCapture: boolean;
  supportsMediaImport: boolean;
  supportsLiveStream: boolean;
  supportsCameraGPS: boolean;
  supportsExposureControl: boolean;
  supportsResolutionSelection: boolean;
  supportsFrameRateSelection: boolean;
  supportsWirelessConnection: boolean;
  supportsWiredConnection: boolean;
}

export const ZERO_CAPABILITIES: CameraCapabilities = {
  supportsPreview: false,
  supportsStartStopRecording: false,
  supportsPhotoCapture: false,
  supportsMediaImport: false,
  supportsLiveStream: false,
  supportsCameraGPS: false,
  supportsExposureControl: false,
  supportsResolutionSelection: false,
  supportsFrameRateSelection: false,
  supportsWirelessConnection: false,
  supportsWiredConnection: false,
};

// ─── GPS ──────────────────────────────────────────────────────────────────────

export interface GPSPoint {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;       // m/s
  heading?: number;     // degrees true north
  source: GPSSourceType;
}

// ─── Media ────────────────────────────────────────────────────────────────────

export interface ExternalMediaAsset {
  id: string;
  filename: string;
  mimeType: string;
  durationMs?: number;
  sizeBytes?: number;
  thumbnailUri?: string;
  createdAt: number;
  imported: boolean;
  localPath?: string;
}

// ─── Recording configuration ──────────────────────────────────────────────────

export interface RecordingConfig {
  resolution?: string;       // e.g. "3840x2160"
  frameRate?: number;        // e.g. 30
  bitrateMbps?: number;
  stabilization?: boolean;
  mute?: boolean;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface CaptureSession {
  sessionId: string;
  providerType: CameraProviderType;
  deviceId?: string;
  deviceName?: string;
  gpsMode: GPSProviderType;
  startTimestamp: number;
  endTimestamp?: number;
  recordingState: RecordingState;
  importedMediaIds: string[];
  gpsPoints: GPSPoint[];
  capabilities: CameraCapabilities;
  errorLog: string[];
}

export interface CaptureSessionTelemetry {
  sessionId: string;
  batteryLevel?: number;
  signalStrength?: number;
  gpsHealth: 'good' | 'degraded' | 'unavailable';
  gpsSource: GPSSourceType;
  recordingDurationMs: number;
  frameCount: number;
  errorCount: number;
}

// ─── Error ────────────────────────────────────────────────────────────────────

export interface AppIntegrationError {
  code: string;
  message: string;
  providerType?: CameraProviderType;
  recoverable: boolean;
  timestamp: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function makeIntegrationError(
  code: string,
  message: string,
  providerType?: CameraProviderType,
  recoverable = true
): AppIntegrationError {
  return { code, message, providerType, recoverable, timestamp: Date.now() };
}
