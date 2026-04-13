export function MapMockup() {
  const track =
    "58,388 72,362 88,334 108,308 132,284 158,262 182,244 204,224 222,204 236,184 244,162 246,140 242,118 232,100 216,88 198,82 178,84 158,94 140,110 124,132 112,156 104,180 100,206 100,232 106,254 118,270 134,278 150,278 162,268 170,252";

  return (
    <svg
      viewBox="0 0 480 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-hidden="true"
    >
      <defs>
        <filter id="trackGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="posGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff5500" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ff5500" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Map background */}
      <rect width="480" height="480" fill="#0c0c0c" />

      {/* Subtle grid */}
      {Array.from({ length: 13 }, (_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 40} x2="480" y2={i * 40} stroke="#161616" strokeWidth="1" />
      ))}
      {Array.from({ length: 13 }, (_, i) => (
        <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="480" stroke="#161616" strokeWidth="1" />
      ))}

      {/* Terrain features — roads */}
      <path d="M 0 310 Q 120 290 240 300 Q 360 308 480 285" stroke="#181818" strokeWidth="24" fill="none" />
      <path d="M 0 310 Q 120 290 240 300 Q 360 308 480 285" stroke="#1e1e1e" strokeWidth="10" fill="none" />
      <path d="M 200 480 L 200 300 Q 200 250 230 200 L 280 100" stroke="#181818" strokeWidth="16" fill="none" />
      <path d="M 200 480 L 200 300 Q 200 250 230 200 L 280 100" stroke="#1e1e1e" strokeWidth="6" fill="none" />

      {/* Area fills (blocks/parcels) */}
      <rect x="280" y="180" width="100" height="70" rx="2" fill="#131313" stroke="#1a1a1a" strokeWidth="1" />
      <rect x="280" y="260" width="80" height="60" rx="2" fill="#131313" stroke="#1a1a1a" strokeWidth="1" />
      <rect x="60" y="100" width="80" height="50" rx="2" fill="#131313" stroke="#1a1a1a" strokeWidth="1" />
      <rect x="340" y="330" width="90" height="80" rx="2" fill="#131313" stroke="#1a1a1a" strokeWidth="1" />

      {/* GPS track glow layer */}
      <polyline
        points={track}
        stroke="#ff5500"
        strokeWidth="8"
        fill="none"
        opacity="0.18"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#trackGlow)"
      />
      {/* GPS track main line */}
      <polyline
        points={track}
        stroke="#ff5500"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Waypoints along track */}
      {[
        { x: 58, y: 388 },
        { x: 132, y: 284 },
        { x: 204, y: 224 },
        { x: 246, y: 140 },
      ].map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r="4" fill="#ff5500" opacity="0.6" />
      ))}

      {/* Start marker */}
      <circle cx="58" cy="388" r="7" fill="none" stroke="#ff5500" strokeWidth="1.5" opacity="0.5" />
      <text x="68" y="392" fontFamily="monospace" fontSize="8" fill="#666666">START</text>

      {/* Current position marker */}
      <circle cx="170" cy="252" r="22" fill="url(#posGlow)" />
      <circle cx="170" cy="252" r="9" fill="#ff5500" opacity="0.25" />
      <circle cx="170" cy="252" r="5" fill="#ff5500" opacity="0.7" />
      <circle cx="170" cy="252" r="2.5" fill="#ffffff" />

      {/* Top HUD bar */}
      <rect x="0" y="0" width="480" height="42" fill="#000000" opacity="0.85" />
      <circle cx="16" cy="21" r="5" fill="#ff0000" opacity="0.9" />
      <text x="27" y="25" fontFamily="monospace" fontSize="10" fill="#ff4444" fontWeight="bold">
        REC  00:04:12
      </text>
      <text x="200" y="18" fontFamily="monospace" fontSize="8.5" fill="#aaaaaa" textAnchor="middle">
        38.8951° N  77.0364° W
      </text>
      <text x="200" y="31" fontFamily="monospace" fontSize="8" fill="#555555" textAnchor="middle">
        ALT 42m  |  SPD 4.2 km/h
      </text>
      <rect x="392" y="10" width="48" height="20" rx="3" stroke="#ff5500" strokeWidth="1" fill="none" />
      <text x="416" y="24" fontFamily="monospace" fontSize="9" fill="#ff5500" textAnchor="middle" fontWeight="bold">
        LIVE
      </text>

      {/* Bottom HUD bar */}
      <rect x="0" y="440" width="480" height="40" fill="#000000" opacity="0.85" />
      <text x="20" y="464" fontFamily="monospace" fontSize="9" fill="#777777">
        DIST  2.4 km
      </text>
      <text x="170" y="464" fontFamily="monospace" fontSize="9" fill="#777777">
        PTS  847
      </text>
      <text x="300" y="464" fontFamily="monospace" fontSize="9" fill="#777777">
        SEG  003
      </text>
      <text x="390" y="464" fontFamily="monospace" fontSize="9" fill="#ff5500">
        ● LOGGING
      </text>

      {/* Scale bar */}
      <line x1="380" y1="415" x2="460" y2="415" stroke="#444444" strokeWidth="1" />
      <line x1="380" y1="411" x2="380" y2="419" stroke="#444444" strokeWidth="1" />
      <line x1="460" y1="411" x2="460" y2="419" stroke="#444444" strokeWidth="1" />
      <text x="420" y="430" fontFamily="monospace" fontSize="8" fill="#444444" textAnchor="middle">
        500 m
      </text>

      {/* Clip counter badge */}
      <rect x="12" y="52" width="72" height="20" rx="2" fill="#111111" stroke="#222222" strokeWidth="1" />
      <text x="48" y="65" fontFamily="monospace" fontSize="8" fill="#666666" textAnchor="middle">
        3 CLIPS  ▸
      </text>
    </svg>
  );
}
