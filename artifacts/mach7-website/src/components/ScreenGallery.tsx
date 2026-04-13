import { SettingsMockup } from "@/components/SettingsMockup";

interface PhoneFrameProps {
  src?: string;
  alt?: string;
  children?: React.ReactNode;
  label: string;
  sublabel: string;
  accent?: "orange" | "green" | "blue";
  featured?: boolean;
}

function PhoneFrame({ src, alt, children, label, sublabel, accent = "orange", featured = false }: PhoneFrameProps) {
  const glowColor = {
    orange: "rgba(255,85,0,0.28)",
    green: "rgba(0,232,122,0.22)",
    blue: "rgba(0,112,243,0.22)",
  }[accent];

  const borderColor = {
    orange: "#ff5500",
    green: "#00e87a",
    blue: "#0070f3",
  }[accent];

  return (
    <div className={`flex flex-col items-center gap-4 group ${featured ? "scale-105" : ""}`}>
      <div
        className="relative w-full transition-transform duration-300 group-hover:-translate-y-2"
        style={{ filter: `drop-shadow(0 0 28px ${glowColor})` }}
      >
        {/* Phone shell */}
        <div
          className="relative mx-auto rounded-[2.75rem] overflow-hidden"
          style={{
            background: "#0e0e0e",
            border: `2px solid #2a2a2a`,
            boxShadow: `0 0 0 1px ${borderColor}22, inset 0 0 0 1px #1a1a1a`,
            maxWidth: "200px",
          }}
        >
          {/* Dynamic island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-20 h-6 rounded-full bg-black" />

          {/* Status bar spacer */}
          <div className="h-12 bg-black/80" />

          {/* Screen content */}
          <div
            className="relative overflow-hidden"
            style={{ aspectRatio: "9/18", background: "#0a0a0a" }}
          >
            {src ? (
              <img
                src={src}
                alt={alt}
                className="w-full h-full object-cover object-top"
                style={{ display: "block" }}
              />
            ) : (
              <div className="w-full h-full">{children}</div>
            )}
            {/* Subtle screen glare */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)",
              }}
            />
          </div>

          {/* Home indicator */}
          <div className="h-6 bg-[#0e0e0e] flex items-center justify-center">
            <div className="w-16 h-1 rounded-full bg-[#2a2a2a]" />
          </div>

          {/* Side buttons */}
          <div className="absolute left-[-3px] top-1/3 w-[3px] h-8 rounded-l bg-[#2a2a2a]" />
          <div className="absolute left-[-3px] w-[3px] h-10 rounded-l bg-[#2a2a2a]" style={{ top: "calc(33% + 44px)" }} />
          <div className="absolute left-[-3px] w-[3px] h-10 rounded-l bg-[#2a2a2a]" style={{ top: "calc(33% + 96px)" }} />
          <div className="absolute right-[-3px] w-[3px] h-14 rounded-r bg-[#2a2a2a]" style={{ top: "calc(33% + 24px)" }} />

          {/* Accent glow border overlay */}
          <div
            className="absolute inset-0 rounded-[2.75rem] pointer-events-none"
            style={{ boxShadow: `inset 0 0 0 1px ${borderColor}33` }}
          />
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="font-mono text-xs font-bold tracking-wider uppercase" style={{ color: borderColor }}>
          {label}
        </p>
        <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
}

export function ScreenGallery() {
  const base = import.meta.env.BASE_URL;
  return (
    <section id="screenshots" className="py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 border border-border/40 bg-card/40 px-3 py-1 text-xs font-mono text-muted-foreground uppercase tracking-wider mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Real screenshots · live app · no staging
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Built for the field.
          </h2>
          <p className="text-muted-foreground text-lg">
            Every screen purpose-built around one idea — don't let the tool get in the way of the work.
          </p>
        </div>

        {/* Row 1 — capture + both map views */}
        <div className="grid grid-cols-3 gap-6 md:gap-10 max-w-3xl mx-auto mb-10">
          <PhoneFrame
            src={`${base}screenshots/capture-manual.png`}
            alt="Capture screen in manual mode showing GPS lock and shutter control"
            label="Capture"
            sublabel="Manual mode · GPS locked"
            accent="green"
          />
          <PhoneFrame
            src={`${base}screenshots/map-wide.jpg`}
            alt="Wide GPS route map showing full session track with I-64 context"
            label="Route Map"
            sublabel="Live GPS track · multi-session"
            accent="blue"
            featured
          />
          <PhoneFrame
            src={`${base}screenshots/map-zoomed.jpg`}
            alt="Frame Log zoomed map showing 4 color-coded capture sessions with legend"
            label="Frame Log"
            sublabel="58 frames · 4 sessions mapped"
            accent="blue"
          />
        </div>

        {/* Row 2 — real field photos + settings */}
        <div className="grid grid-cols-3 gap-6 md:gap-10 max-w-3xl mx-auto">
          <PhoneFrame
            src={`${base}screenshots/photo-school.jpg`}
            alt="In-app photo viewer showing school zone scene with live GPS coordinate stamp"
            label="Field Shot"
            sublabel="School zone · GPS stamped"
            accent="orange"
          />
          <PhoneFrame
            src={`${base}screenshots/photo-yield.jpg`}
            alt="In-app photo viewer showing yield sign intersection with GPS overlay and session metadata"
            label="Photo Detail"
            sublabel="GPS overlay · session metadata"
            accent="orange"
            featured
          />
          <PhoneFrame
            label="Settings"
            sublabel="Interval · mode · cloud upload"
            accent="orange"
          >
            <SettingsMockup />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}
