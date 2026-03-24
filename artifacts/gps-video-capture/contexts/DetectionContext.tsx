import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import { Detection, DetectionResult, bestDetection, scoreDetection } from '@/lib/detectionModel';

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

const DetectionContext = createContext<DetectionContextType | null>(null);

// After this many milliseconds with no detections, the current event ends.
const EVENT_TIMEOUT_MS = 2000;

export function DetectionProvider({ children }: { children: React.ReactNode }) {
  const [detectionEnabled, setDetectionEnabled] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<DetectionEvent | null>(null);
  const [currentDetection, setCurrentDetection] = useState<Detection | null>(null);
  const [savedEvents, setSavedEvents] = useState<DetectionEvent[]>([]);
  const [lastCommittedEvent, setLastCommittedEvent] = useState<DetectionEvent | null>(null);

  const eventTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentEventRef = useRef<DetectionEvent | null>(null);

  const clearCurrentEvent = useCallback(() => {
    if (eventTimeoutRef.current) clearTimeout(eventTimeoutRef.current);
    eventTimeoutRef.current = null;
    currentEventRef.current = null;
    setCurrentEvent(null);
    setCurrentDetection(null);
    setIsDetecting(false);
  }, []);

  const clearLastCommittedEvent = useCallback(() => {
    setLastCommittedEvent(null);
  }, []);

  const commitEvent = useCallback(() => {
    if (!currentEventRef.current) return;
    const committed = currentEventRef.current;
    setSavedEvents((prev) => [...prev, committed]);
    setLastCommittedEvent(committed);
    currentEventRef.current = null;
    setCurrentEvent(null);
    setCurrentDetection(null);
    setIsDetecting(false);
  }, []);

  const reportResult = useCallback(
    (result: DetectionResult, frameUri: string) => {
      const top = bestDetection(result);

      if (!top) {
        // No detections — start/extend timeout to commit current event
        if (currentEventRef.current) {
          if (!eventTimeoutRef.current) {
            eventTimeoutRef.current = setTimeout(() => {
              eventTimeoutRef.current = null;
              commitEvent();
            }, EVENT_TIMEOUT_MS);
          }
        }
        setIsDetecting(false);
        setCurrentDetection(null);
        return;
      }

      // We have a detection — cancel any pending commit timeout
      if (eventTimeoutRef.current) {
        clearTimeout(eventTimeoutRef.current);
        eventTimeoutRef.current = null;
      }

      setIsDetecting(true);
      setCurrentDetection(top);
      const score = scoreDetection(top);

      setCurrentEvent((prev) => {
        let next: DetectionEvent;
        if (!prev) {
          // Start a new event
          next = {
            label: top.label,
            confidence: top.confidence,
            score,
            bestFrameUri: frameUri,
            startedAt: Date.now(),
          };
        } else if (score > prev.score) {
          // Better frame for the existing event
          next = { ...prev, confidence: top.confidence, score, bestFrameUri: frameUri };
        } else {
          next = prev;
        }
        currentEventRef.current = next;
        return next;
      });
    },
    [commitEvent]
  );

  return (
    <DetectionContext.Provider
      value={{
        detectionEnabled,
        setDetectionEnabled,
        isDetecting,
        currentEvent,
        currentDetection,
        savedEvents,
        lastCommittedEvent,
        reportResult,
        clearCurrentEvent,
        clearLastCommittedEvent,
      }}
    >
      {children}
    </DetectionContext.Provider>
  );
}

export function useDetection() {
  const ctx = useContext(DetectionContext);
  if (!ctx) throw new Error('useDetection must be used within DetectionProvider');
  return ctx;
}
