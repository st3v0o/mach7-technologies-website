const BASE = import.meta.env.BASE_URL;

type Perspective = "HANDHELD" | "CAR-MOUNTED" | "BIKE-MOUNTED" | "DRONE";
type Condition = "good" | "poor";

interface FieldCaptureMockupProps {
  photoFile: string;
  lat: string;
  lon: string;
  accuracy: string;
  speed?: string;
  label: string;
  sublabel?: string;
  session: string;
  mode: "AUTO" | "MANUAL";
  photos?: number;
  perspective?: Perspective;
  condition?: Condition;
}

const PERSPECTIVE_LABELS: Record<Perspective, string> = {
  "HANDHELD":    "✦ HANDHELD",
  "CAR-MOUNTED": "⬡ CAR-MOUNTED",
  "BIKE-MOUNTED":"◈ BIKE-MOUNTED",
  "DRONE":       "◉ DRONE",
};

export function FieldCaptureMockup({
  photoFile, lat, lon, accuracy, speed, label, sublabel,
  session, mode, photos = 1, perspective, condition,
}: FieldCaptureMockupProps) {
  return (
    <div className="w-full h-full relative bg-black overflow-hidden select-none">
      {/* Photo background */}
      <img
        src={`${BASE}screenshots/${photoFile}`}
        alt={label}
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Top gradient */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "130px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)",
          zIndex: 2,
        }}
      />

      {/* GPS status row — below dynamic island */}
      <div
        className="absolute inset-x-0 flex items-center justify-between px-3"
        style={{ top: "50px", zIndex: 3 }}
      >
        <div className="flex items-center gap-1.5">
          <span style={{ color: "#00e87a", fontSize: 8 }}>●</span>
          <span style={{ color: "#00e87a", fontSize: 9, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.05em" }}>
            GPS LOCK
          </span>
        </div>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 9, fontFamily: "monospace" }}>
          ±{accuracy}ft
        </span>
      </div>

      {/* Coordinates row */}
      <div
        className="absolute inset-x-0 px-3"
        style={{ top: "63px", zIndex: 3 }}
      >
        <span style={{ color: "rgba(255,255,255,0.80)", fontSize: 9, fontFamily: "monospace", letterSpacing: "0.03em" }}>
          {lat}° N  {lon}° W{speed ? `  ${speed} mph` : ""}
        </span>
      </div>

      {/* Perspective badge — top right */}
      {perspective && (
        <div
          className="absolute right-3"
          style={{ top: "50px", zIndex: 3 }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: 7,
              fontFamily: "monospace",
              letterSpacing: "0.08em",
              background: "rgba(0,0,0,0.5)",
              padding: "2px 5px",
              borderRadius: 3,
            }}
          >
            {PERSPECTIVE_LABELS[perspective]}
          </span>
        </div>
      )}

      {/* Poor condition indicator */}
      {condition === "poor" && (
        <div
          className="absolute left-3"
          style={{ top: "63px", zIndex: 4 }}
        >
          <span
            style={{
              color: "#ffb347",
              fontSize: 7,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: "0.1em",
              background: "rgba(0,0,0,0.55)",
              padding: "2px 5px",
              borderRadius: 3,
            }}
          >
            ⚠ POOR CONDITION
          </span>
        </div>
      )}

      {/* Bottom gradient */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: "210px",
          background: "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.6) 55%, transparent 100%)",
          zIndex: 2,
        }}
      />

      {/* Bottom overlay */}
      <div className="absolute inset-x-0 bottom-0 px-3 pb-4" style={{ zIndex: 3 }}>
        <div className="flex items-center gap-1 mb-1.5">
          <span style={{ color: "#00e87a", fontSize: 10 }}>📍</span>
          <span style={{ color: "#00e87a", fontFamily: "monospace", fontSize: 10, fontWeight: 700 }}>
            {lat}° N  /  {lon}° W
          </span>
        </div>

        <div style={{
          color: "rgba(255,255,255,0.92)",
          fontFamily: "monospace",
          fontSize: 10,
          fontWeight: 700,
          marginBottom: 2,
          letterSpacing: "0.04em",
        }}>
          {label}
        </div>

        {sublabel && (
          <div style={{ color: "rgba(255,255,255,0.55)", fontFamily: "monospace", fontSize: 9, marginBottom: 6 }}>
            {sublabel}
          </div>
        )}

        <div className="flex items-center gap-3 mt-1">
          <div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontFamily: "monospace", fontSize: 7, letterSpacing: "0.1em", textTransform: "uppercase" }}>SESSION</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontFamily: "monospace", fontSize: 9 }}>{session}</div>
          </div>
          <div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontFamily: "monospace", fontSize: 7, letterSpacing: "0.1em", textTransform: "uppercase" }}>MODE</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontFamily: "monospace", fontSize: 9 }}>{mode}</div>
          </div>
          <div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontFamily: "monospace", fontSize: 7, letterSpacing: "0.1em", textTransform: "uppercase" }}>PHOTO</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontFamily: "monospace", fontSize: 9 }}>#{photos}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
