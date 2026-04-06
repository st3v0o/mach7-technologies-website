/**
 * splitByTimeGap
 *
 * Splits a sorted array of GPS entries into contiguous sub-arrays ("runs").
 * A new run is started whenever two consecutive entries have a timestamp gap
 * larger than `gapMs` (default 30 s).
 *
 * Use this before rendering map polylines so that a pause/resume at a
 * different location does NOT draw a straight connector line across the gap.
 * Each returned sub-array can be rendered as its own <Polyline>.
 *
 * Entries must already be in ascending timestamp order.
 */

export interface HasTimestampAndCoord {
  latitude: number;
  longitude: number;
  timestamp: number;
}

const DEFAULT_PAUSE_GAP_MS = 30_000;

export function splitByTimeGap<T extends HasTimestampAndCoord>(
  entries: T[],
  gapMs = DEFAULT_PAUSE_GAP_MS,
): T[][] {
  if (entries.length === 0) return [];
  const runs: T[][] = [[entries[0]]];
  for (let i = 1; i < entries.length; i++) {
    const delta = entries[i].timestamp - entries[i - 1].timestamp;
    if (delta > gapMs) {
      runs.push([]);
    }
    runs[runs.length - 1].push(entries[i]);
  }
  return runs.filter((r) => r.length > 0);
}
