import React, { createContext, useContext } from 'react';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  label: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface DetectionResult {
  detections: Detection[];
  inferenceMs: number;
  imageWidth: number;
  imageHeight: number;
}

export interface DetectionEvent {
  label: string;
  confidence: number;
  score: number;
  bestFrameUri: string | null;
  startedAt: number;
}

interface DetectionContextType {
  detectionEnabled: boolean;
  setDetectionEnabled: (v: boolean) => void;
  isDetecting: boolean;
  currentEvent: DetectionEvent | null;
  currentDetection: Detection | null;
  savedEvents: DetectionEvent[];
  lastCommittedEvent: DetectionEvent | null;
  reportResult: (result: DetectionResult, frameUri: string) => void;
  clearCurrentEvent: () => void;
  clearLastCommittedEvent: () => void;
}

const NOOP = () => {};

const DEFAULT: DetectionContextType = {
  detectionEnabled: false,
  setDetectionEnabled: NOOP,
  isDetecting: false,
  currentEvent: null,
  currentDetection: null,
  savedEvents: [],
  lastCommittedEvent: null,
  reportResult: NOOP,
  clearCurrentEvent: NOOP,
  clearLastCommittedEvent: NOOP,
};

const DetectionContext = createContext<DetectionContextType>(DEFAULT);

export function DetectionProvider({ children }: { children: React.ReactNode }) {
  return (
    <DetectionContext.Provider value={DEFAULT}>
      {children}
    </DetectionContext.Provider>
  );
}

export function useDetection(): DetectionContextType {
  return useContext(DetectionContext);
}
