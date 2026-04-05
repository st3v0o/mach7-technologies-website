/**
 * insta360-camera — Public JS API
 *
 * SDK_BINARY_REQUIRED: all functions are no-ops until the Insta360 Open SDK
 * binary is linked.  See docs/ManualVendorSDKHookupSteps.md.
 */

// ─── Event payload type ───────────────────────────────────────────────────────
// Defined here (not in Insta360CameraModule.ts) to avoid circular imports.

export interface Insta360TelemetryEvent {
  type: 'gps' | 'battery' | 'status';
  /** Valid when type === 'gps' */
  latitude?: number;
  longitude?: number;
  altitude?: number;
  speed?: number;
  /** Valid when type === 'battery' */
  batteryLevel?: number;   // 0–1 float
  /** MS since epoch for the sample */
  timestamp?: number;
}

// ─── Re-exported module API ───────────────────────────────────────────────────

export {
  native as Insta360Camera,
  addTelemetryListener,
  isNativeModuleAvailable as isInsta360Available,
} from './Insta360CameraModule';

export type { Insta360NativeModule } from './Insta360CameraModule';
