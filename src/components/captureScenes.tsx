import type { ComponentProps, ReactElement } from "react";
import { FieldCaptureMockup } from "@/components/FieldCaptureMockup";
import { SettingsMockup } from "@/components/SettingsMockup";

export type SceneAccent = "red" | "green" | "blue" | "amber";

export interface Scene {
  label: string;
  sublabel: string;
  accent: SceneAccent;
  el: ReactElement;
}

type Capture = ComponentProps<typeof FieldCaptureMockup>;

const capture = (label: string, sublabel: string, accent: SceneAccent, props: Capture): Scene => ({
  label, sublabel, accent, el: <FieldCaptureMockup {...props} />,
});

export const SCENES: Scene[] = [
  capture("Road Survey", "Video · by distance · 35 mph", "red", {
    photoFile: "field-road.jpg", alt: "Highway surface condition survey",
    lat: 38.72731, lon: -109.59252, altitudeFt: 4180, speedMph: 35,
    jobName: "Highway Surface Condition", mode: "video", count: 1204, session: "S-0922-141033",
    rate: "~2.4 fps", recording: true, estimatedMB: 412, segmentProgress: 0.62,
  }),
  capture("Sidewalk Crack", "Manual · GPX route", "amber", {
    photoFile: "field-pavement.jpg", alt: "Cracked sidewalk ADA compliance survey",
    lat: 41.87812, lon: -87.62980, altitudeFt: 594,
    jobName: "ADA Sidewalk Survey", mode: "manual", count: 14, session: "S-0918-083017",
    rate: "1 fps", gpxTracking: true,
  }),
  capture("Parking Lot Survey", "Auto Photo · marking audit", "blue", {
    photoFile: "field-aerial.jpg", alt: "Top-down parking lot pavement marking audit",
    lat: 40.71280, lon: -74.00601, altitudeFt: 92,
    jobName: "Parking Lot Marking Audit", mode: "photo", count: 41, session: "S-0915-091544",
    rate: "1/2s", recording: true,
  }),
  capture("Street Tree", "Manual · canopy inventory", "green", {
    photoFile: "field-tree.jpg", alt: "Street tree canopy inventory",
    lat: 34.05223, lon: -118.24368, altitudeFt: 305,
    jobName: "Street Tree Inventory", mode: "manual", count: 3, session: "S-0916-101200",
    rate: "1 fps", gpxTracking: true, upload: "done",
  }),
  capture("Park Bench", "Manual · asset audit", "amber", {
    photoFile: "field-bench.jpg", alt: "Weathered park bench asset audit",
    lat: 40.78306, lon: -73.97125, altitudeFt: 131,
    jobName: "Parks Asset Audit", mode: "manual", count: 2, session: "S-0914-152244",
    rate: "1 fps",
  }),
  capture("Wildlife Obs.", "Manual · 4× zoom", "green", {
    photoFile: "field-birds.jpg", alt: "Kingfisher species sighting",
    lat: 25.76168, lon: -80.19179, altitudeFt: 7,
    jobName: "Riparian Habitat Survey", mode: "manual", count: 7, session: "S-0919-064910",
    rate: "1 fps", zoom: 2, gpxTracking: true,
  }),
  capture("Trail Condition", "Auto Photo · walking", "green", {
    photoFile: "field-trail.jpg", alt: "Paved multi-use trail surface audit",
    lat: 47.60621, lon: -122.33207, altitudeFt: 187, speedMph: 3,
    jobName: "Trail Surface Audit", mode: "photo", count: 118, session: "S-0920-073318",
    rate: "~0.9 fps", recording: true,
  }),
  capture("Stormwater Outfall", "Manual · drainage inspection", "blue", {
    photoFile: "field-drain.jpg", alt: "Stormwater outfall drainage inspection",
    lat: 36.77826, lon: -119.41793, altitudeFt: 308,
    jobName: "MS4 Outfall Inspection", mode: "manual", count: 5, session: "S-0917-093020",
    rate: "1 fps", upload: { uploading: 3 },
  }),
  capture("Sign Vandalism", "Manual · condition report", "red", {
    photoFile: "field-sign.jpg", alt: "Vandalized sign box condition report",
    lat: 33.44838, lon: -112.07404, altitudeFt: 1086,
    jobName: "Asset Condition — Zone 3", mode: "manual", count: 1, session: "S-0921-111502",
    rate: "1 fps",
  }),
  capture("Coastal Survey", "Auto Photo · shoreline", "blue", {
    photoFile: "field-coast.jpg", alt: "Shoreline erosion survey from above",
    lat: 43.29510, lon: 5.38420, altitudeFt: 150, speedMph: 8,
    jobName: "Shoreline Erosion Survey", mode: "photo", count: 88, session: "S-0923-084412",
    rate: "~1.3 fps", recording: true,
  }),
  { label: "Settings", sublabel: "Capture mode · quality", accent: "red", el: <SettingsMockup /> },
];
