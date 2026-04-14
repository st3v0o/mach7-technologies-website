const BASE = import.meta.env.BASE_URL;

interface FieldCaptureMockupProps {
  photoFile: string;
  lat: string;
  lon: string;
  accuracy: string;
  speed?: string;
  label: string;
  session: string;
  mode: "AUTO" | "MANUAL";
  photos?: number;
}

export function FieldCaptureMockup({
  photoFile, lat, lon, accuracy, speed, label, session, mode, photos = 1,
}: FieldCaptureMockupProps) {
  return (
    <div className="w-full h-full relative bg-black overflow-hidden select-none">
      {/* Photo background — full bleed */}
      <img
        src={`${BASE}screenshots/${photoFile}`}
        alt={label}
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Top gradient so text is readable */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "120px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
          zIndex: 2,
        }}
      />

      {/* GPS status row — sits BELOW the dynamic island (~44px) */}
      <div
        className="absolute inset-x-0 flex items-center justify-between px-3"
        style={{ top: "50px", zIndex: 3 }}
      >
        <div className="flex items-center gap-1.5">
          <span style={{ color: "#00e87a", fontSize: 8, lineHeight: 1 }}>●</span>
          <span style={{ color: "#00e87a", fontSize: 9, fontFamily: "monospace", fontWeight: 600, letterSpacing: "0.05em" }}>
            GPS LOCK
          </span>
        </div>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, fontFamily: "monospace" }}>
          ±{accuracy}ft
        </span>
      </div>

      {/* Coordinates row */}
      <div
        className="absolute inset-x-0 flex items-center px-3"
        style={{ top: "64px", zIndex: 3 }}
      >
        <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 9, fontFamily: "monospace", letterSpacing: "0.04em" }}>
          {lat}° N  {lon}° W{speed ? `  ${speed} mph` : ""}
        </span>
      </div>

      {/* Bottom gradient */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: "200px",
          background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)",
          zIndex: 2,
        }}
      />

      {/* Bottom overlay — coordinates + label + mode */}
      <div className="absolute inset-x-0 bottom-0 px-3 pb-4" style={{ zIndex: 3 }}>
        {/* GPS coordinate block */}
        <div className="flex items-center gap-1 mb-2">
          <span style={{ color: "#00e87a", fontSize: 10 }}>📍</span>
          <span style={{ color: "#00e87a", fontFamily: "monospace", fontSize: 10, fontWeight: 600 }}>
            {lat}° N  /  {lon}° W
          </span>
        </div>

        {/* Subject label */}
        <div style={{ color: "rgba(255,255,255,0.9)", fontFamily: "monospace", fontSize: 10, fontWeight: 600, marginBottom: 4, letterSpacing: "0.04em" }}>
          {label}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3">
          <div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "monospace", fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>SESSION</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontFamily: "monospace", fontSize: 9 }}>{session}</div>
          </div>
          <div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "monospace", fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>MODE</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontFamily: "monospace", fontSize: 9 }}>{mode}</div>
          </div>
          <div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "monospace", fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>PHOTO</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontFamily: "monospace", fontSize: 9 }}>#{photos}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
