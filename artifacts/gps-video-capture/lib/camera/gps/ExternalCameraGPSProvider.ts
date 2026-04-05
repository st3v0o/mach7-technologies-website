import type { CameraProvider } from '../CameraProvider';
import type { GPSProvider } from '../GPSProvider';
import type { GPSPoint, GPSProviderType } from '../types';

/**
 * ExternalCameraGPSProvider
 *
 * Ingests GPS telemetry from a connected CameraProvider.
 * Works only when the provider's capabilities.supportsCameraGPS === true.
 *
 * GPS samples are typically pushed by the camera SDK (via a polling loop or
 * a telemetry callback).  Because vendor GPS streams vary, the actual ingestion
 * mechanism must be wired inside each CameraProvider's SDK hookup — the camera
 * provider calls `ingestPoint()` on this provider whenever it receives a
 * GPS sample from the camera hardware.
 *
 * For post-processing GPS (e.g. GoPro GPMF), importMedia() extracts GPS from
 * the file and calls ingestPoints() after import.
 */
export class ExternalCameraGPSProvider implements GPSProvider {
  readonly id = 'external_camera';
  readonly displayName = 'Camera GPS';
  readonly providerType: GPSProviderType = 'external_camera';

  private _camera: CameraProvider | null = null;
  private _current: GPSPoint | null = null;
  private _health: 'good' | 'degraded' | 'unavailable' = 'unavailable';
  private _callbacks = new Set<(point: GPSPoint) => void>();
  private _activeSessions = new Set<string>();

  /**
   * Attach a CameraProvider.  Call this whenever the user selects a camera.
   * The ExternalCameraGPSProvider checks whether the camera supports GPS
   * and updates its health accordingly.
   */
  attachCamera(camera: CameraProvider | null): void {
    this._camera = camera;
    const supported = camera?.getCapabilities().supportsCameraGPS ?? false;
    if (!supported) {
      this._health = 'unavailable';
      this._current = null;
    }
  }

  async requestPermissionsIfNeeded(): Promise<boolean> {
    // GPS from camera hardware — no separate iOS permission needed.
    // The camera connection permission is handled by the CameraProvider.
    const supported = this._camera?.getCapabilities().supportsCameraGPS ?? false;
    return supported;
  }

  async startLocationStream(sessionId: string): Promise<void> {
    this._activeSessions.add(sessionId);
    const supported = this._camera?.getCapabilities().supportsCameraGPS ?? false;
    if (!supported) {
      this._health = 'unavailable';
      return;
    }
    // TODO: start a polling loop or register a telemetry callback with the
    // camera SDK here.  For Insta360, subscribe to the gyroscope/GPS delegate.
    // For GoPro, GPS is not live — mark as unavailable until post-import.
    this._health = 'degraded'; // will upgrade to 'good' on first point received
  }

  stopLocationStream(sessionId: string): void {
    this._activeSessions.delete(sessionId);
    if (this._activeSessions.size > 0) return;
    // TODO: unregister telemetry callback / stop polling loop.
    this._health = 'unavailable';
    this._current = null;
  }

  /**
   * Called by the CameraProvider (or GPS polling loop) when a new GPS fix
   * arrives from the camera.  Normalises the source field to 'camera'.
   */
  ingestPoint(raw: Omit<GPSPoint, 'source'>): void {
    const point: GPSPoint = { ...raw, source: 'camera' };
    this._current = point;
    this._health = 'good';
    this._callbacks.forEach(cb => cb(point));
  }

  /**
   * Bulk-ingest GPS points from post-processed media (e.g. GPMF extraction).
   * Points are emitted in chronological order to all subscribers.
   */
  ingestPoints(raws: Omit<GPSPoint, 'source'>[]): void {
    for (const raw of raws) {
      this.ingestPoint(raw);
    }
  }

  getCurrentLocation(): GPSPoint | null {
    return this._current;
  }

  getHealthStatus(): 'good' | 'degraded' | 'unavailable' {
    if (!this._camera?.getCapabilities().supportsCameraGPS) return 'unavailable';
    return this._health;
  }

  onLocationUpdate(callback: (point: GPSPoint) => void): () => void {
    this._callbacks.add(callback);
    return () => this._callbacks.delete(callback);
  }
}
