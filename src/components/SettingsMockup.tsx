export function SettingsMockup() {
  return (
    <svg
      viewBox="0 0 300 620"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-2xl"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="settingsBodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#161616" />
          <stop offset="100%" stopColor="#0e0e0e" />
        </linearGradient>
        <clipPath id="settingsScreen">
          <rect x="12" y="56" width="276" height="548" rx="2" />
        </clipPath>
      </defs>

      {/* Phone body */}
      <rect x="2" y="2" width="296" height="616" rx="44" fill="url(#settingsBodyGrad)" stroke="#2a2a2a" strokeWidth="2" />
      {/* Side buttons */}
      <rect x="0" y="148" width="3" height="38" rx="1.5" fill="#2a2a2a" />
      <rect x="0" y="198" width="3" height="58" rx="1.5" fill="#2a2a2a" />
      <rect x="0" y="268" width="3" height="58" rx="1.5" fill="#2a2a2a" />
      <rect x="297" y="198" width="3" height="78" rx="1.5" fill="#2a2a2a" />
      {/* Dynamic island */}
      <rect x="106" y="14" width="88" height="28" rx="14" fill="#000" />

      {/* Screen background */}
      <rect x="12" y="56" width="276" height="548" fill="#0a0a0a" clipPath="url(#settingsScreen)" />

      {/* Header */}
      <rect x="12" y="56" width="276" height="64" fill="#111111" />
      <text x="24" y="88" fontFamily="'Space Grotesk', system-ui, sans-serif" fontSize="20" fontWeight="700" fill="#ffffff">Settings</text>
      <text x="24" y="106" fontFamily="monospace" fontSize="9" fill="#555555">MACH 7 · v1.0</text>

      {/* Separator */}
      <rect x="12" y="120" width="276" height="1" fill="#1e1e1e" />

      {/* Section label: Capture Mode */}
      <text x="24" y="142" fontFamily="monospace" fontSize="9" fill="#555555" letterSpacing="1">CAPTURE MODE</text>

      {/* Mode buttons row */}
      <rect x="20" y="150" width="82" height="54" rx="6" fill="#1a1a1a" stroke="#0070f3" strokeWidth="1.5" />
      <text x="61" y="170" fontFamily="monospace" fontSize="8.5" fill="#0070f3" textAnchor="middle">VIDEO</text>
      <text x="61" y="183" fontFamily="monospace" fontSize="7" fill="#0070f3" textAnchor="middle" opacity="0.7">Auto-segment</text>
      <text x="61" y="195" fontFamily="monospace" fontSize="7" fill="#555555" textAnchor="middle">250 MB clips</text>

      <rect x="110" y="150" width="82" height="54" rx="6" fill="#161616" stroke="#2a2a2a" strokeWidth="1" />
      <text x="151" y="170" fontFamily="monospace" fontSize="8.5" fill="#777777" textAnchor="middle">PHOTO</text>
      <text x="151" y="183" fontFamily="monospace" fontSize="7" fill="#555555" textAnchor="middle">Burst capture</text>
      <text x="151" y="195" fontFamily="monospace" fontSize="7" fill="#555555" textAnchor="middle">Auto-interval</text>

      <rect x="200" y="150" width="82" height="54" rx="6" fill="#161616" stroke="#2a2a2a" strokeWidth="1" />
      <text x="241" y="170" fontFamily="monospace" fontSize="8.5" fill="#777777" textAnchor="middle">MANUAL</text>
      <text x="241" y="183" fontFamily="monospace" fontSize="7" fill="#555555" textAnchor="middle">Tap to capture</text>
      <text x="241" y="195" fontFamily="monospace" fontSize="7" fill="#555555" textAnchor="middle">+ GPX route</text>

      {/* Section label: GPS Sampling */}
      <text x="24" y="228" fontFamily="monospace" fontSize="9" fill="#555555" letterSpacing="1">GPS SAMPLING</text>

      {/* Sampling card */}
      <rect x="20" y="236" width="262" height="56" rx="6" fill="#161616" stroke="#222222" strokeWidth="1" />

      {/* Time-based pill - selected */}
      <rect x="30" y="244" width="108" height="24" rx="4" fill="#0070f3" opacity="0.18" stroke="#0070f3" strokeWidth="1" />
      <text x="84" y="260" fontFamily="monospace" fontSize="8.5" fill="#0070f3" textAnchor="middle">TIME-BASED</text>

      {/* Distance pill */}
      <rect x="148" y="244" width="122" height="24" rx="4" fill="transparent" />
      <text x="209" y="260" fontFamily="monospace" fontSize="8.5" fill="#555555" textAnchor="middle">DISTANCE-BASED</text>

      {/* Value desc */}
      <text x="30" y="284" fontFamily="monospace" fontSize="8" fill="#666666">One frame every 2 seconds · ~0.5 fps</text>

      {/* Section label: Frame Rate */}
      <text x="24" y="314" fontFamily="monospace" fontSize="9" fill="#555555" letterSpacing="1">FRAME RATE</text>

      {/* FPS pills */}
      <rect x="20" y="322" width="262" height="36" rx="6" fill="#161616" stroke="#222222" strokeWidth="1" />
      {["0.2", "0.5", "1", "2", "5", "10"].map((fps, i) => {
        const x = 28 + i * 42;
        const selected = fps === "0.5";
        return (
          <g key={fps}>
            <rect x={x} y="330" width="34" height="20" rx="4" fill={selected ? "#0070f3" : "transparent"} opacity={selected ? 0.2 : 1} />
            {selected && <rect x={x} y="330" width="34" height="20" rx="4" fill="transparent" stroke="#0070f3" strokeWidth="1" />}
            <text x={x + 17} y="344" fontFamily="monospace" fontSize="8" fill={selected ? "#0070f3" : "#555555"} textAnchor="middle">{fps}</text>
          </g>
        );
      })}

      {/* Section label: Cloud Upload */}
      <text x="24" y="382" fontFamily="monospace" fontSize="9" fill="#555555" letterSpacing="1">CLOUD UPLOAD</text>

      {/* Upload card */}
      <rect x="20" y="390" width="262" height="70" rx="6" fill="#161616" stroke="#222222" strokeWidth="1" />
      <circle cx="40" cy="408" r="8" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
      <text x="40" y="412" fontFamily="monospace" fontSize="7" fill="#555555" textAnchor="middle">⬡</text>
      <text x="56" y="406" fontFamily="monospace" fontSize="9" fontWeight="bold" fill="#ffffff">Local Storage Only</text>
      <text x="56" y="419" fontFamily="monospace" fontSize="8" fill="#555555">No cloud configured</text>
      <rect x="24" y="432" width="120" height="20" rx="4" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
      <text x="84" y="446" fontFamily="monospace" fontSize="8" fill="#666666" textAnchor="middle">Configure Cloud →</text>
      <rect x="152" y="432" width="122" height="20" rx="4" fill="#1a1a1a" stroke="#0070f3" strokeWidth="0.8" />
      <text x="213" y="446" fontFamily="monospace" fontSize="8" fill="#0070f3" textAnchor="middle">Cloud Providers →</text>

      {/* Video quality */}
      <text x="24" y="482" fontFamily="monospace" fontSize="9" fill="#555555" letterSpacing="1">VIDEO QUALITY</text>
      <rect x="20" y="490" width="262" height="36" rx="6" fill="#161616" stroke="#222222" strokeWidth="1" />
      {["720p", "1080p", "4K"].map((q, i) => {
        const x = 28 + i * 88;
        const selected = q === "4K";
        return (
          <g key={q}>
            <rect x={x} y="498" width="72" height="20" rx="4" fill={selected ? "#ff5500" : "transparent"} opacity={selected ? 0.15 : 1} />
            {selected && <rect x={x} y="498" width="72" height="20" rx="4" fill="transparent" stroke="#ff5500" strokeWidth="1" />}
            <text x={x + 36} y="512" fontFamily="monospace" fontSize="8.5" fill={selected ? "#ff5500" : "#555555"} textAnchor="middle">{q}</text>
          </g>
        );
      })}

      {/* Segment size */}
      <text x="24" y="548" fontFamily="monospace" fontSize="9" fill="#555555" letterSpacing="1">SEGMENT SIZE</text>
      <rect x="20" y="556" width="262" height="28" rx="6" fill="#161616" stroke="#222222" strokeWidth="1" />
      <text x="30" y="574" fontFamily="monospace" fontSize="8.5" fill="#aaaaaa">250 MB per segment</text>
      <rect x="202" y="560" width="72" height="18" rx="4" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
      <text x="238" y="573" fontFamily="monospace" fontSize="8" fill="#666666" textAnchor="middle">Adjust →</text>

      {/* Tab bar */}
      <rect x="12" y="574" width="276" height="48" rx="0" fill="#111111" />
      <line x1="12" y1="574" x2="288" y2="574" stroke="#1e1e1e" strokeWidth="1" />
      {/* Tabs */}
      <text x="56" y="592" fontFamily="monospace" fontSize="7.5" fill="#555555" textAnchor="middle">⊙</text>
      <text x="56" y="604" fontFamily="monospace" fontSize="7" fill="#555555" textAnchor="middle">Capture</text>
      <text x="111" y="592" fontFamily="monospace" fontSize="7.5" fill="#555555" textAnchor="middle">☰</text>
      <text x="111" y="604" fontFamily="monospace" fontSize="7" fill="#555555" textAnchor="middle">Log</text>
      <text x="166" y="592" fontFamily="monospace" fontSize="7.5" fill="#555555" textAnchor="middle">⊡</text>
      <text x="166" y="604" fontFamily="monospace" fontSize="7" fill="#555555" textAnchor="middle">External</text>
      <text x="222" y="592" fontFamily="monospace" fontSize="7.5" fill="#ff5500" textAnchor="middle">⚙</text>
      <text x="222" y="604" fontFamily="monospace" fontSize="7" fill="#ff5500" textAnchor="middle">Settings</text>

      {/* Home indicator */}
      <rect x="118" y="608" width="64" height="4" rx="2" fill="#2a2a2a" />
    </svg>
  );
}
