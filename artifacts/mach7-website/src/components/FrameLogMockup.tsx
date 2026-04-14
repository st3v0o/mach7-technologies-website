const FONT = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

export function FrameLogMockup() {
  const blueH = Array.from({ length: 30 }, (_, i) => ({
    cx: 47 + i * 8.62,
    cy: 278 - i * 0.86,
  }));
  const blueV = Array.from({ length: 16 }, (_, i) => ({
    cx: 302,
    cy: 252 - i * 4.67,
  }));
  const blueDots = [...blueH, ...blueV];

  const greenDots = Array.from({ length: 6 }, (_, i) => ({
    cx: 311 + i * 10,
    cy: 181,
  }));

  const yellowDots = [
    { cx: 374, cy: 181 },
    { cx: 386, cy: 181 },
  ];

  const redDots = [
    { cx: 470, cy: 170 },
    { cx: 479, cy: 165 },
    { cx: 488, cy: 170 },
    { cx: 497, cy: 164 },
  ];

  const sessions = [
    { color: "#4a8dff", isVideo: true,  label: "Apr 7  ·  5:23 PM  ·  46 frames" },
    { color: "#3dc87e", isVideo: false, label: "Apr 7  ·  5:22 PM  ·  6 frames" },
    { color: "#f0b03a", isVideo: false, label: "Apr 7  ·  5:22 PM  ·  2 frames" },
    { color: "#ff4444", isVideo: true,  label: "Apr 7  ·  5:21 PM  ·  4 frames" },
  ];

  return (
    <svg
      viewBox="0 0 600 600"
      className="w-full h-full"
      role="img"
      aria-label="Geospector Frame Log — GPS route map showing four capture sessions on Apr 7 with 58 total frames plotted"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── MAP BASE ─────────────────────────────── */}
      {/* Base teal-dark background matching app map style */}
      <rect width="600" height="475" fill="#0e1a18" />

      {/* Park / vegetation fills */}
      <polygon points="0,0 200,0 240,68 178,122 52,112 0,62"           fill="#0a1a10" />
      <polygon points="308,0 600,0 600,158 515,132 388,82 302,40"      fill="#0a1a10" />
      <polygon points="435,158 600,143 600,318 538,346 428,302 415,232" fill="#0c1c12" />
      <polygon points="0,425 90,410 110,450 60,475 0,475"               fill="#0a1a10" />

      {/* Water bodies */}
      <ellipse cx="416" cy="378" rx="52" ry="30" fill="#0e2a50" />
      <ellipse cx="377" cy="403" rx="28" ry="16" fill="#0e2a50" />
      <path d="M 416 348 Q 400 362 377 387" stroke="#0e2a50" strokeWidth="8" fill="none" strokeLinecap="round" />

      {/* ── PARCELS / CITY BLOCKS ────────────────── */}
      {[
        [8, 290, 48, 34], [8, 332, 48, 34], [8, 374, 48, 40],
        [64, 290, 50, 34], [64, 332, 50, 34], [64, 374, 50, 40],
        [122, 290, 50, 34], [122, 332, 50, 34], [122, 374, 50, 40],
        [180, 290, 48, 34], [180, 332, 48, 34], [180, 374, 48, 40],
        [336, 232, 48, 38], [336, 278, 48, 34], [336, 320, 48, 34],
        [392, 232, 28, 38], [392, 278, 28, 34],
        [240, 132, 38, 34], [240, 174, 38, 34],
        [286, 132, 38, 34], [286, 174, 38, 34],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill="#1f2e2b" />
      ))}

      {/* ── ROAD NETWORK ─────────────────────────── */}

      {/* Residential NS streets — casing */}
      {[65, 120, 178, 238, 338, 398, 463, 532].map((x) => (
        <line key={`nsc${x}`} x1={x} y1="0" x2={x} y2="475" stroke="#0c1614" strokeWidth="5" />
      ))}
      {/* Residential NS streets — fill */}
      {[65, 120, 178, 238, 338, 398, 463, 532].map((x) => (
        <line key={`nsf${x}`} x1={x} y1="0" x2={x} y2="475" stroke="#2a3f3a" strokeWidth="3" />
      ))}

      {/* Residential EW streets — casing */}
      {[168, 213, 293, 328, 366, 408, 443].map((y) => (
        <line key={`ewc${y}`} x1="0" y1={y} x2="600" y2={y} stroke="#0c1614" strokeWidth="5" />
      ))}
      {/* Residential EW streets — fill */}
      {[168, 213, 293, 328, 366, 408, 443].map((y) => (
        <line key={`ewf${y}`} x1="0" y1={y} x2="600" y2={y} stroke="#2a3f3a" strokeWidth="3" />
      ))}

      {/* Arterial EW (route road y≈265) — casing */}
      <line x1="0" y1="265" x2="600" y2="265" stroke="#0d1816" strokeWidth="9" />
      {/* Arterial EW — fill */}
      <line x1="0" y1="265" x2="600" y2="265" stroke="#3d5750" strokeWidth="5.5" />

      {/* Arterial NS (x≈302) — casing */}
      <line x1="302" y1="0" x2="302" y2="270" stroke="#0d1816" strokeWidth="9" />
      {/* Arterial NS — fill */}
      <line x1="302" y1="0" x2="302" y2="270" stroke="#3d5750" strokeWidth="5.5" />

      {/* US-60 (y≈305, slightly curved) — casing */}
      <path d="M 0 310 Q 210 304 432 308 Q 522 310 600 305" stroke="#0e1a18" strokeWidth="10" fill="none" />
      {/* US-60 — fill */}
      <path d="M 0 310 Q 210 304 432 308 Q 522 310 600 305" stroke="#4a6860" strokeWidth="6.5" fill="none" />

      {/* I-64 diagonal highway — outer casing */}
      <path d="M -15 68 Q 105 93 205 118 Q 355 154 615 192" stroke="#0a1210" strokeWidth="22" fill="none" strokeLinecap="round" />
      {/* I-64 — road fill */}
      <path d="M -15 68 Q 105 93 205 118 Q 355 154 615 192" stroke="#5a7870" strokeWidth="14" fill="none" strokeLinecap="round" />
      {/* I-64 — center divider */}
      <path d="M -15 68 Q 105 93 205 118 Q 355 154 615 192" stroke="#0e1a18" strokeWidth="1.5" strokeDasharray="14,9" fill="none" />

      {/* ── HIGHWAY SHIELDS ──────────────────────── */}

      {/* I-64 shield at (172, 105) */}
      <g transform="translate(158, 94)">
        <rect x="0" y="0" width="30" height="20" rx="3.5" fill="#1a56a8" />
        <rect x="0" y="0" width="30" height="7"  rx="3.5" fill="#cc1f1f" />
        <rect x="0" y="4" width="30" height="3"  fill="#cc1f1f" />
        <text x="4" y="17" fontFamily="Arial Black, Arial, sans-serif" fontSize="10" fontWeight="900" fill="white">
          I-64
        </text>
      </g>

      {/* US-60 shield at (430, 287) */}
      <g transform="translate(418, 276)">
        <path d="M 1 5 Q 1 0 6 0 L 22 0 Q 27 0 27 5 L 27 15 L 14 22 L 1 15 Z" fill="white" />
        <path d="M 2.5 5.5 Q 2.5 1.5 6.5 1.5 L 21.5 1.5 Q 25.5 1.5 25.5 5.5 L 25.5 14.5 L 14 20.5 L 2.5 14.5 Z" fill="#1a56a8" />
        <text x="9" y="12" fontFamily="Arial Black, Arial, sans-serif" fontSize="8" fontWeight="900" fill="white">60</text>
      </g>

      {/* Road label */}
      <text x="9" y="260" fontFamily={FONT} fontSize="7.5" fill="rgba(255,255,255,0.35)" fontWeight="600" letterSpacing="0.08em">
        WILLIAMSBURG RD
      </text>

      {/* ── GPS CAPTURE DOTS ─────────────────────── */}

      {/* Blue — video (46) */}
      {blueDots.map((d, i) => (
        <circle key={`b${i}`} cx={d.cx} cy={d.cy} r="5.5" fill="#4a8dff" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
      ))}
      {/* Green — photo (6) */}
      {greenDots.map((d, i) => (
        <circle key={`g${i}`} cx={d.cx} cy={d.cy} r="5.5" fill="#3dc87e" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
      ))}
      {/* Yellow — photo (2) */}
      {yellowDots.map((d, i) => (
        <circle key={`y${i}`} cx={d.cx} cy={d.cy} r="5.5" fill="#f0b03a" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
      ))}
      {/* Red — video (4) */}
      {redDots.map((d, i) => (
        <circle key={`r${i}`} cx={d.cx} cy={d.cy} r="5.5" fill="#ff4444" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
      ))}

      {/* ── LEGEND PANEL ─────────────────────────── */}
      <rect x="0" y="475" width="600" height="125" fill="#090e14" />
      <line x1="0" y1="475" x2="600" y2="475" stroke="#182535" strokeWidth="1" />

      {sessions.map((s, i) => {
        const cy = 498 + i * 30;
        return (
          <g key={i}>
            {/* Colour dot */}
            <circle cx="22" cy={cy} r="8" fill={s.color} />

            {/* Icon — camera or video */}
            {s.isVideo ? (
              <g transform={`translate(38, ${cy - 6})`}>
                <rect x="0" y="1" width="11" height="9" rx="1.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.3" />
                <polygon points="12,2 16,5.5 12,9" fill="rgba(255,255,255,0.5)" />
              </g>
            ) : (
              <g transform={`translate(38, ${cy - 6})`}>
                <rect x="0" y="2" width="14" height="9.5" rx="1.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.3" />
                <circle cx="7" cy="7" r="2.8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
                <rect x="4.5" y="0" width="5" height="2" rx="0.5" fill="rgba(255,255,255,0.5)" />
              </g>
            )}

            {/* Label */}
            <text
              x="60"
              y={cy + 5}
              fontFamily={FONT}
              fontSize="14"
              fill="rgba(255,255,255,0.88)"
            >
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
