import type { CameraProvider } from './CameraProvider';
import type { GPSProvider } from './GPSProvider';
import {
  ExternalCameraGPSProvider,
  HybridGPSProvider,
  IOSCoreLocationProvider,
} from './gps';
import { generateSessionId, saveSession } from './persistence';
import type {
  AppIntegrationError,
  CaptureSession,
  CaptureSessionTelemetry,
  GPSPoint,
  GPSProviderType,
  RecordingConfig,
  RecordingState,
} from './types';
import { makeIntegrationError } from './types';

export type OrchestratorEvent =
  | { type: 'connectionStateChanged' }
  | { type: 'recordingStateChanged'; state: RecordingState }
  | { type: 'gpsPoint'; point: GPSPoint }
  | { type: 'mediaAvailable'; mediaId: string }
  | { type: 'error'; error: AppIntegrationError }
  | { type: 'sessionEnded'; session: CaptureSession };

type EventCallback = (event: OrchestratorEvent) => void;

/**
 * CaptureSessionOrchestrator
 *
 * Central coordinator for external camera sessions.
 * Manages:
 *  - Camera provider connection lifecycle
 *  - GPS provider lifecycle (CoreLocation, camera GPS, or hybrid)
 *  - Recording start/stop/pause/resume
 *  - GPS track-segment accumulation (each pause opens a new segment)
 *  - Session persistence to AsyncStorage
 *  - Error propagation and recovery
 *
 * Pause / resume:
 *   pauseRecording()  — stops recording on the external camera (most cameras
 *                       do not support a native pause API), seals the current
 *                       GPS track segment, and sets state → 'paused'.
 *   resumeRecording() — opens a fresh GPS segment and restarts recording,
 *                       setting state → 'recording'.
 *
 *   getGpsSegments()  — returns the accumulated GPS track segments; each
 *                       element is one continuous segment to be written as a
 *                       separate <trkseg> in the exported GPX file.
 */
export class CaptureSessionOrchestrator {
  // ── Dependencies ────────────────────────────────────────────────────────────
  private _camera: CameraProvider | null = null;
  private _gpsMode: GPSProviderType = 'ios_core_location';
  private _gpsProvider: GPSProvider | null = null;

  private readonly _phoneGPS = new IOSCoreLocationProvider();
  private readonly _cameraGPS = new ExternalCameraGPSProvider();
  private _hybridGPS: HybridGPSProvider | null = null;

  // ── Session state ───────────────────────────────────────────────────────────
  private _session: CaptureSession | null = null;
  private _recordingState: RecordingState = 'idle';
  private _gpsUnsub: (() => void) | null = null;

  // ── GPS segment tracking ─────────────────────────────────────────────────────
  // Sealed segments (each is one continuous block of GPS points).
  private _gpsSegments: GPSPoint[][] = [];
  // Points being collected in the currently open segment.
  private _currentSegmentPoints: GPSPoint[] = [];
  // Whether GPS is paused (new points are not added to the current segment).
  private _isPaused = false;

  // ── Listeners ───────────────────────────────────────────────────────────────
  private _listeners = new Set<EventCallback>();

  // ── Public API: events ──────────────────────────────────────────────────────

  onEvent(cb: EventCallback): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  private _emit(event: OrchestratorEvent): void {
    this._listeners.forEach(cb => cb(event));
  }

  // ── Public API: camera selection ────────────────────────────────────────────

  async setCamera(provider: CameraProvider): Promise<void> {
    if (this._camera && this._camera.getConnectionState() === 'connected') {
      await this._camera.disconnect().catch(() => {});
    }
    this._camera = provider;
    this._cameraGPS.attachCamera(provider);
    this._emit({ type: 'connectionStateChanged' });
  }

  async discoverDevices() {
    if (!this._camera) return [];
    return this._camera.discoverDevices();
  }

  async connectDevice(deviceId: string): Promise<void> {
    if (!this._camera) throw this._makeError('NO_CAMERA', 'No camera provider selected.');
    await this._camera.connect(deviceId);
    this._emit({ type: 'connectionStateChanged' });
  }

  async disconnectDevice(): Promise<void> {
    if (this._session) await this.endSession();
    await this._camera?.disconnect();
    this._emit({ type: 'connectionStateChanged' });
  }

  // ── Public API: GPS mode ────────────────────────────────────────────────────

  setGPSMode(mode: GPSProviderType): void {
    this._gpsMode = mode;
    this._hybridGPS = mode === 'hybrid'
      ? new HybridGPSProvider(this._cameraGPS, this._phoneGPS)
      : null;
  }

  getGPSMode(): GPSProviderType {
    return this._gpsMode;
  }

  // ── Public API: GPS segments ────────────────────────────────────────────────

  /**
   * Returns a copy of all sealed GPS track segments plus any currently open
   * segment.  Use this to build a multi-segment GPX file.
   */
  getGpsSegments(): GPSPoint[][] {
    const result = [...this._gpsSegments];
    if (this._currentSegmentPoints.length > 0) {
      result.push([...this._currentSegmentPoints]);
    }
    return result;
  }

  // ── Public API: session lifecycle ───────────────────────────────────────────

  async startSession(): Promise<CaptureSession> {
    this._guard();
    const provider = this._camera!;

    if (!await provider.requestPermissionsIfNeeded()) {
      throw this._makeError('PERMISSION_DENIED', 'Camera permission was not granted.');
    }

    const sessionId = generateSessionId();
    const session: CaptureSession = {
      sessionId,
      providerType: provider.providerType,
      deviceId: undefined,
      deviceName: undefined,
      gpsMode: this._gpsMode,
      startTimestamp: Date.now(),
      recordingState: 'idle',
      importedMediaIds: [],
      gpsPoints: [],
      capabilities: provider.getCapabilities(),
      errorLog: [],
    };
    this._session = session;

    // Reset GPS segment state
    this._gpsSegments = [];
    this._currentSegmentPoints = [];
    this._isPaused = false;

    // Start GPS
    const gpsProvider = this._resolveGPSProvider();
    this._gpsProvider = gpsProvider;
    await gpsProvider.requestPermissionsIfNeeded();
    await gpsProvider.startLocationStream(sessionId);
    this._gpsUnsub = gpsProvider.onLocationUpdate(point => {
      // Always push to flat session list (for telemetry / backward-compat).
      this._session?.gpsPoints.push(point);
      // Only push to the current segment when not paused.
      if (!this._isPaused) {
        this._currentSegmentPoints.push(point);
      }
      this._emit({ type: 'gpsPoint', point });
    });

    await saveSession(session);
    return session;
  }

  async endSession(): Promise<CaptureSession | null> {
    if (!this._session) return null;

    if (this._recordingState === 'recording' || this._recordingState === 'paused') {
      await this._stopCameraRecordingQuiet();
    }

    const sid = this._session.sessionId;
    this._gpsProvider?.stopLocationStream(sid);
    this._gpsUnsub?.();
    this._gpsUnsub = null;

    // Seal any open GPS segment.
    this._sealCurrentSegment();

    this._session.endTimestamp = Date.now();
    this._session.recordingState = 'idle';

    await saveSession(this._session);
    const finished = { ...this._session };
    this._session = null;
    this._recordingState = 'idle';
    this._isPaused = false;

    this._emit({ type: 'sessionEnded', session: finished });
    return finished;
  }

  // ── Public API: recording ───────────────────────────────────────────────────

  async startRecording(config: RecordingConfig = {}): Promise<void> {
    this._guard();
    if (this._recordingState !== 'idle') {
      throw this._makeError('ALREADY_RECORDING', 'A recording is already in progress.');
    }
    this._setRecordingState('starting');
    try {
      await this._camera!.startRecording(config);
      this._setRecordingState('recording');
    } catch (e: unknown) {
      this._setRecordingState('error');
      const msg = e instanceof Error ? e.message : String(e);
      const err = this._makeError('RECORDING_START_FAILED', msg);
      this._session?.errorLog.push(err.message);
      throw err;
    }
  }

  async stopRecording(): Promise<string | null> {
    if (this._recordingState !== 'recording' && this._recordingState !== 'paused') return null;
    this._setRecordingState('stopping');
    try {
      const mediaId = await this._camera!.stopRecording();
      this._setRecordingState('idle');
      if (mediaId) {
        this._session?.importedMediaIds.push(mediaId);
        this._emit({ type: 'mediaAvailable', mediaId });
      }
      if (this._session) await saveSession(this._session);
      return mediaId;
    } catch (e: unknown) {
      this._setRecordingState('error');
      const msg = e instanceof Error ? e.message : String(e);
      const err = this._makeError('RECORDING_STOP_FAILED', msg);
      this._session?.errorLog.push(err.message);
      throw err;
    }
  }

  /**
   * Pause: stop the external camera recording, seal the current GPS segment,
   * and transition to 'paused' state.
   *
   * Most external cameras (GoPro, Canon CCAPI, UVC, Insta360) do not expose a
   * native pause API, so pause is implemented as stop + resume-as-new-recording.
   */
  async pauseRecording(): Promise<void> {
    if (this._recordingState !== 'recording') return;

    // Seal current GPS segment.
    this._sealCurrentSegment();
    this._isPaused = true;

    // Stop the physical recording; the media clip is saved.
    this._setRecordingState('stopping');
    try {
      const mediaId = await this._camera!.stopRecording();
      if (mediaId) {
        this._session?.importedMediaIds.push(mediaId);
        this._emit({ type: 'mediaAvailable', mediaId });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this._session?.errorLog.push(`pause: ${msg}`);
    }

    if (this._session) await saveSession(this._session).catch(() => {});
    this._setRecordingState('paused');
  }

  /**
   * Resume: open a fresh GPS segment and restart recording.
   */
  async resumeRecording(config: RecordingConfig = {}): Promise<void> {
    if (this._recordingState !== 'paused') return;

    // Open a new GPS segment.
    this._currentSegmentPoints = [];
    this._isPaused = false;

    this._setRecordingState('starting');
    try {
      await this._camera!.startRecording(config);
      this._setRecordingState('recording');
    } catch (e: unknown) {
      this._setRecordingState('error');
      const msg = e instanceof Error ? e.message : String(e);
      const err = this._makeError('RECORDING_START_FAILED', msg);
      this._session?.errorLog.push(err.message);
      throw err;
    }
  }

  // ── Public API: media ───────────────────────────────────────────────────────

  async listMedia() {
    return this._camera?.listMedia() ?? [];
  }

  async importMedia(mediaId: string, destinationPath: string) {
    if (!this._camera) throw this._makeError('NO_CAMERA', 'No camera provider selected.');
    const asset = await this._camera.importMedia(mediaId, destinationPath);

    // If the provider can extract GPS from the media file (e.g. GoPro GPMF),
    // ingest those points into the camera GPS provider and the active session.
    if (this._camera.extractGpsPoints && asset.localPath) {
      try {
        const pts = await this._camera.extractGpsPoints(asset.localPath);
        if (pts.length > 0) {
          // Ingest via the ExternalCameraGPSProvider.  In 'external_camera' and
          // 'hybrid' GPS modes the session subscription (_gpsUnsub) is already
          // watching _cameraGPS, so ingestPoints() alone pushes points to the
          // session without duplication.  In 'ios_core_location' mode the session
          // listener watches the phone GPS instead, so we push directly here to
          // avoid losing the imported GPS track.
          this._cameraGPS.ingestPoints(pts);
          if (this._gpsMode === 'ios_core_location') {
            const withSource = pts.map(p => ({ ...p, source: 'camera' as const }));
            withSource.forEach(p => this._session?.gpsPoints.push(p));
          }
        }
      } catch (e) {
        console.warn('[Orchestrator] extractGpsPoints failed:', e);
      }
    }

    return asset;
  }

  // ── Public API: state reads ─────────────────────────────────────────────────

  getSession(): CaptureSession | null {
    return this._session;
  }

  getRecordingState(): RecordingState {
    return this._recordingState;
  }

  getCamera(): CameraProvider | null {
    return this._camera;
  }

  getTelemetry(): Partial<CaptureSessionTelemetry> {
    const base = this._camera?.getTelemetrySnapshot() ?? {};
    return {
      ...base,
      sessionId: this._session?.sessionId,
      gpsHealth: this._gpsProvider?.getHealthStatus() ?? 'unavailable',
      gpsSource: this._session?.gpsPoints.at(-1)?.source ?? 'phone',
      recordingDurationMs: base.recordingDurationMs ?? 0,
      frameCount: base.frameCount ?? 0,
      errorCount: this._session?.errorLog.length ?? 0,
    };
  }

  // ── Handle unexpected disconnect ─────────────────────────────────────────────

  handleDeviceDisconnect(): void {
    const err = this._makeError(
      'DEVICE_DISCONNECTED',
      'Camera disconnected unexpectedly.',
      true
    );
    this._session?.errorLog.push(err.message);
    if (this._recordingState === 'recording') {
      this._setRecordingState('error');
    }
    this._emit({ type: 'error', error: err });
    this._emit({ type: 'connectionStateChanged' });
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private _sealCurrentSegment(): void {
    if (this._currentSegmentPoints.length > 0) {
      this._gpsSegments.push([...this._currentSegmentPoints]);
      this._currentSegmentPoints = [];
    }
  }

  /** Stop the physical camera recording without throwing; used by endSession. */
  private async _stopCameraRecordingQuiet(): Promise<void> {
    try {
      const mediaId = await this._camera?.stopRecording();
      if (mediaId) {
        this._session?.importedMediaIds.push(mediaId);
        this._emit({ type: 'mediaAvailable', mediaId });
      }
    } catch {}
  }

  private _guard(): void {
    if (!this._camera) throw this._makeError('NO_CAMERA', 'No camera provider selected.');
    if (this._camera.getConnectionState() !== 'connected') {
      throw this._makeError('NOT_CONNECTED', 'Camera is not connected.');
    }
    if (!this._session && this._recordingState !== 'idle') {
      throw this._makeError('NO_SESSION', 'No active capture session.');
    }
  }

  private _resolveGPSProvider(): GPSProvider {
    switch (this._gpsMode) {
      case 'hybrid':
        return (this._hybridGPS ??= new HybridGPSProvider(this._cameraGPS, this._phoneGPS));
      case 'external_camera':
        return this._cameraGPS;
      case 'ios_core_location':
      default:
        return this._phoneGPS;
    }
  }

  private _setRecordingState(state: RecordingState): void {
    this._recordingState = state;
    if (this._session) this._session.recordingState = state;
    this._emit({ type: 'recordingStateChanged', state });
  }

  private _makeError(
    code: string,
    message: string,
    recoverable = true
  ): AppIntegrationError {
    const err = makeIntegrationError(
      code,
      message,
      this._camera?.providerType,
      recoverable
    );
    this._emit({ type: 'error', error: err });
    return err;
  }
}
