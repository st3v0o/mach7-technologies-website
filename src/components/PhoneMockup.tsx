import { useState, useEffect } from "react";
import { SettingsMockup } from "@/components/SettingsMockup";
import { FieldCaptureMockup } from "@/components/FieldCaptureMockup";

type Slide = { kind: "component"; el: React.ReactElement; alt: string };

const SLIDES: Slide[] = [
  {
    kind: "component",
    alt: "Drone top-down parking lot survey",
    el: (
      <FieldCaptureMockup
        photoFile="field-aerial.jpg"
        lat="40.7128" lon="74.0060"
        accuracy="18" speed="0"
        label="PARKING LOT — PAVEMENT MARKING AUDIT"
        sublabel="drone altitude: 80ft"
        session="7_091544" mode="AUTO" photos={41}
        perspective="DRONE"
      />
    ),
  },
  {
    kind: "component",
    alt: "Car-mounted highway condition survey",
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
  {
    kind: "component",
    alt: "Cracked sidewalk ADA compliance survey",
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
  {
    kind: "component",
    alt: "Street tree canopy inventory",
    el: (
      <FieldCaptureMockup
        photoFile="field-tree.jpg"
        lat="34.0522" lon="118.2437"
        accuracy="14"
        label="STREET TREE — CANOPY CONDITION"
        sublabel="urban forestry inventory · block 12"
        session="3_101200" mode="MANUAL" photos={3}
        perspective="HANDHELD"
      />
    ),
  },
  {
    kind: "component",
    alt: "Weathered park bench asset audit",
    el: (
      <FieldCaptureMockup
        photoFile="field-bench.jpg"
        lat="40.7831" lon="73.9712"
        accuracy="10"
        label="PARK BENCH — WOOD ROT / NEGLECT"
        sublabel="parks asset audit · deteriorated"
        session="5_152244" mode="MANUAL" photos={2}
        perspective="HANDHELD"
        condition="poor"
      />
    ),
  },
  {
    kind: "component",
    alt: "Wildlife kingfisher species sighting",
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
  {
    kind: "component",
    alt: "Paved trail surface condition audit",
    el: (
      <FieldCaptureMockup
        photoFile="field-trail.jpg"
        lat="47.6062" lon="122.3321"
        accuracy="12"
        label="MULTI-USE TRAIL — SURFACE AUDIT"
        sublabel="parks trail survey · segment 4"
        session="4_073318" mode="MANUAL" photos={11}
        perspective="HANDHELD"
      />
    ),
  },
  {
    kind: "component",
    alt: "Stormwater outfall drainage inspection",
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
  {
    kind: "component",
    alt: "Vandalized sign box graffiti report",
    el: (
      <FieldCaptureMockup
        photoFile="field-sign.jpg"
        lat="33.4484" lon="112.0740"
        accuracy="13"
        label="SIGN BOX — GRAFFITI / VANDALISM"
        sublabel="asset condition report · zone 3"
        session="9_111502" mode="MANUAL" photos={1}
        perspective="HANDHELD"
        condition="poor"
      />
    ),
  },
  {
    kind: "component",
    alt: "Coastal drone shoreline erosion survey",
    el: (
      <FieldCaptureMockup
        photoFile="field-coast.jpg"
        lat="43.2951" lon="5.3842"
        accuracy="25" speed="8"
        label="SHORELINE — EROSION MONITORING"
        sublabel="drone altitude: 150ft · coastal patrol"
        session="11_084412" mode="AUTO" photos={88}
        perspective="DRONE"
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
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-4 select-none">
      <div className="relative w-full">
        <div
          className="relative rounded-[2.75rem] overflow-hidden bg-[#0e0e0e] border-[3px] border-[#2a2a2a]"
          style={{
            boxShadow:
              "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px #1a1a1a, 0 0 60px rgba(255,85,0,0.07)",
          }}
        >
          <div className="relative bg-black flex justify-center items-center" style={{ height: 48 }}>
            <div className="w-[96px] h-[30px] rounded-full bg-[#111]" />
          </div>

          <div
            className="relative overflow-hidden"
            style={{ aspectRatio: "9 / 18" }}
          >
            {SLIDES.map((slide, i) => (
              <div
                key={i}
                className="absolute inset-0 w-full h-full bg-[#0a0a0a]"
                style={{
                  opacity: i === current ? 1 : 0,
                  transition: "opacity 1s ease-in-out",
                }}
              >
                {slide.el}
              </div>
            ))}

            <div
              className="absolute inset-x-0 top-0 h-16 pointer-events-none z-10"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0.03) 0%, transparent 100%)",
              }}
            />
          </div>

          <div className="h-6 bg-[#0e0e0e] flex items-center justify-center">
            <div className="w-16 h-[3px] rounded-full bg-[#2a2a2a]" />
          </div>

          <div className="absolute left-[-3px] top-[28%] w-[3px] h-7 rounded-l bg-[#2a2a2a]" />
          <div className="absolute left-[-3px] top-[37%] w-[3px] h-10 rounded-l bg-[#2a2a2a]" />
          <div className="absolute left-[-3px] top-[50%] w-[3px] h-10 rounded-l bg-[#2a2a2a]" />
          <div className="absolute right-[-3px] top-[35%] w-[3px] h-14 rounded-r bg-[#2a2a2a]" />

          <div
            className="absolute inset-0 rounded-[2.75rem] pointer-events-none"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,85,0,0.10)" }}
          />
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-[200px]">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-500"
            style={{
              width: i === current ? 16 : 5,
              height: 3,
              backgroundColor:
                i === current ? "hsl(var(--primary))" : "#2a2a2a",
            }}
          />
        ))}
      </div>
    </div>
  );
}
