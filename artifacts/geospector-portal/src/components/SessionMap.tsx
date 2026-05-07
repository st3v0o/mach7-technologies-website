import { useEffect, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  useMap,
  LayersControl,
  ScaleControl,
} from "react-leaflet";
import type { PortalFrame } from "@workspace/api-client-react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

export interface SessionMapProps {
  routeGeojson?: { [key: string]: unknown } | null;
  frames: PortalFrame[];
  selectedFrameId?: number;
  onMarkerClick: (frame: PortalFrame) => void;
  sessionTitle?: string | null;
  showRoute?: boolean;
  fitBoundsTrigger?: number;
}

const OSM_TILE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const SAT_TILE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SAT_ATTR = "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

const TERRAIN_TILE = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
const TERRAIN_ATTR = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)';

function extractLineStringCoords(geojson: { [key: string]: unknown } | null | undefined): [number, number][] {
  if (!geojson) return [];
  if (geojson.type !== "LineString") return [];
  const coords = geojson.coordinates as Array<[number, number]> | undefined;
  if (!Array.isArray(coords)) return [];
  return coords.map(([lon, lat]) => [lat, lon] as [number, number]);
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function escHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function safeImgSrc(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol === "https:" || u.protocol === "http:") return escHtml(url);
  } catch {}
  return null;
}

function makePopupHtml(frame: PortalFrame, sessionTitle?: string | null): string {
  const imgSrc = frame.imageUrl ? safeImgSrc(frame.imageUrl) : null;
  const img = imgSrc
    ? `<img src="${imgSrc}" alt="${escHtml(`Frame ${frame.frameIndex}`)}" style="width:100%;max-height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px;display:block" />`
    : "";
  const title = sessionTitle
    ? `<div style="font-weight:700;color:#6d28d9;font-size:10px;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">${escHtml(sessionTitle)}</div>`
    : "";
  const lat = frame.latitude.toFixed(5);
  const lon = frame.longitude.toFixed(5);
  const ts = escHtml(formatTimestamp(frame.capturedAt));
  const speed = frame.speedMph != null
    ? `<div style="display:flex;align-items:center;gap:4px;color:#374151"><span>🚗</span><span>${escHtml(frame.speedMph.toFixed(1))} mph</span></div>`
    : "";
  const heading = frame.heading != null
    ? `<div style="display:flex;align-items:center;gap:4px;color:#374151"><span>🧭</span><span>${escHtml(frame.heading.toFixed(0))}°</span></div>`
    : "";
  return `
    <div style="font-size:12px;min-width:170px;font-family:system-ui,sans-serif;line-height:1.4">
      ${img}
      ${title}
      <div style="font-weight:700;font-size:13px;margin-bottom:2px;color:#111">Frame #${frame.frameIndex}</div>
      <div style="color:#6b7280;margin-bottom:6px">${ts}</div>
      <div style="display:flex;align-items:center;gap:4px;color:#374151;margin-bottom:2px">
        <span>📍</span>
        <span style="font-family:monospace;font-size:11px">${lat}, ${lon}</span>
      </div>
      ${speed}
      ${heading}
    </div>`;
}

function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => { map.invalidateSize(); }, 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

const FULLSCREEN_SVG_EXPAND = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
const FULLSCREEN_SVG_SHRINK = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>`;

function FullscreenControl() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let btn: HTMLButtonElement | null = null;

    function updateIcon() {
      if (!btn) return;
      const isFs = !!document.fullscreenElement;
      btn.title = isFs ? "Exit fullscreen" : "Enter fullscreen";
      btn.innerHTML = isFs ? FULLSCREEN_SVG_SHRINK : FULLSCREEN_SVG_EXPAND;
    }

    const ControlClass = L.Control.extend({
      options: { position: "topleft" as L.ControlPosition },
      onAdd() {
        const wrapper = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        const anchor = L.DomUtil.create("a", "", wrapper) as HTMLAnchorElement;
        btn = anchor as unknown as HTMLButtonElement;
        anchor.role = "button";
        anchor.href = "#";
        anchor.style.cssText =
          "width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#333;text-decoration:none;";
        updateIcon();

        L.DomEvent.on(btn, "click", (e) => {
          L.DomEvent.preventDefault(e);
          if (!document.fullscreenElement) {
            container.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        });

        document.addEventListener("fullscreenchange", updateIcon);
        return wrapper;
      },
      onRemove() {
        document.removeEventListener("fullscreenchange", updateIcon);
        btn = null;
      },
    });

    const ctrl = new ControlClass();
    ctrl.addTo(map);

    return () => { ctrl.remove(); };
  }, [map]);

  return null;
}

function FitBounds({ positions, trigger }: { positions: [number, number][]; trigger?: number }) {
  const map = useMap();
  const prevTrigger = useRef<number | undefined>(undefined);
  const initialFit = useRef(false);

  useEffect(() => {
    if (positions.length < 2) return;
    if (!initialFit.current) {
      try {
        map.fitBounds(positions as L.LatLngBoundsExpression, { padding: [48, 48], maxZoom: 17 });
        initialFit.current = true;
      } catch {}
    }
  }, [map, positions]);

  useEffect(() => {
    if (trigger == null || trigger === prevTrigger.current) return;
    prevTrigger.current = trigger;
    if (positions.length < 2) return;
    try {
      map.fitBounds(positions as L.LatLngBoundsExpression, { padding: [48, 48], maxZoom: 17, animate: true });
    } catch {}
  }, [trigger, map, positions]);

  return null;
}

function ClusteredMarkers({
  frames,
  selectedFrameId,
  onMarkerClick,
  sessionTitle,
}: {
  frames: PortalFrame[];
  selectedFrameId?: number;
  onMarkerClick: (frame: PortalFrame) => void;
  sessionTitle?: string | null;
}) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerMap = useRef<Map<number, L.Marker>>(new Map());
  const prevSelectedId = useRef<number | undefined>(undefined);
  const onClickRef = useRef(onMarkerClick);

  useEffect(() => { onClickRef.current = onMarkerClick; }, [onMarkerClick]);

  useEffect(() => {
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
    }

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 18,
      chunkedLoading: true,
      iconCreateFunction(c) {
        const n = c.getChildCount();
        const size = n < 10 ? 34 : n < 100 ? 40 : 46;
        return L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,#6d28d9,#3b82f6);color:#fff;font-weight:700;font-size:${n < 10 ? 13 : 12}px;display:flex;align-items:center;justify-content:center;border:2.5px solid rgba(255,255,255,0.85);box-shadow:0 2px 8px rgba(0,0,0,0.28)">${n}</div>`,
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    clusterRef.current = cluster;
    markerMap.current.clear();

    const icon = L.divIcon({
      html: `<div style="width:10px;height:10px;border-radius:50%;background:#6d28d9;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
      className: "",
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });

    frames.forEach((frame) => {
      const marker = L.marker([frame.latitude, frame.longitude], { icon });
      marker.bindPopup(makePopupHtml(frame, sessionTitle), {
        maxWidth: 260,
        className: "geospector-popup",
      });
      marker.on("click", () => onClickRef.current(frame));
      markerMap.current.set(frame.id, marker);
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
      markerMap.current.clear();
    };
  }, [map, frames, sessionTitle]);

  useEffect(() => {
    if (selectedFrameId == null || selectedFrameId === prevSelectedId.current) return;
    prevSelectedId.current = selectedFrameId;
    const marker = markerMap.current.get(selectedFrameId);
    if (!marker || !clusterRef.current) return;
    clusterRef.current.zoomToShowLayer(marker, () => {
      setTimeout(() => marker.openPopup(), 150);
    });
  }, [selectedFrameId]);

  return null;
}

export default function SessionMap({
  routeGeojson,
  frames,
  selectedFrameId,
  onMarkerClick,
  sessionTitle,
  showRoute = true,
  fitBoundsTrigger,
}: SessionMapProps) {
  const linePositions = extractLineStringCoords(routeGeojson);

  const allPositions: [number, number][] =
    linePositions.length > 0
      ? linePositions
      : frames.map((f) => [f.latitude, f.longitude]);

  const center: [number, number] = allPositions[0] ?? [37.3387, -121.8853];
  const onMarkerClickStable = useCallback(onMarkerClick, [onMarkerClick]);

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
    >
      <MapInvalidator />
      <FullscreenControl />

      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Street">
          <TileLayer url={OSM_TILE} attribution={OSM_ATTR} maxZoom={19} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer url={SAT_TILE} attribution={SAT_ATTR} maxZoom={18} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Terrain">
          <TileLayer url={TERRAIN_TILE} attribution={TERRAIN_ATTR} maxZoom={17} />
        </LayersControl.BaseLayer>
      </LayersControl>

      <ScaleControl position="bottomleft" imperial metric />

      {allPositions.length >= 2 && (
        <FitBounds positions={allPositions} trigger={fitBoundsTrigger} />
      )}

      {showRoute && linePositions.length >= 2 && (
        <Polyline
          positions={linePositions as L.LatLngExpression[]}
          pathOptions={{
            color: "#6d28d9",
            weight: 4,
            opacity: 0.9,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      )}

      <ClusteredMarkers
        frames={frames}
        selectedFrameId={selectedFrameId}
        onMarkerClick={onMarkerClickStable}
        sessionTitle={sessionTitle}
      />
    </MapContainer>
  );
}
