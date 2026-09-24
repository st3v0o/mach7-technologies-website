import type { ReactNode } from "react";
import { Video, List, SlidersHorizontal } from "lucide-react";

// Palette from constants/colors.ts in the Geospector app.
export const APP = {
  background: "#0A0A0F",
  card: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.12)",
  separator: "rgba(255,255,255,0.08)",
  text: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.55)",
  textTertiary: "rgba(255,255,255,0.30)",
  accent: "#FF3B30",
  accentDim: "rgba(255,59,48,0.18)",
  gpsGreen: "#00FF88",
  amber: "#FFB800",
  amberDim: "rgba(255,184,0,0.14)",
  blue: "#0A84FF",
  tabBarHeight: 83,
} as const;

/** iPhone points on a 402pt-wide screen, scaled to whatever width the mockup renders at. */
export const pt = (n: number) => `calc(${n} * 100cqw / 402)`;

const SYSTEM_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif";

/** A 402×874pt iPhone screen. Children lay out in points via pt(). */
export function AppScreen({ children, background = "#000" }: { children: ReactNode; background?: string }) {
  return (
    <div className="w-full h-full" style={{ containerType: "inline-size" }}>
      <div
        className="relative w-full h-full overflow-hidden select-none"
        style={{ background, fontFamily: "Inter, sans-serif", color: APP.text }}
      >
        {children}
        {/* Dynamic Island */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black"
          style={{ top: pt(11), width: pt(126), height: pt(37), zIndex: 30 }}
        />
      </div>
    </div>
  );
}

export function StatusBar({ time = "9:41" }: { time?: string }) {
  return (
    <div
      className="absolute inset-x-0 flex items-center justify-between"
      style={{ top: pt(18), padding: `0 ${pt(38)} 0 ${pt(48)}`, height: pt(24), zIndex: 20, fontFamily: SYSTEM_FONT }}
    >
      <span style={{ fontSize: pt(17), fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{time}</span>
      <span className="flex items-center" style={{ gap: pt(6) }}>
        <span className="flex items-end" style={{ gap: pt(1.5), height: pt(12) }}>
          {[4, 6.5, 9, 12].map((h) => (
            <span key={h} style={{ width: pt(3), height: pt(h), borderRadius: pt(1), background: "#fff" }} />
          ))}
        </span>
        <span style={{ fontSize: pt(15), fontWeight: 600 }}>5G</span>
        <span
          className="flex items-center justify-center"
          style={{ width: pt(27), height: pt(13), borderRadius: pt(4), background: "#fff", color: "#000", fontSize: pt(10), fontWeight: 700 }}
        >
          82
        </span>
      </span>
    </div>
  );
}

const TABS = [
  { key: "capture", label: "Capture", Icon: Video },
  { key: "log", label: "Log", Icon: List },
  { key: "settings", label: "Settings", Icon: SlidersHorizontal },
] as const;

export function TabBar({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex"
      style={{ height: pt(APP.tabBarHeight), background: APP.background, borderTop: `${pt(1)} solid ${APP.separator}`, zIndex: 10 }}
    >
      {TABS.map(({ key, label, Icon }) => {
        const color = key === active ? APP.accent : APP.textSecondary;
        return (
          <div key={key} className="flex-1 flex flex-col items-center" style={{ paddingTop: pt(8), gap: pt(3) }}>
            <Icon stroke={color} strokeWidth={1.6} style={{ width: pt(24), height: pt(24) }} />
            <span style={{ color, fontSize: pt(11), fontWeight: 600 }}>{label}</span>
          </div>
        );
      })}
      <span
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white"
        style={{ bottom: pt(8), width: pt(134), height: pt(5) }}
      />
    </div>
  );
}
