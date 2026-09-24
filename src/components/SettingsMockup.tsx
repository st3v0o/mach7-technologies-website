import type { ReactNode } from "react";
import { Video, Camera, Aperture, Infinity as InfinityIcon, Info, Images } from "lucide-react";
import { APP, pt, AppScreen, StatusBar, TabBar } from "@/components/appScreen";

// Recreates the Geospector 1.0 Settings tab (app/(tabs)/settings.tsx), scrolled to the
// capture options, as seen in the App Store screenshot.

const MODES = [
  { title: "Video", desc: "More frames, less detail", Icon: Video },
  { title: "Auto Photo", desc: "Sharper photos, fewer frames", Icon: Camera },
  { title: "Manual", desc: "Full quality, on demand", Icon: Aperture, active: true },
];

export function SettingsMockup() {
  return (
    <AppScreen background={APP.background}>
      <StatusBar />
      <div className="absolute inset-x-0 flex flex-col" style={{ top: pt(62), padding: `0 ${pt(20)}`, gap: pt(22) }}>
        <div>
          <div style={{ fontSize: pt(28), fontWeight: 700 }}>Settings</div>
          <div style={{ fontSize: pt(14), color: APP.textSecondary, marginTop: pt(2) }}>Frame extraction configuration</div>
        </div>

        <Section title="ACTIVE JOB">
          <Card>
            <div style={{ padding: pt(14), display: "flex", flexDirection: "column", gap: pt(10) }}>
              <span style={{ fontSize: pt(13), color: APP.textSecondary, fontWeight: 500 }}>Job Name</span>
              <span
                style={{
                  fontSize: pt(16), padding: `${pt(12)} ${pt(14)}`, borderRadius: pt(10),
                  background: "rgba(255,255,255,0.06)", border: `${pt(1)} solid rgba(255,255,255,0.15)`,
                }}
              >
                Native Plant Inventory
              </span>
              <span style={{ fontSize: pt(11.5), color: APP.textTertiary, lineHeight: 1.4 }}>
                Sessions captured while this name is active are grouped under the same project. Visible in the camera HUD.
              </span>
            </div>
          </Card>
        </Section>

        <Section title="CAPTURE MODE">
          <div className="grid grid-cols-3" style={{ gap: pt(10) }}>
            {MODES.map(({ title, desc, Icon, active }) => (
              <div
                key={title}
                className="flex flex-col"
                style={{
                  padding: pt(14), gap: pt(4), borderRadius: pt(14), height: pt(128),
                  border: `${pt(1)} solid ${active ? APP.blue : APP.border}`,
                  background: active ? "rgba(10,132,255,0.10)" : APP.card,
                }}
              >
                <Icon stroke={active ? APP.blue : "rgba(255,255,255,0.75)"} strokeWidth={1.5} style={{ width: pt(22), height: pt(22), marginBottom: pt(12) }} />
                <span style={{ fontSize: pt(16), fontWeight: 500 }}>{title}</span>
                <span style={{ fontSize: pt(13), color: APP.textTertiary, lineHeight: 1.25 }}>{desc}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="IMAGE QUALITY">
          <Card>
            <div style={{ padding: pt(16) }}>
              <div className="flex" style={{ gap: pt(10) }}>
                {["Max", "High", "Standard"].map((q) => (
                  <span
                    key={q}
                    style={{
                      fontSize: pt(15), padding: `${pt(8)} ${pt(18)}`, borderRadius: pt(20),
                      border: `${pt(1)} solid ${q === "Max" ? APP.blue : APP.border}`,
                      background: q === "Max" ? "rgba(10,132,255,0.10)" : "rgba(255,255,255,0.06)",
                      color: q === "Max" ? APP.blue : "rgba(255,255,255,0.75)",
                    }}
                  >
                    {q}
                  </span>
                ))}
              </div>
              <div style={{ height: pt(1), background: APP.separator, margin: `${pt(14)} 0` }} />
              <div className="flex" style={{ gap: pt(10), fontSize: pt(13.5), color: APP.textSecondary, lineHeight: 1.35 }}>
                <Info stroke={APP.textSecondary} style={{ width: pt(15), height: pt(15), flexShrink: 0, marginTop: pt(2) }} />
                Applies to photos and video-extracted frames. Higher quality means larger files.
              </div>
            </div>
          </Card>
        </Section>

        <Section title="CAMERA">
          <Card>
            <Row Icon={InfinityIcon} title="Lock Focus at Infinity" desc="Prevents autofocus from locking onto the dashboard" on={false} />
          </Card>
        </Section>

        <Section title="LOCAL SAVE">
          <Card>
            <Row Icon={Images} title="Save Photos to Camera Roll" desc="Each captured photo is also saved to your Camera Roll" on blue />
          </Card>
        </Section>
      </div>
      <TabBar active="settings" />
    </AppScreen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col" style={{ gap: pt(10) }}>
      <span style={{ fontSize: pt(11), fontWeight: 600, letterSpacing: pt(1.2), color: APP.textTertiary }}>{title}</span>
      {children}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div style={{ borderRadius: pt(14), background: APP.card, border: `${pt(1)} solid ${APP.border}` }}>{children}</div>;
}

function Row({ Icon, title, desc, on, blue }: { Icon: typeof Info; title: string; desc: string; on: boolean; blue?: boolean }) {
  return (
    <div className="flex items-center" style={{ padding: pt(16), gap: pt(14) }}>
      <Icon stroke={blue ? APP.blue : "rgba(255,255,255,0.75)"} strokeWidth={1.5} style={{ width: pt(22), height: pt(22), flexShrink: 0 }} />
      <div className="flex-1 flex flex-col" style={{ gap: pt(3) }}>
        <span style={{ fontSize: pt(16), color: blue ? APP.blue : APP.text }}>{title}</span>
        <span style={{ fontSize: pt(13), color: APP.textSecondary, lineHeight: 1.3 }}>{desc}</span>
      </div>
      <span
        className="relative rounded-full shrink-0"
        style={{ width: pt(51), height: pt(31), background: on ? APP.blue : "rgba(120,120,128,0.32)" }}
      >
        <span
          className="absolute rounded-full"
          style={{ top: pt(2), left: on ? pt(22) : pt(2), width: pt(27), height: pt(27), background: on ? "#fff" : "rgba(255,255,255,0.45)" }}
        />
      </span>
    </div>
  );
}
