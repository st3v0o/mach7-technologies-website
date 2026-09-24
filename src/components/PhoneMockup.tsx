import { useState, useEffect } from "react";
import { SCENES } from "@/components/captureScenes";

export function PhoneMockup() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % SCENES.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-5 select-none">
      <div
        className="relative w-full rounded-[3rem] bg-[#1c1c20] p-[10px]"
        style={{
          boxShadow:
            "0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px #2c2c32, inset 0 0 0 1px #3a3a42, 0 0 80px rgba(255,59,48,0.08)",
        }}
      >
        <div className="relative overflow-hidden rounded-[2.4rem] bg-black" style={{ aspectRatio: "402 / 874" }}>
          {SCENES.map((scene, i) => (
            <div
              key={scene.label}
              className="absolute inset-0"
              style={{ opacity: i === current ? 1 : 0, transition: "opacity 1s ease-in-out" }}
              aria-hidden={i !== current}
            >
              {scene.el}
            </div>
          ))}
        </div>

        <div className="absolute left-[-3px] top-[20%] w-[3px] h-8 rounded-l bg-[#2c2c32]" />
        <div className="absolute left-[-3px] top-[29%] w-[3px] h-12 rounded-l bg-[#2c2c32]" />
        <div className="absolute left-[-3px] top-[38%] w-[3px] h-12 rounded-l bg-[#2c2c32]" />
        <div className="absolute right-[-3px] top-[30%] w-[3px] h-16 rounded-r bg-[#2c2c32]" />
      </div>

      <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-[220px]">
        {SCENES.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-500"
            style={{
              width: i === current ? 16 : 5,
              height: 3,
              backgroundColor: i === current ? "hsl(var(--primary))" : "hsl(var(--border))",
            }}
          />
        ))}
      </div>
    </div>
  );
}
