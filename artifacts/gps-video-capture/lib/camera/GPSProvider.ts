import type { GPSPoint, GPSProviderType } from './types';

/**
 * GPSProvider — every GPS backend (iOS CoreLocation, external camera,
 * hybrid combiner) implements this interface.
 */
export interface GPSProvider {
  // ── Identity ────────────────────────────────────────────────────────────
  readonly id: string;
  readonly displayName: string;
  readonly providerType: GPSProviderType;

  // ── Lifecycle ───────────────────────────────────────────────────────────
  requestPermissionsIfNeeded(): Promise<boolean>;

  /** Begin emitting location updates for the given session. */
  startLocationStream(sessionId: string): Promise<void>;

  /** Stop emitting location updates and release resources. */
  stopLocationStream(sessionId: string): void;

  // ── Data ────────────────────────────────────────────────────────────────
  /** Most recent GPS point, or null if no fix yet. */
  getCurrentLocation(): GPSPoint | null;

  /** Overall health of this provider's location signal. */
  getHealthStatus(): 'good' | 'degraded' | 'unavailable';

  /**
   * Register a callback that fires on every new GPSPoint.
   * @returns An unsubscribe function.
   */
  onLocationUpdate(callback: (point: GPSPoint) => void): () => void;
}
