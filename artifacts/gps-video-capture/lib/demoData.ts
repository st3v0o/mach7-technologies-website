import { LogEntry } from '@/contexts/RecordingContext';
import { SessionSection } from '@/components/LogMapView';

function jitter(scale = 0.00004): number {
  return (Math.random() - 0.5) * scale;
}

function makeEntry(
  sessionId: string,
  frameIdx: number,
  timestamp: number,
  lat: number,
  lon: number,
  videoSegment: string
): LogEntry {
  return {
    id: `demo_${sessionId}_${frameIdx}`,
    filename: `${videoSegment}_f${String(frameIdx).padStart(4, '0')}_${timestamp}.jpg`,
    timestamp,
    latitude: lat + jitter(),
    longitude: lon + jitter(0.00006),
    videoSegment,
    localPath: '',
    videoPath: videoSegment !== 'photo' ? `demo_${videoSegment}.mp4` : '',
    sessionId,
  };
}

// ── Session 1: Video drive — Market St → Embarcadero, San Francisco ──────────
const S1_ID = 'demo_session_20260315_094512';
const S1_START = Date.UTC(2026, 2, 15, 9, 45, 12);
const marketRoute: [number, number][] = [
  [37.7750, -122.4190],
  [37.7752, -122.4163],
  [37.7755, -122.4135],
  [37.7758, -122.4105],
  [37.7762, -122.4075],
  [37.7765, -122.4045],
  [37.7769, -122.4015],
  [37.7773, -122.3984],
  [37.7778, -122.3953],
  [37.7784, -122.3923],
  [37.7791, -122.3894],
  [37.7799, -122.3866],
  [37.7815, -122.3865],
  [37.7832, -122.3864],
  [37.7849, -122.3863],
  [37.7865, -122.3861],
  [37.7881, -122.3860],
  [37.7897, -122.3858],
  [37.7912, -122.3857],
  [37.7927, -122.3855],
  [37.7941, -122.3854],
  [37.7953, -122.3853],
];

const session1Entries: LogEntry[] = marketRoute.flatMap(([lat, lon], i) => {
  const seg = `seg_${String(Math.floor(i / 7) + 1).padStart(3, '0')}`;
  const ts = S1_START + i * 18_000;
  return [makeEntry(S1_ID, i, ts, lat, lon, seg)];
});

// ── Session 2: Photo walk — Golden Gate Park loop ─────────────────────────────
const S2_ID = 'demo_session_20260316_143022';
const S2_START = Date.UTC(2026, 2, 16, 14, 30, 22);
const parkRoute: [number, number][] = [
  [37.7694, -122.4862],
  [37.7703, -122.4853],
  [37.7714, -122.4840],
  [37.7724, -122.4826],
  [37.7733, -122.4811],
  [37.7739, -122.4795],
  [37.7742, -122.4778],
  [37.7741, -122.4761],
  [37.7737, -122.4748],
  [37.7729, -122.4740],
  [37.7718, -122.4738],
  [37.7707, -122.4742],
  [37.7698, -122.4750],
  [37.7692, -122.4762],
  [37.7689, -122.4776],
  [37.7689, -122.4792],
  [37.7691, -122.4807],
  [37.7694, -122.4822],
];

const session2Entries: LogEntry[] = parkRoute.map(([lat, lon], i) => {
  const ts = S2_START + i * 45_000;
  return makeEntry(S2_ID, i, ts, lat, lon, 'photo');
});

// ── Session 3: Video drive — Lombard St → Fisherman's Wharf ──────────────────
const S3_ID = 'demo_session_20260317_113045';
const S3_START = Date.UTC(2026, 2, 17, 11, 30, 45);
const lombardRoute: [number, number][] = [
  [37.8021, -122.4258],
  [37.8027, -122.4239],
  [37.8033, -122.4219],
  [37.8036, -122.4200],
  [37.8039, -122.4181],
  [37.8039, -122.4161],
  [37.8037, -122.4141],
  [37.8035, -122.4121],
  [37.8032, -122.4101],
  [37.8029, -122.4082],
  [37.8026, -122.4062],
  [37.8023, -122.4043],
  [37.8020, -122.4024],
  [37.8017, -122.4005],
];

const session3Entries: LogEntry[] = lombardRoute.map(([lat, lon], i) => {
  const seg = `seg_${String(Math.floor(i / 5) + 1).padStart(3, '0')}`;
  const ts = S3_START + i * 12_000;
  return makeEntry(S3_ID, i, ts, lat, lon, seg);
});

export const DEMO_SECTIONS: SessionSection[] = [
  {
    sessionId: S1_ID,
    mode: 'video',
    startMs: S1_START,
    data: session1Entries,
  },
  {
    sessionId: S2_ID,
    mode: 'photo',
    startMs: S2_START,
    data: session2Entries,
  },
  {
    sessionId: S3_ID,
    mode: 'video',
    startMs: S3_START,
    data: session3Entries,
  },
];
