// ---------------------------------------------------------------------------
// Detection Model — Placeholder
// ---------------------------------------------------------------------------
// Replace `runDetection` with your actual lightweight model inference.
// The rest of this file (types, scoring, NMS) is production-ready.
// ---------------------------------------------------------------------------

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
// TODO: Load your model once (e.g. TFLite, CoreML, ONNX) and run inference
// on the provided frame URI. Return detected signs with bounding boxes.
//
// Suggested approach for a TFLite model:
//   import * as tf from '@tensorflow/tfjs';
//   import { decodeJpeg } from '@tensorflow/tfjs-react-native';
//   ...
//
// Until a model is wired in, this returns an empty result so the rest of
// the detection pipeline can be exercised end-to-end in development.
// ---------------------------------------------------------------------------
export async function runDetection(_frameUri: string): Promise<DetectionResult> {
  const start = Date.now();

  // ── Plug model inference here ──────────────────────────────────────────
  // Example:
  //   const imageTensor = await loadFrameAsTensor(_frameUri);
  //   const predictions = await model.predict(imageTensor);
  //   return { detections: parsePredictions(predictions), inferenceMs: Date.now() - start };
  // ──────────────────────────────────────────────────────────────────────

  return { detections: [], inferenceMs: Date.now() - start };
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
  const cx = d.bbox.x + d.bbox.width / 2;
  const cy = d.bbox.y + d.bbox.height / 2;
  // centrality: 1.0 = perfectly centred, 0.0 = at a corner
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
