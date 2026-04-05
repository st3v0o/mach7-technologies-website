import type { CameraProvider } from '../CameraProvider';
import type { CameraProviderType } from '../types';
import { BuiltInPhoneCameraProvider } from './BuiltInPhoneCameraProvider';
import { CanonCCAPIProvider } from './CanonCCAPIProvider';
import { GenericUVCCameraProvider } from './GenericUVCCameraProvider';
import { GoProCameraProvider } from './GoProCameraProvider';
import { Insta360CameraProvider } from './Insta360CameraProvider';
import { MockCameraProvider } from './MockCameraProvider';

export {
  BuiltInPhoneCameraProvider,
  CanonCCAPIProvider,
  GenericUVCCameraProvider,
  GoProCameraProvider,
  Insta360CameraProvider,
  MockCameraProvider,
};

// ─── Provider registry ────────────────────────────────────────────────────────

/**
 * All registered CameraProviders in display order.
 * Add new providers here — the UI and orchestrator will pick them up automatically.
 */
const _registry: CameraProvider[] = [
  new BuiltInPhoneCameraProvider(),
  new MockCameraProvider(),
  new Insta360CameraProvider(),
  new GoProCameraProvider(),
  new CanonCCAPIProvider(),
  new GenericUVCCameraProvider(),
];

/** Returns the full registry (all providers, including unavailable ones). */
export function getAllProviders(): CameraProvider[] {
  return _registry;
}

/** Returns only providers that report available on the current device. */
export function getAvailableProviders(): CameraProvider[] {
  return _registry.filter(p => p.isAvailableOnCurrentDevice());
}

/** Look up a provider by its providerType string. */
export function getProviderById(type: CameraProviderType): CameraProvider | undefined {
  return _registry.find(p => p.providerType === type);
}
