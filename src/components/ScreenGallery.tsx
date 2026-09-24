import { useState } from "react";
import { SCENES, type Scene, type SceneAccent } from "@/components/captureScenes";

const ACCENT: Record<SceneAccent, { border: string; glow: string }> = {
  red:   { border: "#FF3B30", glow: "rgba(255,59,48,0.30)" },
  green: { border: "#00FF88", glow: "rgba(0,255,136,0.24)" },
  blue:  { border: "#0A84FF", glow: "rgba(10,132,255,0.28)" },
  amber: { border: "#FFB800", glow: "rgba(255,184,0,0.26)" },
};

interface CardProps extends Scene {
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
}

function PhoneCard({ label, sublabel, accent, el, hovered, onEnter, onLeave }: CardProps) {
  const { border, glow } = ACCENT[accent];
  return (
    <div
      className="flex flex-col items-center gap-3 shrink-0"
      style={{
        width: 170,
        transform: hovered ? "scale(1.5)" : "scale(1)",
        transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        zIndex: hovered ? 20 : 1,
        position: "relative",
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div
        className="w-full rounded-[1.9rem] bg-[#1c1c20] p-[5px]"
        style={{
          boxShadow: hovered
            ? `0 0 48px ${glow}, 0 20px 60px rgba(0,0,0,0.7), inset 0 0 0 1px ${border}66`
            : `0 0 0 1px ${border}22, inset 0 0 0 1px #2c2c32`,
          transition: "box-shadow 0.35s ease",
        }}
      >
        <div className="relative overflow-hidden rounded-[1.6rem] bg-black" style={{ aspectRatio: "402 / 874" }}>
          {el}
        </div>
      </div>

      <div className="text-center select-none">
        <p className="text-[11px] font-semibold tracking-wide" style={{ color: border }}>{label}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
}

export function ScreenGallery() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const doubled = [...SCENES, ...SCENES];

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
        <div className="inline-flex items-center gap-2 bg-gps/10 border border-gps/25 px-4 py-1.5 text-sm font-medium text-gps rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-gps animate-pulse" />
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
            padding: "64px 36px",
            width: "max-content",
          }}
        >
          {doubled.map((scene, i) => {
            const realIdx = i % SCENES.length;
            return (
              <PhoneCard
                key={i}
                {...scene}
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
