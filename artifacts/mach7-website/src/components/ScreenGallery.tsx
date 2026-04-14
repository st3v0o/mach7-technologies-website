import { useState } from "react";
import { SettingsMockup } from "@/components/SettingsMockup";
import { FieldCaptureMockup } from "@/components/FieldCaptureMockup";

const ACCENT = {
  orange: { border: "#ff5500", glow: "rgba(255,85,0,0.32)" },
  green:  { border: "#00e87a", glow: "rgba(0,232,122,0.28)" },
  blue:   { border: "#4a9eff", glow: "rgba(74,158,255,0.28)" },
  teal:   { border: "#00c9b1", glow: "rgba(0,201,177,0.28)" },
  amber:  { border: "#ffb347", glow: "rgba(255,179,71,0.28)" },
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
  // --- Drone aerial overview ---
  {
    label: "Aerial Survey",
    sublabel: "Drone · site overview",
    accent: "blue",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-aerial.jpg"
          lat="40.7128" lon="74.0060"
          accuracy="22" speed="12"
          label="INTERSECTION — SITE OVERVIEW"
          sublabel="drone altitude: 120ft"
          session="7_091544" mode="AUTO" photos={31}
          perspective="DRONE"
        />
      ),
    },
  },
  // --- Car-mounted road survey ---
  {
    label: "Road Survey",
    sublabel: "Car-mounted · driving",
    accent: "orange",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-road.jpg"
          lat="38.9072" lon="77.0369"
          accuracy="11" speed="28"
          label="ROAD CONDITION — PAVEMENT SURVEY"
          sublabel="dynamic fps · 28 mph"
          session="2_141033" mode="AUTO" photos={847}
          perspective="CAR-MOUNTED"
        />
      ),
    },
  },
  // --- Cracked pavement poor condition ---
  {
    label: "Pavement Distress",
    sublabel: "Poor condition · car survey",
    accent: "amber",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-pavement.jpg"
          lat="41.8781" lon="87.6298"
          accuracy="9" speed="5"
          label="PAVEMENT — ALLIGATOR CRACKING"
          sublabel="PCI survey · block 4 of 12"
          session="1_083017" mode="AUTO" photos={22}
          perspective="CAR-MOUNTED"
          condition="poor"
        />
      ),
    },
  },
  // --- Street tree handheld good condition ---
  {
    label: "Tree Inventory",
    sublabel: "Handheld · street tree",
    accent: "green",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-tree.jpg"
          lat="34.0522" lon="118.2437"
          accuracy="14"
          label="STREET TREE — CANOPY CONDITION"
          sublabel="urban forestry survey"
          session="3_101200" mode="MANUAL" photos={6}
          perspective="HANDHELD"
        />
      ),
    },
  },
  // --- App UI: capture screen ---
  {
    label: "Capture",
    sublabel: "Manual · GPS locked",
    accent: "green",
    content: {
      kind: "image",
      src: "screenshots/capture-manual.png",
      alt: "Geospector — manual GPS capture mode",
    },
  },
  // --- Deteriorated park bench ---
  {
    label: "Bench Condition",
    sublabel: "Poor condition · handheld",
    accent: "amber",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-bench.jpg"
          lat="40.7831" lon="73.9712"
          accuracy="10"
          label="PARK BENCH — PAINT FAILURE / DECAY"
          sublabel="parks asset condition audit"
          session="5_152244" mode="MANUAL" photos={3}
          perspective="HANDHELD"
          condition="poor"
        />
      ),
    },
  },
  // --- Bike-mounted trail survey ---
  {
    label: "Trail Survey",
    sublabel: "Bike-mounted · path audit",
    accent: "teal",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-bike.jpg"
          lat="47.6062" lon="122.3321"
          accuracy="12" speed="11"
          label="BIKE TRAIL — SURFACE CONDITION"
          sublabel="dynamic interval · 11 mph"
          session="4_073318" mode="AUTO" photos={54}
          perspective="BIKE-MOUNTED"
        />
      ),
    },
  },
  // --- Birds clearly in frame ---
  {
    label: "Bird Count",
    sublabel: "Handheld · wildlife transect",
    accent: "teal",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-birds.jpg"
          lat="25.7617" lon="80.1918"
          accuracy="16"
          label="BIRD COUNT — FLOCK OBSERVATION"
          sublabel="wildlife transect · migratory"
          session="6_064910" mode="MANUAL" photos={14}
          perspective="HANDHELD"
        />
      ),
    },
  },
  // --- Coastal / water GPS ---
  {
    label: "Coastal Survey",
    sublabel: "Handheld · shoreline GPS",
    accent: "blue",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-coast.jpg"
          lat="36.7783" lon="119.4179"
          accuracy="18"
          label="COASTAL ACCESS — PIER CONDITION"
          sublabel="shoreline erosion monitoring"
          session="8_093020" mode="MANUAL" photos={9}
          perspective="HANDHELD"
        />
      ),
    },
  },
  // --- Road warning sign ---
  {
    label: "Sign Inventory",
    sublabel: "Handheld · sign condition",
    accent: "orange",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-sign.jpg"
          lat="33.4484" lon="112.0740"
          accuracy="13"
          label="ROAD SIGN — RETROREFLECTIVITY CHECK"
          sublabel="sign inventory · district 3"
          session="9_111502" mode="MANUAL" photos={17}
          perspective="HANDHELD"
        />
      ),
    },
  },
  // --- Route map UI ---
  {
    label: "Route Map",
    sublabel: "Live GPS · session track",
    accent: "blue",
    content: {
      kind: "image",
      src: "screenshots/map-wide.jpg",
      alt: "Geospector — GPS route map with session data",
    },
  },
  // --- Settings ---
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
        {/* Status bar — dynamic island lives here, nothing hidden below */}
        <div className="flex justify-center bg-black" style={{ paddingTop: 8, paddingBottom: 6 }}>
          <div className="w-14 h-3.5 rounded-full bg-[#111]" />
        </div>

        {/* Screen content */}
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
            style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.03) 0%,transparent 50%)" }}
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
        .phones-running { animation: scroll-phones 60s linear infinite; }
        .phones-paused  { animation: scroll-phones 60s linear infinite; animation-play-state: paused; }
      `}</style>

      <div className="container mx-auto px-4 mb-14 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary/90 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Drone · car · bike · handheld — GPS on every capture
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Built for the field.
        </h2>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Any mount, any subject, any condition — every frame tagged.
        </p>
      </div>

      <div
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      >
        <div
          className={hoveredIdx !== null ? "phones-paused" : "phones-running"}
          style={{
            display: "flex",
            gap: 36,
            padding: "56px 36px",
            width: "max-content",
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
