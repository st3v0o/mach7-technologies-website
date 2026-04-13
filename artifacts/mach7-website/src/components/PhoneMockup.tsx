export function PhoneMockup() {
  return (
    <svg
      viewBox="0 0 300 620"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-2xl"
      aria-hidden="true"
    >
      {/* Phone body */}
      <rect x="2" y="2" width="296" height="616" rx="44" fill="#111111" stroke="#2a2a2a" strokeWidth="2" />
      {/* Side buttons */}
      <rect x="0" y="148" width="3" height="38" rx="1.5" fill="#2a2a2a" />
      <rect x="0" y="198" width="3" height="58" rx="1.5" fill="#2a2a2a" />
      <rect x="0" y="268" width="3" height="58" rx="1.5" fill="#2a2a2a" />
      <rect x="297" y="198" width="3" height="78" rx="1.5" fill="#2a2a2a" />
      {/* Dynamic island */}
      <rect x="106" y="18" width="88" height="28" rx="14" fill="#000000" />
      {/* Camera viewfinder */}
      <rect x="12" y="64" width="276" height="402" fill="#080808" />
      {/* Rule-of-thirds grid */}
      <line x1="12" y1="198" x2="288" y2="198" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
      <line x1="12" y1="332" x2="288" y2="332" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
      <line x1="104" y1="64" x2="104" y2="466" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
      <line x1="196" y1="64" x2="196" y2="466" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
      {/* Horizon scene — simulated road/field */}
      <rect x="12" y="280" width="276" height="186" fill="#0e0e0e" />
      <path d="M 12 380 Q 100 340 150 330 Q 200 320 288 280" stroke="#1c1c1c" strokeWidth="28" fill="none" />
      <path d="M 12 380 Q 100 340 150 330 Q 200 320 288 280" stroke="#222222" strokeWidth="12" fill="none" />
      <line x1="12" y1="358" x2="288" y2="310" stroke="#252525" strokeWidth="1.5" strokeDasharray="18 10" />
      {/* Sky gradient band */}
      <rect x="12" y="64" width="276" height="130" fill="url(#skyGrad)" />
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c1824" />
          <stop offset="100%" stopColor="#141414" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Focus box */}
      <rect x="116" y="220" width="68" height="68" rx="2" stroke="#ff5500" strokeWidth="1.2" opacity="0.7" />
      <line x1="150" y1="246" x2="150" y2="258" stroke="#ff5500" strokeWidth="1.2" opacity="0.5" />
      <line x1="137" y1="254" x2="163" y2="254" stroke="#ff5500" strokeWidth="1.2" opacity="0.5" />
      {/* GPS overlay bar */}
      <rect x="12" y="64" width="276" height="38" fill="#000000" opacity="0.75" />
      <circle cx="26" cy="83" r="5" fill="#ff0000">
        <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <text x="37" y="87" fontFamily="monospace" fontSize="9.5" fill="#ff4444" fontWeight="bold">REC  00:04:12</text>
      <text x="175" y="80" fontFamily="monospace" fontSize="8" fill="#00e87a" opacity="0.9">GPS LOCK</text>
      <circle cx="166" cy="77" r="4" fill="#00e87a" opacity="0.85" />
      <text x="175" y="91" fontFamily="monospace" fontSize="7.5" fill="#888888">38.8951°N  77.0364°W</text>
      {/* Segment + size */}
      <rect x="12" y="102" width="276" height="22" fill="#000000" opacity="0.55" />
      <text x="22" y="116" fontFamily="monospace" fontSize="8" fill="#666666">SEG 003</text>
      <text x="70" y="116" fontFamily="monospace" fontSize="8" fill="#ff5500">▮</text>
      <text x="80" y="116" fontFamily="monospace" fontSize="8" fill="#666666">189.4 MB / 250 MB</text>
      <text x="222" y="116" fontFamily="monospace" fontSize="8" fill="#444444">ALT 42m</text>
      {/* Bottom controls panel */}
      <rect x="12" y="466" width="276" height="138" fill="#0a0a0a" />
      <line x1="12" y1="466" x2="288" y2="466" stroke="#1e1e1e" strokeWidth="1" />
      {/* Mini GPS map thumbnail */}
      <rect x="22" y="480" width="62" height="62" rx="3" fill="#111" stroke="#222" strokeWidth="1" />
      <polyline
        points="28,534 36,522 44,516 54,508 62,502 70,495 78,492"
        stroke="#ff5500"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="78" cy="492" r="3" fill="#ff5500" />
      <circle cx="28" cy="534" r="2" fill="#ff5500" opacity="0.4" />
      <text x="53" y="551" fontFamily="monospace" fontSize="6.5" fill="#444" textAnchor="middle">TRACK</text>
      {/* Record button */}
      <circle cx="150" cy="516" r="36" fill="#161616" stroke="#282828" strokeWidth="1.5" />
      <circle cx="150" cy="516" r="26" fill="#cc2200" />
      <rect x="138" y="504" width="24" height="24" rx="4" fill="#aa1800" />
      {/* Clip counter */}
      <text x="150" y="562" fontFamily="monospace" fontSize="7.5" fill="#444" textAnchor="middle">3 CLIPS</text>
      {/* Camera flip */}
      <rect x="218" y="480" width="62" height="62" rx="3" fill="#111" stroke="#222" strokeWidth="1" />
      <path d="M 238 511 a 11 11 0 1 1 20 0" stroke="#555" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <polyline points="257,501 261,509 253,509" fill="#555" />
      <text x="249" y="551" fontFamily="monospace" fontSize="6.5" fill="#444" textAnchor="middle">FLIP</text>
      {/* Home indicator */}
      <rect x="118" y="576" width="64" height="4" rx="2" fill="#2a2a2a" />
    </svg>
  );
}
