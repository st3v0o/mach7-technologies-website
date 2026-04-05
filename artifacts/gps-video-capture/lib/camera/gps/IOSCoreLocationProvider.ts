import type { GPSProvider } from '../GPSProvider';
import type { GPSPoint, GPSProviderType } from '../types';

/**
 * IOSCoreLocationProvider
 *
 * GPS source backed by iOS CoreLocation (expo-location).
 * This is the primary and always-available GPS source on iPhone.
 */
export class IOSCoreLocationProvider implements GPSProvider {
  readonly id = 'ios_core_location';
  readonly displayName = 'iPhone GPS';
  readonly providerType: GPSProviderType = 'ios_core_location';

  private _current: GPSPoint | null = null;
  private _health: 'good' | 'degraded' | 'unavailable' = 'unavailable';
  private _callbacks = new Set<(point: GPSPoint) => void>();
  private _subscription: { remove: () => void } | null = null;
  private _activeSessions = new Set<string>();

  async requestPermissionsIfNeeded(): Promise<boolean> {
    // expo-location permission is already managed by RecordingContext.
    // If you need an isolated check here, import from 'expo-location':
    //
    // const { status } = await Location.requestForegroundPermissionsAsync();
    // return status === 'granted';
    return true;
  }

  async startLocationStream(sessionId: string): Promise<void> {
    this._activeSessions.add(sessionId);
    if (this._subscription) return; // already running

    // TODO: replace with real expo-location subscription if this provider is
    // used standalone (outside RecordingContext).
    //
    // import * as Location from 'expo-location';
    // this._subscription = await Location.watchPositionAsync(
    //   { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000 },
    //   (loc) => {
    //     const point: GPSPoint = {
    //       timestamp: loc.timestamp,
    //       latitude: loc.coords.latitude,
    //       longitude: loc.coords.longitude,
    //       altitude: loc.coords.altitude ?? undefined,
    //       accuracy: loc.coords.accuracy ?? undefined,
    //       speed: loc.coords.speed ?? undefined,
    //       heading: loc.coords.heading ?? undefined,
    //       source: 'phone',
    //     };
    //     this._current = point;
    //     this._health = 'good';
    //     this._callbacks.forEach(cb => cb(point));
    //   }
    // );
  }

  stopLocationStream(sessionId: string): void {
    this._activeSessions.delete(sessionId);
    if (this._activeSessions.size > 0) return; // other sessions still active
    this._subscription?.remove();
    this._subscription = null;
    this._health = 'unavailable';
  }

  /** Called by RecordingContext to push an existing GPS point into this provider. */
  ingestPoint(point: GPSPoint): void {
    const adapted: GPSPoint = { ...point, source: 'phone' };
    this._current = adapted;
    this._health = 'good';
    this._callbacks.forEach(cb => cb(adapted));
  }

  getCurrentLocation(): GPSPoint | null {
    return this._current;
  }

  getHealthStatus(): 'good' | 'degraded' | 'unavailable' {
    return this._health;
  }

  onLocationUpdate(callback: (point: GPSPoint) => void): () => void {
    this._callbacks.add(callback);
    return () => this._callbacks.delete(callback);
  }
}
