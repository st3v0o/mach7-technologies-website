import { Camera, Pause, Square, Navigation, CloudUpload, CheckCircle2 } from "lucide-react";
import { APP, pt, AppScreen, StatusBar, TabBar } from "@/components/appScreen";

const BASE = import.meta.env.BASE_URL;

// Recreates the Geospector 1.0 capture HUD (app/(tabs)/index.tsx in the app repo)
// over a field photo. Sizes are in iPhone points on a 402pt-wide screen.

type CaptureMode = "video" | "photo" | "manual";

interface FieldCaptureMockupProps {
  photoFile: string;
  alt: string;
  lat: number;
  lon: number;
  altitudeFt?: number;
  speedMph?: number;
  jobName: string;
  mode: CaptureMode;
  /** Frames (video) or photos (photo/manual) captured so far. */
  count: number;
  session: string;
  /** Rate label as the app prints it: "1 fps", "~2.4 fps", "1/2s". */
  rate: string;
  recording?: boolean;
  gpxTracking?: boolean;
  zoom?: 0 | 1 | 2 | 3;
  estimatedMB?: number;
  segmentProgress?: number;
  upload?: { uploading: number } | "done";
}

const MODE_LABEL: Record<CaptureMode, string> = { video: "AUTO", photo: "PHOTO", manual: "MANUAL" };
const ZOOM_STEPS = ["1×", "2×", "4×", "8×"];
const SHADOW = "0 1px 4px rgba(0,0,0,0.85)";

function coord(val: number, isLat: boolean) {
  const dir = isLat ? (val >= 0 ? "N" : "S") : val >= 0 ? "E" : "W";
  return `${Math.abs(val).toFixed(5)}° ${dir}`;
}

export function FieldCaptureMockup({
  photoFile, alt, lat, lon, altitudeFt, speedMph, jobName, mode, count, session, rate,
  recording = false, gpxTracking = false, zoom = 0, estimatedMB, segmentProgress = 0.4, upload,
}: FieldCaptureMockupProps) {
  const moving = speedMph != null && speedMph > 1;
  const videoRecording = recording && mode === "video";

  return (
    <AppScreen>
      <img
        src={`${BASE}screenshots/${photoFile}`}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Light scrim so the top HUD stays legible over bright stock photos (the app has none). */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{ height: pt(170), background: "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.25) 60%, transparent)" }}
      />

      <StatusBar />

      {/* Top HUD */}
      <div className="absolute inset-x-0 flex justify-between items-start" style={{ top: pt(70), padding: `0 ${pt(16)}` }}>
        <div className="flex flex-col" style={{ gap: pt(3) }}>
          <div className="flex items-center" style={{ gap: pt(6) }}>
            <span className="rounded-full" style={{ width: pt(7), height: pt(7), background: APP.gpsGreen }} />
            <span style={{ color: APP.gpsGreen, fontSize: pt(10), fontWeight: 700, letterSpacing: pt(1.5), textShadow: SHADOW }}>
              GPS LOCK
            </span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.92)", fontSize: pt(12), letterSpacing: pt(0.3), textShadow: SHADOW }}>
            {coord(lat, true)}&nbsp;&nbsp;{coord(lon, false)}{moving ? `  ${speedMph} mph` : ""}
          </span>
        </div>
        <div className="flex flex-col items-end" style={{ gap: pt(5), paddingLeft: pt(12) }}>
          {altitudeFt != null && (
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: pt(11), textShadow: SHADOW }}>{altitudeFt}ft</span>
          )}
          {upload && <UploadBadge upload={upload} />}
        </div>
      </div>

      {/* Bottom HUD */}
      <div
        className="absolute inset-x-0"
        style={{
          bottom: pt(APP.tabBarHeight),
          padding: `${pt(36)} ${pt(18)} ${pt(12)}`,
          background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.88) 100%)",
        }}
      >
        <div className="flex flex-col" style={{ gap: pt(4), marginBottom: pt(14) }}>
          <span style={{ color: APP.gpsGreen, fontSize: pt(13), fontWeight: 500, letterSpacing: pt(0.4) }}>
            {coord(lat, true)}&nbsp;&nbsp;/&nbsp;&nbsp;{coord(lon, false)}
          </span>
          <span className="truncate" style={{ color: "#fff", fontSize: pt(17), fontWeight: 700, letterSpacing: pt(1.2), lineHeight: pt(22), marginTop: pt(2) }}>
            {jobName.toUpperCase()}
          </span>
          <span style={{ color: "rgba(255,255,255,0.45)", fontSize: pt(11), letterSpacing: pt(0.5), marginTop: pt(2) }}>
            {rate}
            {moving ? `  ·  ${speedMph} mph` : ""}
            {videoRecording && estimatedMB ? `  ·  ~${estimatedMB} MB` : ""}
          </span>
          <div className="flex items-center" style={{ marginTop: pt(8) }}>
            <Stat label="SESSION" value={session} />
            <Divider />
            <Stat label="MODE" value={MODE_LABEL[mode]} />
            <Divider />
            <Stat label={mode === "video" ? "FRAMES" : "PHOTOS"} value={`#${count}`} />
          </div>
        </div>

        {videoRecording && (
          <div className="overflow-hidden" style={{ height: pt(2), background: "rgba(255,255,255,0.1)", borderRadius: pt(1), marginBottom: pt(16) }}>
            <div style={{ height: "100%", width: `${Math.round(segmentProgress * 100)}%`, background: APP.accent }} />
          </div>
        )}

        {/* Zoom steps */}
        <div className="flex justify-center" style={{ gap: pt(8), padding: `${pt(10)} ${pt(16)} ${pt(4)}` }}>
          {ZOOM_STEPS.map((label, i) => (
            <span
              key={label}
              style={{
                padding: `${pt(6)} ${pt(16)}`,
                borderRadius: pt(20),
                fontSize: pt(14),
                fontWeight: 600,
                letterSpacing: pt(0.3),
                border: `${pt(1)} solid ${i === zoom ? "#fff" : "rgba(255,255,255,0.15)"}`,
                background: i === zoom ? "#fff" : "rgba(255,255,255,0.08)",
                color: i === zoom ? "#000" : "rgba(255,255,255,0.7)",
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between" style={{ padding: `0 ${pt(8)}` }}>
          <div className="flex justify-center" style={{ width: pt(60) }}>
            {recording ? (
              <span className="flex items-center" style={{ gap: pt(6) }}>
                <span className="rounded-full" style={{ width: pt(8), height: pt(8), background: APP.accent }} />
                <span style={{ color: APP.accent, fontSize: pt(12), fontWeight: 700, letterSpacing: pt(1) }}>REC</span>
              </span>
            ) : (
              <span style={{ color: APP.textSecondary, fontSize: pt(12), fontWeight: 500, letterSpacing: pt(1) }}>READY</span>
            )}
          </div>

          <ShutterButton mode={mode} recording={recording} />

          <div className="flex justify-center" style={{ width: pt(60) }}>
            {recording && mode !== "manual" && (
              <span
                className="flex items-center justify-center rounded-full"
                style={{ width: pt(36), height: pt(36), border: `${pt(2)} solid ${APP.amber}`, background: "rgba(255,184,0,0.12)" }}
              >
                <Pause fill={APP.amber} stroke="none" style={{ width: pt(16), height: pt(16) }} />
              </span>
            )}
            {mode === "manual" && <GpxButton tracking={gpxTracking} />}
          </div>
        </div>
      </div>

      <TabBar active="capture" />
    </AppScreen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ gap: pt(2) }}>
      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: pt(8), fontWeight: 500, letterSpacing: pt(1.5) }}>{label}</span>
      <span className="truncate" style={{ color: "rgba(255,255,255,0.85)", fontSize: pt(12), fontWeight: 700, letterSpacing: pt(0.5) }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <span style={{ width: pt(1), height: pt(24), background: "rgba(255,255,255,0.12)", margin: `0 ${pt(12)}` }} />;
}

function ShutterButton({ mode, recording }: { mode: CaptureMode; recording: boolean }) {
  const base = { width: pt(72), height: pt(72), borderWidth: pt(3), borderStyle: "solid" } as const;
  if (mode === "manual") {
    return (
      <span className="flex items-center justify-center rounded-full" style={{ ...base, borderColor: APP.gpsGreen, background: APP.gpsGreen }}>
        <Camera fill="#000" stroke={APP.gpsGreen} strokeWidth={1.5} style={{ width: pt(30), height: pt(30) }} />
      </span>
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-full"
      style={{ ...base, borderColor: recording ? APP.accent : "#fff", background: recording ? APP.accentDim : "rgba(255,255,255,0.15)" }}
    >
      {recording ? (
        <span style={{ width: pt(28), height: pt(28), borderRadius: pt(6), background: APP.accent }} />
      ) : (
        <span className="rounded-full" style={{ width: pt(52), height: pt(52), background: APP.accent }} />
      )}
    </span>
  );
}

function GpxButton({ tracking }: { tracking: boolean }) {
  const fg = tracking ? APP.background : APP.gpsGreen;
  const Icon = tracking ? Square : Navigation;
  return (
    <span
      className="flex flex-col items-center justify-center"
      style={{
        width: pt(48), height: pt(48), borderRadius: pt(8), gap: pt(2),
        border: `${pt(2)} solid ${APP.gpsGreen}`,
        background: tracking ? APP.gpsGreen : "rgba(0,232,122,0.10)",
      }}
    >
      <Icon fill={fg} stroke={fg} style={{ width: pt(13), height: pt(13) }} />
      <span className="text-center" style={{ color: fg, fontSize: pt(8), fontWeight: 700, letterSpacing: pt(0.5), lineHeight: 1.15 }}>
        {tracking ? "STOP" : "START"}<br />GPX
      </span>
    </span>
  );
}

function UploadBadge({ upload }: { upload: { uploading: number } | "done" }) {
  const done = upload === "done";
  const color = done ? APP.gpsGreen : APP.amber;
  const Icon = done ? CheckCircle2 : CloudUpload;
  return (
    <span
      className="flex items-center"
      style={{
        gap: pt(4), padding: `${pt(3)} ${pt(6)}`, borderRadius: pt(4),
        border: `${pt(1)} solid ${done ? "rgba(0,255,136,0.3)" : APP.amberDim}`,
        background: done ? "rgba(0,255,136,0.08)" : "rgba(255,184,0,0.10)",
      }}
    >
      <Icon stroke={color} style={{ width: pt(10), height: pt(10) }} />
      <span style={{ color, fontSize: pt(9), fontWeight: 500, letterSpacing: pt(0.3) }}>
        {done ? "All uploaded" : `${upload.uploading} uploading`}
      </span>
    </span>
  );
}
