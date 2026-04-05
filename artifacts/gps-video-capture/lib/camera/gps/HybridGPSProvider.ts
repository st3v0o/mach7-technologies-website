import type { GPSProvider } from '../GPSProvider';
import type { GPSPoint, GPSProviderType } from '../types';

/**
 * HybridGPSProvider
 *
 * Combines a primary GPS source (external camera) with a fallback source
 * (iPhone CoreLocation).  Prefers the camera GPS when healthy; falls back
 * automatically when the camera GPS is degraded or unavailable.
 *
 * Each emitted GPSPoint carries a source field:
 *   'camera'         — came from the external camera, health = good
 *   'phone'          — came from iPhone CoreLocation
 *   'hybrid_fallback'— fallback triggered because camera GPS was not good
 */
export class HybridGPSProvider implements GPSProvider {
  readonly id = 'hybrid';
  readonly displayName = 'Hybrid GPS (Camera + iPhone)';
  readonly providerType: GPSProviderType = 'hybrid';

  private _callbacks = new Set<(point: GPSPoint) => void>();
  private _cameraUnsub: (() => void) | null = null;
  private _phoneUnsub: (() => void) | null = null;
  private _current: GPSPoint | null = null;
  private _activeSessions = new Set<string>();

  constructor(
    private readonly cameraGPS: GPSProvider,
    private readonly phoneGPS: GPSProvider,
  ) {}

  async requestPermissionsIfNeeded(): Promise<boolean> {
    const [phone] = await Promise.all([
      this.phoneGPS.requestPermissionsIfNeeded(),
      this.cameraGPS.requestPermissionsIfNeeded(),
    ]);
    // Phone GPS is the mandatory fallback — require it.
    return phone;
  }

  async startLocationStream(sessionId: string): Promise<void> {
    this._activeSessions.add(sessionId);

    await Promise.all([
      this.phoneGPS.startLocationStream(sessionId),
      this.cameraGPS.startLocationStream(sessionId),
    ]);

    // Subscribe to camera GPS
    this._cameraUnsub = this.cameraGPS.onLocationUpdate(point => {
      this._emit({ ...point, source: 'camera' });
    });

    // Subscribe to phone GPS — only emitted when camera GPS is not good
    this._phoneUnsub = this.phoneGPS.onLocationUpdate(point => {
      const cameraHealth = this.cameraGPS.getHealthStatus();
      if (cameraHealth !== 'good') {
        this._emit({
          ...point,
          source: cameraHealth === 'unavailable' ? 'phone' : 'hybrid_fallback',
        });
      }
    });
  }

  stopLocationStream(sessionId: string): void {
    this._activeSessions.delete(sessionId);
    if (this._activeSessions.size > 0) return;

    this._cameraUnsub?.();
    this._cameraUnsub = null;
    this._phoneUnsub?.();
    this._phoneUnsub = null;

    this.cameraGPS.stopLocationStream(sessionId);
    this.phoneGPS.stopLocationStream(sessionId);
    this._current = null;
  }

  getCurrentLocation(): GPSPoint | null {
    // Prefer camera GPS current location
    const camCurrent = this.cameraGPS.getCurrentLocation();
    if (camCurrent && this.cameraGPS.getHealthStatus() === 'good') return camCurrent;
    return this.phoneGPS.getCurrentLocation();
  }

  getHealthStatus(): 'good' | 'degraded' | 'unavailable' {
    const cameraHealth = this.cameraGPS.getHealthStatus();
    const phoneHealth = this.phoneGPS.getHealthStatus();

    if (cameraHealth === 'good') return 'good';
    if (phoneHealth === 'good') return 'degraded'; // using fallback
    if (phoneHealth === 'degraded') return 'degraded';
    return 'unavailable';
  }

  onLocationUpdate(callback: (point: GPSPoint) => void): () => void {
    this._callbacks.add(callback);
    return () => this._callbacks.delete(callback);
  }

  private _emit(point: GPSPoint): void {
    this._current = point;
    this._callbacks.forEach(cb => cb(point));
  }
}
