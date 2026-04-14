import { useState } from "react";
import { SettingsMockup } from "@/components/SettingsMockup";
import { FieldCaptureMockup } from "@/components/FieldCaptureMockup";

const ACCENT = {
  orange: { border: "#ff5500", glow: "rgba(255,85,0,0.32)" },
  green:  { border: "#00e87a", glow: "rgba(0,232,122,0.28)" },
  blue:   { border: "#4a9eff", glow: "rgba(74,158,255,0.28)" },
  teal:   { border: "#00c9b1", glow: "rgba(0,201,177,0.28)" },
};

type AccentKey = keyof typeof ACCENT;

interface PhoneEntry {
  label: string;
  sublabel: string;
  accent: AccentKey;
  content:
    | { kind: "image"; src: string; alt: string }
    | { kind: "component"; el: React.ReactElement };
}

const PHONES: PhoneEntry[] = [
  {
    label: "Capture",
    sublabel: "Manual · GPS locked",
    accent: "green",
    content: { kind: "image", src: "screenshots/capture-manual.png", alt: "Capture screen — manual mode, GPS locked" },
  },
  {
    label: "City Tree",
    sublabel: "Street tree survey",
    accent: "green",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-tree.jpg"
          lat="40.7128" lon="74.0060"
          accuracy="12" speed="0"
          label="STREET TREE — CONDITION SURVEY"
          session="4_083122" mode="MANUAL" photos={7}
        />
      ),
    },
  },
  {
    label: "Park Bench",
    sublabel: "Asset condition log",
    accent: "orange",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-bench.jpg"
          lat="40.7831" lon="73.9712"
          accuracy="9"
          label="PARK BENCH — ASSET CONDITION"
          session="2_141055" mode="MANUAL" photos={3}
        />
      ),
    },
  },
  {
    label: "Reef Survey",
    sublabel: "Coastal monitoring",
    accent: "teal",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-reef.jpg"
          lat="21.3069" lon="157.8583"
          accuracy="18"
          label="REEF CONDITION — MONITORING POINT"
          session="1_094733" mode="AUTO" photos={24}
        />
      ),
    },
  },
  {
    label: "Bird Count",
    sublabel: "Wildlife transect",
    accent: "teal",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-birds.jpg"
          lat="38.9072" lon="77.0369"
          accuracy="14"
          label="BIRD COUNT — TRANSECT WALK"
          session="3_071208" mode="MANUAL" photos={12}
        />
      ),
    },
  },
  {
    label: "Trail Access",
    sublabel: "ADA accessibility audit",
    accent: "orange",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-ramp.jpg"
          lat="47.6062" lon="122.3321"
          accuracy="11" speed="2"
          label="TRAIL — ADA ACCESSIBILITY AUDIT"
          session="5_103047" mode="AUTO" photos={18}
        />
      ),
    },
  },
  {
    label: "Route Map",
    sublabel: "Live GPS · multi-session",
    accent: "blue",
    content: { kind: "image", src: "screenshots/map-wide.jpg", alt: "GPS route map — live multi-session track" },
  },
  {
    label: "Settings",
    sublabel: "FPS · mode · cloud sync",
    accent: "orange",
    content: { kind: "component", el: <SettingsMockup /> },
  },
];

interface CardProps extends PhoneEntry {
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
  base: string;
}

function PhoneCard({ label, sublabel, accent, content, hovered, onEnter, onLeave, base }: CardProps) {
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
        {/* Status bar area — dynamic island sits here */}
        <div className="flex justify-center bg-black" style={{ paddingTop: 8, paddingBottom: 6 }}>
          <div className="w-14 h-3.5 rounded-full bg-[#111]" />
        </div>

        {/* Screen content — starts BELOW the dynamic island, nothing gets hidden */}
        <div className="relative overflow-hidden" style={{ aspectRatio: "9/18", background: "#0a0a0a" }}>
          {content.kind === "component" ? (
            <div className="w-full h-full">{content.el}</div>
          ) : (
            <img
              src={`${base}${content.src}`}
              alt={content.alt}
              className="w-full h-full object-cover object-top"
            />
          )}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.04) 0%,transparent 50%)" }}
          />
        </div>

        {/* Home indicator */}
        <div className="h-5 bg-[#0e0e0e] flex items-center justify-center">
          <div className="w-10 h-0.5 rounded-full bg-[#2a2a2a]" />
        </div>
      </div>

      <div className="text-center select-none">
        <p className="text-[11px] font-semibold tracking-wide" style={{ color: border }}>{label}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sublabel}</p>
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
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary/90 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Real use cases · live GPS · every frame tagged
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Built for the field.
        </h2>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
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
            animation: "scroll-phones 46s linear infinite",
            animationPlayState: hoveredIdx !== null ? "paused" : "running",
          }}
        >
          {doubled.map((phone, i) => {
            const realIdx = i % PHONES.length;
            return (
              <PhoneCard
                key={i}
                {...phone}
                base={base}
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
