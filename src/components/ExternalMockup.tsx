export function ExternalMockup() {
  return (
    <svg
      viewBox="0 0 300 620"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-2xl"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="extBodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#161616" />
          <stop offset="100%" stopColor="#0e0e0e" />
        </linearGradient>
        <linearGradient id="statusBarGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00e87a" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#00e87a" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* Phone body */}
      <rect x="2" y="2" width="296" height="616" rx="44" fill="url(#extBodyGrad)" stroke="#2a2a2a" strokeWidth="2" />
      {/* Side buttons */}
      <rect x="0" y="148" width="3" height="38" rx="1.5" fill="#2a2a2a" />
      <rect x="0" y="198" width="3" height="58" rx="1.5" fill="#2a2a2a" />
      <rect x="0" y="268" width="3" height="58" rx="1.5" fill="#2a2a2a" />
      <rect x="297" y="198" width="3" height="78" rx="1.5" fill="#2a2a2a" />
      {/* Dynamic island */}
      <rect x="106" y="14" width="88" height="28" rx="14" fill="#000" />

      {/* Screen bg */}
      <rect x="12" y="56" width="276" height="548" fill="#0a0a0a" />

      {/* Header */}
      <rect x="12" y="56" width="276" height="72" fill="#111111" />
      <text x="24" y="86" fontFamily="'Space Grotesk', system-ui, sans-serif" fontSize="19" fontWeight="700" fill="#ffffff">External Camera</text>
      <text x="24" y="104" fontFamily="monospace" fontSize="8.5" fill="#444444">Extensible provider architecture</text>
      <rect x="12" y="128" width="276" height="1" fill="#1e1e1e" />

      {/* Status bar — connected + recording */}
      <rect x="20" y="136" width="262" height="44" rx="6" fill="url(#statusBarGrad)" stroke="#00e87a" strokeWidth="0.8" />
      <circle cx="34" cy="155" r="5" fill="#00e87a">
        <animate attributeName="opacity" values="1;0.5;1" dur="1.4s" repeatCount="indefinite" />
      </circle>
      <text x="44" y="151" fontFamily="monospace" fontSize="8.5" fontWeight="bold" fill="#00e87a">CONNECTED</text>
      <text x="44" y="163" fontFamily="monospace" fontSize="7.5" fill="#555555">UVC Provider · USB Camera</text>
      <rect x="192" y="141" width="82" height="18" rx="3" fill="#cc2200" opacity="0.2" stroke="#cc2200" strokeWidth="0.8" />
      <circle cx="200" cy="150" r="3.5" fill="#cc2200">
        <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
      </circle>
      <text x="207" y="154" fontFamily="monospace" fontSize="7.5" fontWeight="bold" fill="#cc2200">RECORDING</text>
      <text x="24" y="174" fontFamily="monospace" fontSize="7.5" fill="#444444">GPS: Phone  ·  37.5366°N  77.3503°W  ·  ±16ft</text>

      {/* Section: Camera Source */}
      <text x="24" y="198" fontFamily="monospace" fontSize="9" fill="#444444" letterSpacing="1">CAMERA SOURCE</text>
      <rect x="20" y="206" width="262" height="60" rx="6" fill="#141414" stroke="#222222" strokeWidth="1" />

      {/* Provider options */}
      {/* UVC - selected */}
      <rect x="28" y="214" width="72" height="42" rx="5" fill="#161616" stroke="#0070f3" strokeWidth="1.5" />
      <text x="64" y="230" fontFamily="monospace" fontSize="8" fill="#0070f3" textAnchor="middle">⊡</text>
      <text x="64" y="243" fontFamily="monospace" fontSize="7.5" fill="#0070f3" textAnchor="middle">UVC</text>
      <text x="64" y="252" fontFamily="monospace" fontSize="6.5" fill="#0070f3" textAnchor="middle" opacity="0.7">USB</text>

      {/* NDI */}
      <rect x="108" y="214" width="72" height="42" rx="5" fill="#111111" stroke="#222222" strokeWidth="1" />
      <text x="144" y="230" fontFamily="monospace" fontSize="8" fill="#444444" textAnchor="middle">◈</text>
      <text x="144" y="243" fontFamily="monospace" fontSize="7.5" fill="#444444" textAnchor="middle">NDI</text>
      <text x="144" y="252" fontFamily="monospace" fontSize="6.5" fill="#333333" textAnchor="middle">Network</text>

      {/* RTSP */}
      <rect x="188" y="214" width="72" height="42" rx="5" fill="#111111" stroke="#222222" strokeWidth="1" />
      <text x="224" y="230" fontFamily="monospace" fontSize="8" fill="#444444" textAnchor="middle">⬡</text>
      <text x="224" y="243" fontFamily="monospace" fontSize="7.5" fill="#444444" textAnchor="middle">RTSP</text>
      <text x="224" y="252" fontFamily="monospace" fontSize="6.5" fill="#333333" textAnchor="middle">Stream</text>

      {/* Section: Device Discovery */}
      <text x="24" y="286" fontFamily="monospace" fontSize="9" fill="#444444" letterSpacing="1">DEVICE DISCOVERY</text>
      <rect x="20" y="294" width="262" height="72" rx="6" fill="#141414" stroke="#222222" strokeWidth="1" />

      {/* Device row */}
      <rect x="28" y="302" width="246" height="28" rx="4" fill="#00e87a" opacity="0.07" stroke="#00e87a" strokeWidth="0.6" />
      <circle cx="40" cy="316" r="5" fill="#00e87a" opacity="0.3" />
      <circle cx="40" cy="316" r="3" fill="#00e87a" />
      <text x="52" y="313" fontFamily="monospace" fontSize="8.5" fill="#ffffff">Insta360 Link 2C</text>
      <text x="52" y="325" fontFamily="monospace" fontSize="7.5" fill="#555555">4K · 30fps · USB 3.0</text>
      <rect x="230" y="305" width="36" height="18" rx="3" fill="#00e87a" opacity="0.15" stroke="#00e87a" strokeWidth="0.8" />
      <text x="248" y="317" fontFamily="monospace" fontSize="7" fill="#00e87a" textAnchor="middle">Active</text>

      {/* Second device */}
      <rect x="28" y="334" width="246" height="24" rx="4" fill="transparent" />
      <circle cx="40" cy="346" r="4" fill="#333333" />
      <text x="52" y="343" fontFamily="monospace" fontSize="8" fill="#555555">GoPro Hero 12</text>
      <text x="52" y="354" fontFamily="monospace" fontSize="7" fill="#3a3a3a">Disconnected</text>
      <rect x="224" y="336" width="42" height="18" rx="3" fill="#1a1a1a" stroke="#333" strokeWidth="0.8" />
      <text x="245" y="348" fontFamily="monospace" fontSize="7" fill="#555555" textAnchor="middle">Connect</text>

      {/* Section: GPS Source */}
      <text x="24" y="386" fontFamily="monospace" fontSize="9" fill="#444444" letterSpacing="1">GPS SOURCE</text>
      <rect x="20" y="394" width="262" height="42" rx="6" fill="#141414" stroke="#222222" strokeWidth="1" />
      <rect x="28" y="402" width="88" height="24" rx="4" fill="#1a1a1a" stroke="#0070f3" strokeWidth="1" />
      <text x="72" y="417" fontFamily="monospace" fontSize="8" fill="#0070f3" textAnchor="middle">Phone GPS</text>
      <rect x="124" y="402" width="68" height="24" rx="4" fill="transparent" />
      <text x="158" y="417" fontFamily="monospace" fontSize="8" fill="#3a3a3a" textAnchor="middle">Camera</text>
      <rect x="198" y="402" width="76" height="24" rx="4" fill="transparent" />
      <text x="236" y="417" fontFamily="monospace" fontSize="8" fill="#3a3a3a" textAnchor="middle">External NMEA</text>

      {/* Section: Capabilities */}
      <text x="24" y="456" fontFamily="monospace" fontSize="9" fill="#444444" letterSpacing="1">CAMERA CAPABILITIES</text>
      <rect x="20" y="464" width="262" height="64" rx="6" fill="#141414" stroke="#222222" strokeWidth="1" />
      <text x="30" y="482" fontFamily="monospace" fontSize="8.5" fill="#00e87a">✓</text>
      <text x="44" y="482" fontFamily="monospace" fontSize="8" fill="#aaaaaa">Start/Stop Recording</text>
      <text x="30" y="496" fontFamily="monospace" fontSize="8.5" fill="#00e87a">✓</text>
      <text x="44" y="496" fontFamily="monospace" fontSize="8" fill="#aaaaaa">Live Preview (UVC)</text>
      <text x="30" y="510" fontFamily="monospace" fontSize="8.5" fill="#555555">–</text>
      <text x="44" y="510" fontFamily="monospace" fontSize="8" fill="#444444">Pause / Resume</text>
      <text x="160" y="482" fontFamily="monospace" fontSize="8.5" fill="#00e87a">✓</text>
      <text x="174" y="482" fontFamily="monospace" fontSize="8" fill="#aaaaaa">4K @ 30fps</text>
      <text x="160" y="496" fontFamily="monospace" fontSize="8.5" fill="#00e87a">✓</text>
      <text x="174" y="496" fontFamily="monospace" fontSize="8" fill="#aaaaaa">Media Browser</text>
      <text x="160" y="510" fontFamily="monospace" fontSize="8.5" fill="#555555">–</text>
      <text x="174" y="510" fontFamily="monospace" fontSize="8" fill="#444444">Optical Zoom</text>

      {/* Record button row */}
      <rect x="20" y="537" width="262" height="30" rx="6" fill="#cc2200" opacity="0.85" />
      <circle cx="106" cy="552" r="5" fill="#ffffff" opacity="0.25" />
      <rect x="103" y="548" width="6" height="8" rx="1" fill="#ffffff" opacity="0.7" />
      <text x="160" y="556" fontFamily="monospace" fontSize="9" fontWeight="bold" fill="#ffffff" textAnchor="middle">STOP RECORDING</text>

      {/* Tab bar */}
      <rect x="12" y="574" width="276" height="48" fill="#111111" />
      <line x1="12" y1="574" x2="288" y2="574" stroke="#1e1e1e" strokeWidth="1" />
      <text x="56" y="592" fontFamily="monospace" fontSize="7.5" fill="#555555" textAnchor="middle">⊙</text>
      <text x="56" y="604" fontFamily="monospace" fontSize="7" fill="#555555" textAnchor="middle">Capture</text>
      <text x="111" y="592" fontFamily="monospace" fontSize="7.5" fill="#555555" textAnchor="middle">☰</text>
      <text x="111" y="604" fontFamily="monospace" fontSize="7" fill="#555555" textAnchor="middle">Log</text>
      <text x="166" y="592" fontFamily="monospace" fontSize="7.5" fill="#0070f3" textAnchor="middle">⊡</text>
      <text x="166" y="604" fontFamily="monospace" fontSize="7" fill="#0070f3" textAnchor="middle">External</text>
      <text x="222" y="592" fontFamily="monospace" fontSize="7.5" fill="#555555" textAnchor="middle">⚙</text>
      <text x="222" y="604" fontFamily="monospace" fontSize="7" fill="#555555" textAnchor="middle">Settings</text>

      {/* Home indicator */}
      <rect x="118" y="608" width="64" height="4" rx="2" fill="#2a2a2a" />
    </svg>
  );
}
