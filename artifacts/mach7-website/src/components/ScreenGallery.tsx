import { useState } from "react";
import { SettingsMockup } from "@/components/SettingsMockup";

const ACCENT = {
  orange: { border: "#ff5500", glow: "rgba(255,85,0,0.32)" },
  green:  { border: "#00e87a", glow: "rgba(0,232,122,0.24)" },
  blue:   { border: "#0070f3", glow: "rgba(0,112,243,0.24)" },
};

interface PhoneEntry {
  src?: string;
  alt?: string;
  isComponent?: boolean;
  label: string;
  sublabel: string;
  accent: "orange" | "green" | "blue";
}

const PHONES: PhoneEntry[] = [
  { src: "screenshots/capture-manual.png", alt: "Capture screen — manual mode, GPS locked", label: "Capture", sublabel: "Manual · GPS locked", accent: "green" },
  { src: "screenshots/map-wide.jpg",        alt: "GPS route map — live multi-session track",  label: "Route Map",   sublabel: "Live GPS · multi-session",  accent: "blue"   },
  { src: "screenshots/map-zoomed.jpg",      alt: "Frame Log — 4 sessions mapped",             label: "Frame Log",   sublabel: "58 frames · 4 sessions",    accent: "blue"   },
  { src: "screenshots/photo-school.jpg",    alt: "Field photo — school zone GPS stamped",     label: "Field Shot",  sublabel: "School zone · GPS stamped", accent: "orange" },
  { src: "screenshots/photo-yield.jpg",     alt: "Photo detail — GPS overlay and metadata",   label: "Photo Detail",sublabel: "GPS overlay · metadata",    accent: "orange" },
  { isComponent: true,                                                                          label: "Settings",    sublabel: "FPS · mode · cloud sync",   accent: "orange" },
];

interface CardProps extends PhoneEntry {
  resolvedSrc?: string;
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
}

function PhoneCard({ resolvedSrc, alt, isComponent, label, sublabel, accent, hovered, onEnter, onLeave }: CardProps) {
  const { border, glow } = ACCENT[accent];
  return (
    <div
      className="flex flex-col items-center gap-3 shrink-0"
      style={{
        width: 160,
        transform: hovered ? "scale(1.5)" : "scale(1)",
        transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        zIndex: hovered ? 20 : 1,
        position: "relative",
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div
        className="w-full rounded-[2.5rem] overflow-hidden"
        style={{
          background: "#0e0e0e",
          border: "2px solid #2a2a2a",
          boxShadow: hovered
            ? `0 0 48px ${glow}, 0 20px 60px rgba(0,0,0,0.7), inset 0 0 0 1px ${border}55`
            : `0 0 0 1px ${border}22, inset 0 0 0 1px #1a1a1a`,
          transition: "box-shadow 0.35s ease",
        }}
      >
        <div className="flex justify-center pt-2.5 pb-1 bg-black/80">
          <div className="w-16 h-4 rounded-full bg-black" />
        </div>
        <div className="relative overflow-hidden" style={{ aspectRatio: "9/18", background: "#0a0a0a" }}>
          {isComponent ? (
            <div className="w-full h-full"><SettingsMockup /></div>
          ) : resolvedSrc ? (
            <img src={resolvedSrc} alt={alt} className="w-full h-full object-cover object-top" />
          ) : null}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.05) 0%,transparent 50%)" }}
          />
        </div>
        <div className="h-5 bg-[#0e0e0e] flex items-center justify-center">
          <div className="w-12 h-0.5 rounded-full bg-[#2a2a2a]" />
        </div>
      </div>
      <div className="text-center select-none">
        <p className="font-mono text-[11px] font-bold tracking-wider uppercase" style={{ color: border }}>{label}</p>
        <p className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
}

export function ScreenGallery() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const base = import.meta.env.BASE_URL;
  const doubled = [...PHONES, ...PHONES];

  return (
    <section id="screenshots" className="py-24 overflow-hidden">
      <style>{`
        @keyframes scroll-phones {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <div className="container mx-auto px-4 mb-14 text-center">
        <div className="inline-flex items-center gap-2 border border-border/40 bg-card/40 px-3 py-1 text-xs font-mono text-muted-foreground uppercase tracking-wider mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Real screenshots · live app · no staging
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Built for the field.
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Every screen built around one idea — the tool stays out of the way.
        </p>
      </div>

      <div
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 36,
            padding: "56px 36px",
            width: "max-content",
            animation: "scroll-phones 38s linear infinite",
            animationPlayState: hoveredIdx !== null ? "paused" : "running",
          }}
        >
          {doubled.map((phone, i) => {
            const realIdx = i % PHONES.length;
            return (
              <PhoneCard
                key={i}
                {...phone}
                resolvedSrc={phone.src ? `${base}${phone.src}` : undefined}
                hovered={hoveredIdx === realIdx}
                onEnter={() => setHoveredIdx(realIdx)}
                onLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
