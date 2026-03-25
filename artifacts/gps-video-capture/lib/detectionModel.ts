// ---------------------------------------------------------------------------
// Detection Model — Roboflow Hosted Inference
// ---------------------------------------------------------------------------
// Uses the Roboflow cloud inference API (no native modules required).
// Credentials are read from EXPO_PUBLIC_* environment variables:
//   EXPO_PUBLIC_ROBOFLOW_API_KEY  — your Roboflow API key
//   EXPO_PUBLIC_ROBOFLOW_WORKSPACE — workspace slug (e.g. "invasive-detctor")
//   EXPO_PUBLIC_ROBOFLOW_MODEL    — model/project slug (e.g. "bike-lane-ankwj")
//   EXPO_PUBLIC_ROBOFLOW_VERSION  — model version number (e.g. "1")
// ---------------------------------------------------------------------------

import { Platform } from 'react-native';

export interface BoundingBox {
  x: number;      // normalized 0–1, left edge
  y: number;      // normalized 0–1, top edge
  width: number;  // normalized 0–1
  height: number; // normalized 0–1
}

export interface Detection {
  label: string;
  confidence: number; // 0–1
  bbox: BoundingBox;
}

export interface DetectionResult {
  detections: Detection[];
  inferenceMs: number;
}

// ---------------------------------------------------------------------------
// Roboflow prediction shape (raw API response)
// ---------------------------------------------------------------------------
interface RoboflowPrediction {
  x: number;          // center x, pixels
  y: number;          // center y, pixels
  width: number;      // pixels
  height: number;     // pixels
  confidence: number; // 0–1
  class: string;
  class_id?: number;
}

interface RoboflowResponse {
  time?: number;
  image?: { width: number; height: number };
  predictions?: RoboflowPrediction[];
}

// ---------------------------------------------------------------------------
// Minimum confidence threshold — predictions below this are ignored
// ---------------------------------------------------------------------------
const MIN_CONFIDENCE = 0.35;

// ---------------------------------------------------------------------------
// runDetection
// POST the frame URI as base64 to the Roboflow hosted inference endpoint.
// Returns normalized Detection objects ready for the lock-on overlay.
// ---------------------------------------------------------------------------
export async function runDetection(frameUri: string): Promise<DetectionResult> {
  const start = Date.now();

  const apiKey   = process.env.EXPO_PUBLIC_ROBOFLOW_API_KEY;
  const workspace = process.env.EXPO_PUBLIC_ROBOFLOW_WORKSPACE;
  const model    = process.env.EXPO_PUBLIC_ROBOFLOW_MODEL;
  const version  = process.env.EXPO_PUBLIC_ROBOFLOW_VERSION ?? '1';

  if (!apiKey || !workspace || !model) {
    return { detections: [], inferenceMs: Date.now() - start };
  }

  try {
    let base64: string;

    if (Platform.OS !== 'web') {
      const FileSystem = await import('expo-file-system/legacy');
      base64 = await FileSystem.readAsStringAsync(frameUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      // Web: fetch the blob and convert
      const blob = await fetch(frameUri).then((r) => r.blob());
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    const url =
      `https://detect.roboflow.com/${workspace}/${model}/${version}` +
      `?api_key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `image=${encodeURIComponent(base64)}`,
    });

    if (!response.ok) {
      return { detections: [], inferenceMs: Date.now() - start };
    }

    const data: RoboflowResponse = await response.json();

    const imgW = data.image?.width  ?? 1;
    const imgH = data.image?.height ?? 1;

    const detections: Detection[] = (data.predictions ?? [])
      .filter((p) => p.confidence >= MIN_CONFIDENCE)
      .map((p) => ({
        label: p.class ?? 'sign',
        confidence: p.confidence,
        bbox: {
          // Roboflow returns center x/y; convert to top-left normalized
          x: Math.max(0, (p.x - p.width  / 2) / imgW),
          y: Math.max(0, (p.y - p.height / 2) / imgH),
          width:  Math.min(1, p.width  / imgW),
          height: Math.min(1, p.height / imgH),
        },
      }));

    return { detections, inferenceMs: Date.now() - start };
  } catch {
    return { detections: [], inferenceMs: Date.now() - start };
  }
}

// ---------------------------------------------------------------------------
// Score a single detection for "optimal angle / zoom" quality.
// Higher = better frame to keep.
//   • Confidence: how sure the model is (weight 0.5)
//   • Area:       larger bbox = sign is closer / bigger in frame (weight 0.3)
//   • Centrality: sign is centred in frame (weight 0.2)
// ---------------------------------------------------------------------------
export function scoreDetection(d: Detection): number {
  const area = d.bbox.width * d.bbox.height;
  const cx = d.bbox.x + d.bbox.width  / 2;
  const cy = d.bbox.y + d.bbox.height / 2;
  const centrality = Math.max(
    0,
    1 - Math.sqrt((cx - 0.5) ** 2 + (cy - 0.5) ** 2) * Math.SQRT2
  );
  return d.confidence * 0.5 + area * 0.3 + centrality * 0.2;
}

// ---------------------------------------------------------------------------
// Pick the best detection from a result (highest score).
// ---------------------------------------------------------------------------
export function bestDetection(result: DetectionResult): Detection | null {
  if (result.detections.length === 0) return null;
  return result.detections.reduce((best, d) =>
    scoreDetection(d) > scoreDetection(best) ? d : best
  );
}
