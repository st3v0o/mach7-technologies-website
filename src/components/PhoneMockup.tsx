import { useState, useEffect } from "react";
import { SettingsMockup } from "@/components/SettingsMockup";
import { FieldCaptureMockup } from "@/components/FieldCaptureMockup";

const BASE = import.meta.env.BASE_URL;

type Slide =
  | { kind: "image"; src: string; alt: string }
  | { kind: "component"; el: React.ReactElement; alt: string };

const SLIDES: Slide[] = [
  {
    kind: "image",
    src: `${BASE}screenshots/capture-manual.png`,
    alt: "Geospector — manual GPS capture mode",
  },
  {
    kind: "component",
    alt: "City tree condition survey",
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
  {
    kind: "component",
    alt: "Reef monitoring survey",
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
  {
    kind: "image",
    src: `${BASE}screenshots/map-wide.jpg`,
    alt: "Geospector — GPS route map with session data",
  },
  {
    kind: "component",
    alt: "Bird count transect walk",
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
  {
    kind: "component",
    alt: "Geospector settings panel",
    el: <SettingsMockup screenOnly />,
  },
];

export function PhoneMockup() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-4 select-none">
      {/* Phone shell */}
      <div className="relative w-full">
        <div
          className="relative rounded-[2.75rem] overflow-hidden bg-[#0e0e0e] border-[3px] border-[#2a2a2a]"
          style={{
            boxShadow:
              "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px #1a1a1a, 0 0 60px rgba(255,85,0,0.07)",
          }}
        >
          {/* Status bar area — dynamic island sits inside this black strip */}
          <div className="relative bg-black flex justify-center items-center" style={{ height: 48 }}>
            {/* Dynamic island pill */}
            <div className="w-[96px] h-[30px] rounded-full bg-[#111]" />
          </div>

          {/* Screen — starts cleanly below the dynamic island */}
          <div
            className="relative overflow-hidden"
            style={{ aspectRatio: "9 / 18" }}
          >
            {SLIDES.map((slide, i) => (
              <div
                key={i}
                className="absolute inset-0 w-full h-full"
                style={{
                  opacity: i === current ? 1 : 0,
                  transition: "opacity 1s ease-in-out",
                }}
              >
                {slide.kind === "image" ? (
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full bg-[#0a0a0a]">
                    {slide.el}
                  </div>
                )}
              </div>
            ))}

            {/* Subtle top glare */}
            <div
              className="absolute inset-x-0 top-0 h-16 pointer-events-none z-10"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0.03) 0%, transparent 100%)",
              }}
            />
          </div>

          {/* Home indicator */}
          <div className="h-6 bg-[#0e0e0e] flex items-center justify-center">
            <div className="w-16 h-[3px] rounded-full bg-[#2a2a2a]" />
          </div>

          {/* Left side buttons */}
          <div className="absolute left-[-3px] top-[28%] w-[3px] h-7 rounded-l bg-[#2a2a2a]" />
          <div className="absolute left-[-3px] top-[37%] w-[3px] h-10 rounded-l bg-[#2a2a2a]" />
          <div className="absolute left-[-3px] top-[50%] w-[3px] h-10 rounded-l bg-[#2a2a2a]" />

          {/* Right side button */}
          <div className="absolute right-[-3px] top-[35%] w-[3px] h-14 rounded-r bg-[#2a2a2a]" />

          {/* Accent border glow */}
          <div
            className="absolute inset-0 rounded-[2.75rem] pointer-events-none"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,85,0,0.10)" }}
          />
        </div>
      </div>

      {/* Slide indicator dots */}
      <div className="flex items-center justify-center gap-2">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-500"
            style={{
              width: i === current ? 20 : 6,
              height: 4,
              backgroundColor:
                i === current ? "hsl(var(--primary))" : "#2a2a2a",
            }}
          />
        ))}
      </div>
    </div>
  );
}
