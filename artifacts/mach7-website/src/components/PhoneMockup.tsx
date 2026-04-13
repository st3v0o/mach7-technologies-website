import { useState, useEffect } from "react";

const BASE = import.meta.env.BASE_URL;

const SLIDES = [
  {
    src: `${BASE}screenshots/hero-capture.jpg`,
    alt: "MACH 7 app — live GPS recording mode",
  },
  {
    src: `${BASE}screenshots/hero-map.jpg`,
    alt: "MACH 7 app — GPS route map with session data",
  },
  {
    src: `${BASE}screenshots/hero-photo.jpg`,
    alt: "MACH 7 app — geotagged photo with coordinate overlay",
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
              "0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px #1a1a1a, 0 0 60px rgba(255,85,0,0.07)",
          }}
        >
          {/* Dynamic island */}
          <div className="absolute top-[14px] left-1/2 -translate-x-1/2 z-20 w-[96px] h-[30px] rounded-full bg-black" />

          {/* Screen — slides fill from top */}
          <div
            className="relative overflow-hidden"
            style={{ aspectRatio: "9 / 19.5" }}
          >
            {SLIDES.map((slide, i) => (
              <img
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                className="absolute inset-0 w-full h-full object-cover object-top"
                style={{
                  opacity: i === current ? 1 : 0,
                  transition: "opacity 1s ease-in-out",
                }}
              />
            ))}

            {/* Subtle top glare */}
            <div
              className="absolute inset-x-0 top-0 h-24 pointer-events-none z-10"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0.04) 0%, transparent 100%)",
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
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,85,0,0.12)" }}
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
