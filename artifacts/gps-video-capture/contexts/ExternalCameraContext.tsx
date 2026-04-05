import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CaptureSessionOrchestrator } from '@/lib/camera/CaptureSessionOrchestrator';
import { getAllProviders } from '@/lib/camera/providers';
import type { CameraProvider } from '@/lib/camera/CameraProvider';
import type {
  AppIntegrationError,
  CameraConnectionState,
  CameraDevice,
  ExternalMediaAsset,
  GPSPoint,
  GPSProviderType,
  RecordingConfig,
  RecordingState,
} from '@/lib/camera/types';

// ─── Context shape ────────────────────────────────────────────────────────────

interface ExternalCameraContextValue {
  // Provider registry
  allProviders: CameraProvider[];
  selectedProvider: CameraProvider | null;
  selectProvider: (provider: CameraProvider) => Promise<void>;

  // Device discovery
  discoveredDevices: CameraDevice[];
  isDiscovering: boolean;
  discoverDevices: () => Promise<void>;

  // Connection
  connectedDeviceId: string | null;
  connectionState: CameraConnectionState;
  connectDevice: (deviceId: string) => Promise<void>;
  disconnectDevice: () => Promise<void>;

  // GPS
  gpsMode: GPSProviderType;
  setGPSMode: (mode: GPSProviderType) => void;
  lastGPSPoint: GPSPoint | null;

  // Session
  isSessionActive: boolean;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;

  // Recording
  recordingState: RecordingState;
  startRecording: (config?: RecordingConfig) => Promise<void>;
  stopRecording: () => Promise<void>;

  // Media
  mediaList: ExternalMediaAsset[];
  fetchMedia: () => Promise<void>;
  importMedia: (mediaId: string) => Promise<void>;

  // Status
  lastError: AppIntegrationError | null;
  clearError: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ExternalCameraContext = createContext<ExternalCameraContextValue | null>(null);

export function useExternalCamera(): ExternalCameraContextValue {
  const ctx = useContext(ExternalCameraContext);
  if (!ctx) throw new Error('useExternalCamera must be used inside ExternalCameraProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ExternalCameraProvider({ children }: { children: React.ReactNode }) {
  const orchRef = useRef(new CaptureSessionOrchestrator());

  const allProviders = getAllProviders();
  const [selectedProvider, setSelectedProvider] = useState<CameraProvider | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<CameraDevice[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<CameraConnectionState>('disconnected');
  const [gpsMode, setGPSModeState] = useState<GPSProviderType>('ios_core_location');
  const [lastGPSPoint, setLastGPSPoint] = useState<GPSPoint | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [mediaList, setMediaList] = useState<ExternalMediaAsset[]>([]);
  const [lastError, setLastError] = useState<AppIntegrationError | null>(null);

  // Subscribe to orchestrator events
  useEffect(() => {
    const orch = orchRef.current;
    const unsub = orch.onEvent(event => {
      switch (event.type) {
        case 'connectionStateChanged':
          setConnectionState(orch.getCamera()?.getConnectionState() ?? 'disconnected');
          break;
        case 'recordingStateChanged':
          setRecordingState(event.state);
          break;
        case 'gpsPoint':
          setLastGPSPoint(event.point);
          break;
        case 'error':
          setLastError(event.error);
          break;
        case 'sessionEnded':
          setIsSessionActive(false);
          setRecordingState('idle');
          break;
        default:
          break;
      }
    });
    return unsub;
  }, []);

  const selectProvider = useCallback(async (provider: CameraProvider) => {
    setSelectedProvider(provider);
    setDiscoveredDevices([]);
    setConnectedDeviceId(null);
    setConnectionState('disconnected');
    await orchRef.current.setCamera(provider);
  }, []);

  const discoverDevices = useCallback(async () => {
    if (!selectedProvider) return;
    setIsDiscovering(true);
    try {
      const devices = await orchRef.current.discoverDevices();
      setDiscoveredDevices(devices);
    } catch (e: any) {
      setLastError({ code: 'DISCOVER_FAILED', message: e.message, recoverable: true, timestamp: Date.now() });
    } finally {
      setIsDiscovering(false);
    }
  }, [selectedProvider]);

  const connectDevice = useCallback(async (deviceId: string) => {
    setConnectionState('connecting');
    try {
      await orchRef.current.connectDevice(deviceId);
      setConnectedDeviceId(deviceId);
      setConnectionState('connected');
    } catch (e: any) {
      setConnectionState('error');
      setLastError({ code: 'CONNECT_FAILED', message: e.message, recoverable: true, timestamp: Date.now() });
    }
  }, []);

  const disconnectDevice = useCallback(async () => {
    await orchRef.current.disconnectDevice();
    setConnectedDeviceId(null);
    setConnectionState('disconnected');
    setIsSessionActive(false);
  }, []);

  const setGPSMode = useCallback((mode: GPSProviderType) => {
    setGPSModeState(mode);
    orchRef.current.setGPSMode(mode);
  }, []);

  const startSession = useCallback(async () => {
    try {
      await orchRef.current.startSession();
      setIsSessionActive(true);
    } catch (e: any) {
      setLastError({ code: 'SESSION_START_FAILED', message: e.message, recoverable: true, timestamp: Date.now() });
    }
  }, []);

  const endSession = useCallback(async () => {
    await orchRef.current.endSession();
    setIsSessionActive(false);
  }, []);

  const startRecording = useCallback(async (config: RecordingConfig = {}) => {
    await orchRef.current.startRecording(config);
  }, []);

  const stopRecording = useCallback(async () => {
    await orchRef.current.stopRecording();
  }, []);

  const fetchMedia = useCallback(async () => {
    const list = await orchRef.current.listMedia();
    setMediaList(list);
  }, []);

  const importMedia = useCallback(async (mediaId: string) => {
    const dest = `${Date.now()}_${mediaId}.mp4`;
    try {
      await orchRef.current.importMedia(mediaId, dest);
      await fetchMedia(); // refresh list
    } catch (e: any) {
      setLastError({ code: 'IMPORT_FAILED', message: e.message, recoverable: true, timestamp: Date.now() });
    }
  }, [fetchMedia]);

  const clearError = useCallback(() => setLastError(null), []);

  const value: ExternalCameraContextValue = {
    allProviders,
    selectedProvider,
    selectProvider,
    discoveredDevices,
    isDiscovering,
    discoverDevices,
    connectedDeviceId,
    connectionState,
    connectDevice,
    disconnectDevice,
    gpsMode,
    setGPSMode,
    lastGPSPoint,
    isSessionActive,
    startSession,
    endSession,
    recordingState,
    startRecording,
    stopRecording,
    mediaList,
    fetchMedia,
    importMedia,
    lastError,
    clearError,
  };

  return (
    <ExternalCameraContext.Provider value={value}>
      {children}
    </ExternalCameraContext.Provider>
  );
}
