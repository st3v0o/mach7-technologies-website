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
  // 1. Top-down parking lot — drone — pavement marking audit
  {
    label: "Parking Lot Survey",
    sublabel: "Drone · top-down · marking audit",
    accent: "blue",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-aerial.jpg"
          lat="40.7128" lon="74.0060"
          accuracy="18" speed="0"
          label="PARKING LOT — PAVEMENT MARKING AUDIT"
          sublabel="drone altitude: 80ft  ·  0 mph"
          session="7_091544" mode="AUTO" photos={41}
          perspective="DRONE"
        />
      ),
    },
  },
  // 2. Highway from car — road condition survey
  {
    label: "Road Survey",
    sublabel: "Car-mounted · highway patrol",
    accent: "orange",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-road.jpg"
          lat="38.7273" lon="109.5925"
          accuracy="11" speed="35"
          label="HIGHWAY — SURFACE CONDITION SURVEY"
          sublabel="dynamic fps · 35 mph"
          session="2_141033" mode="AUTO" photos={1204}
          perspective="CAR-MOUNTED"
        />
      ),
    },
  },
  // 3. Cracked sidewalk — ADA compliance / handheld
  {
    label: "Sidewalk Crack",
    sublabel: "Handheld · poor condition",
    accent: "amber",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-pavement.jpg"
          lat="41.8781" lon="87.6298"
          accuracy="9"
          label="SIDEWALK — LONGITUDINAL CRACK"
          sublabel="ADA compliance survey · segment 7"
          session="1_083017" mode="MANUAL" photos={14}
          perspective="HANDHELD"
          condition="poor"
        />
      ),
    },
  },
  // 4. Street tree canopy — urban forestry inventory
  {
    label: "Street Tree",
    sublabel: "Handheld · canopy inventory",
    accent: "green",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-tree.jpg"
          lat="34.0522" lon="118.2437"
          accuracy="14"
          label="STREET TREE — CANOPY CONDITION"
          sublabel="urban forestry inventory  ·  block 12"
          session="3_101200" mode="MANUAL" photos={3}
          perspective="HANDHELD"
        />
      ),
    },
  },
  // 5. App UI: capture screen
  {
    label: "Capture UI",
    sublabel: "Manual mode · GPS locked",
    accent: "green",
    content: {
      kind: "image",
      src: "screenshots/capture-manual.png",
      alt: "Geospector — GPS capture UI",
    },
  },
  // 6. Weathered park bench — poor condition
  {
    label: "Park Bench",
    sublabel: "Handheld · poor condition",
    accent: "amber",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-bench.jpg"
          lat="40.7831" lon="73.9712"
          accuracy="10"
          label="PARK BENCH — WOOD ROT / NEGLECT"
          sublabel="parks asset audit  ·  deteriorated"
          session="5_152244" mode="MANUAL" photos={2}
          perspective="HANDHELD"
          condition="poor"
        />
      ),
    },
  },
  // 7. Kingfisher / wildlife observation
  {
    label: "Wildlife Obs.",
    sublabel: "Handheld · species sighting",
    accent: "teal",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-birds.jpg"
          lat="25.7617" lon="80.1918"
          accuracy="16"
          label="KINGFISHER — SPECIES SIGHTING"
          sublabel="riparian habitat survey"
          session="6_064910" mode="MANUAL" photos={7}
          perspective="HANDHELD"
        />
      ),
    },
  },
  // 8. Paved trail through trees — trail condition audit
  {
    label: "Trail Condition",
    sublabel: "Handheld · surface audit",
    accent: "teal",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-trail.jpg"
          lat="47.6062" lon="122.3321"
          accuracy="12"
          label="MULTI-USE TRAIL — SURFACE AUDIT"
          sublabel="parks trail survey  ·  segment 4"
          session="4_073318" mode="MANUAL" photos={11}
          perspective="HANDHELD"
        />
      ),
    },
  },
  // 9. Stormwater outfall — drainage infrastructure / poor condition
  {
    label: "Stormwater Outfall",
    sublabel: "Handheld · drainage inspection",
    accent: "blue",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-drain.jpg"
          lat="36.7783" lon="119.4179"
          accuracy="20"
          label="STORMWATER OUTFALL — FLOODING"
          sublabel="MS4 drainage inspection"
          session="8_093020" mode="MANUAL" photos={5}
          perspective="HANDHELD"
          condition="poor"
        />
      ),
    },
  },
  // 10. Vandalized sign box — poor condition
  {
    label: "Sign Vandalism",
    sublabel: "Handheld · vandalism report",
    accent: "orange",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-sign.jpg"
          lat="33.4484" lon="112.0740"
          accuracy="13"
          label="SIGN BOX — GRAFFITI / VANDALISM"
          sublabel="asset condition report  ·  zone 3"
          session="9_111502" mode="MANUAL" photos={1}
          perspective="HANDHELD"
          condition="poor"
        />
      ),
    },
  },
  // 11. Coastal aerial — shoreline erosion drone survey
  {
    label: "Coastal Survey",
    sublabel: "Drone · shoreline erosion",
    accent: "blue",
    content: {
      kind: "component",
      el: (
        <FieldCaptureMockup
          photoFile="field-coast.jpg"
          lat="43.2951" lon="5.3842"
          accuracy="25" speed="8"
          label="SHORELINE — EROSION MONITORING"
          sublabel="drone altitude: 150ft  ·  coastal patrol"
          session="11_084412" mode="AUTO" photos={88}
          perspective="DRONE"
        />
      ),
    },
  },
  // 12. Route map
  {
    label: "Route Map",
    sublabel: "Live GPS · session track",
    accent: "teal",
    content: {
      kind: "image",
      src: "screenshots/map-wide.jpg",
      alt: "Geospector — GPS route map with session data",
    },
  },
  // 13. Settings
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
        {/* Status bar / dynamic island */}
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
        .phones-running { animation: scroll-phones 70s linear infinite; }
        .phones-paused  { animation: scroll-phones 70s linear infinite; animation-play-state: paused; }
      `}</style>

      <div className="container mx-auto px-4 mb-14 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary/90 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Every subject · every mount · every condition — GPS tagged
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Built for the field.
        </h2>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Roads, trees, benches, signs, trails, drains, wildlife — if it has a location, document it.
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
