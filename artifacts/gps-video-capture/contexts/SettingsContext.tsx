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

export const DEFAULT_SETTINGS: FrameSettings = {
  frameMode: 'fixed',
  fixedFps: 1,
  dynamicMeters: 10,
};

export const FIXED_FPS_OPTIONS = [0.25, 0.5, 1, 2, 4];
export const DYNAMIC_METERS_OPTIONS = [5, 10, 25, 50, 100];

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
