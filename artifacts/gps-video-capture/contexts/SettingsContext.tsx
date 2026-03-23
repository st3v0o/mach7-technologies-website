import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

export interface FrameSettings {
  frameMode: 'fixed' | 'dynamic';
  fixedFps: number;
  dynamicMeters: number;
}

interface SettingsContextType {
  settings: FrameSettings;
  updateSettings: (patch: Partial<FrameSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

const SETTINGS_KEY = '@gps_capture_settings';

export const FEET_PER_METER = 3.28084;
export const MPH_PER_MPS = 2.23694;

export function metersToFeet(m: number): number {
  return m * FEET_PER_METER;
}

export function feetToMeters(ft: number): number {
  return ft / FEET_PER_METER;
}

const DYNAMIC_FEET_OPTIONS = [25, 50, 100, 250, 500];

export const DEFAULT_SETTINGS: FrameSettings = {
  frameMode: 'fixed',
  fixedFps: 1,
  dynamicMeters: feetToMeters(50),
};

export const FIXED_FPS_OPTIONS = [0.25, 0.5, 1, 2, 4];

export const DYNAMIC_METERS_OPTIONS = DYNAMIC_FEET_OPTIONS.map(feetToMeters);

export const DYNAMIC_FEET_LABELS = DYNAMIC_FEET_OPTIONS.map((ft) => `${ft} ft`);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<FrameSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<FrameSettings>;
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      })
      .catch(() => {});
  }, []);

  const updateSettings = useCallback((patch: Partial<FrameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
