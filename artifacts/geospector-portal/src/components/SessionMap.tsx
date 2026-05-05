import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import type { PortalFrame } from "@workspace/api-client-react";
import L from "leaflet";

export interface SessionMapProps {
  routeGeojson?: { [key: string]: unknown } | null;
  frames: PortalFrame[];
  selectedFrameId?: number;
  onMarkerClick: (frame: PortalFrame) => void;
  sessionTitle?: string | null;
  showRoute?: boolean;
  tileLayer?: "osm" | "satellite";
  fitBoundsTrigger?: number;
}

function extractLineStringCoords(geojson: { [key: string]: unknown } | null | undefined): [number, number][] {
  if (!geojson) return [];
  if (geojson.type !== "LineString") return [];
  const coords = geojson.coordinates as Array<[number, number]> | undefined;
  if (!Array.isArray(coords)) return [];
  return coords.map(([lon, lat]) => [lat, lon] as [number, number]);
}

function FitBounds({ positions, trigger }: { positions: [number, number][]; trigger?: number }) {
  const map = useMap();
  const prevTrigger = useRef<number | undefined>(undefined);
  const initialFit = useRef(false);

  useEffect(() => {
    if (positions.length < 2) return;
    if (!initialFit.current) {
      try {
        map.fitBounds(positions as L.LatLngBoundsExpression, { padding: [40, 40] });
        initialFit.current = true;
      } catch {}
    }
  }, [map, positions]);

  useEffect(() => {
    if (trigger == null || trigger === prevTrigger.current) return;
    prevTrigger.current = trigger;
    if (positions.length < 2) return;
    try {
      map.fitBounds(positions as L.LatLngBoundsExpression, { padding: [40, 40], animate: true });
    } catch {}
  }, [trigger, map, positions]);

  return null;
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function FrameMarkers({
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
  const markerRefs = useRef<Map<number, L.Marker>>(new Map());
  const prevSelectedId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (selectedFrameId == null || selectedFrameId === prevSelectedId.current) return;
    prevSelectedId.current = selectedFrameId;

    const marker = markerRefs.current.get(selectedFrameId);
    if (!marker) return;

    const latlng = marker.getLatLng();
    map.panTo(latlng, { animate: true });
    setTimeout(() => {
      marker.openPopup();
    }, 300);
  }, [selectedFrameId, map]);

  return (
    <>
      {frames.map((frame) => (
        <Marker
          key={frame.id}
          position={[frame.latitude, frame.longitude]}
          eventHandlers={{ click: () => onMarkerClick(frame) }}
          ref={(ref) => {
            if (ref) {
              markerRefs.current.set(frame.id, ref);
            } else {
              markerRefs.current.delete(frame.id);
            }
          }}
        >
          <Popup maxWidth={220} autoPan={false}>
            <div style={{ fontSize: 12 }}>
              {frame.imageUrl && (
                <img
                  src={frame.imageUrl}
                  alt={`Frame ${frame.frameIndex}`}
                  style={{ width: "100%", maxHeight: 110, objectFit: "cover", borderRadius: 4, marginBottom: 6 }}
                />
              )}
              {sessionTitle && (
                <div style={{ fontWeight: 600, color: "#3b82f6", marginBottom: 4, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{sessionTitle}</div>
              )}
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Frame #{frame.frameIndex}</div>
              <div style={{ color: "#666" }}>{formatTimestamp(frame.capturedAt)}</div>
              <div>📍 {frame.latitude.toFixed(5)}, {frame.longitude.toFixed(5)}</div>
              {frame.speedMph != null && <div>🚗 {frame.speedMph.toFixed(1)} mph</div>}
              {frame.heading != null && <div>🧭 {frame.heading.toFixed(0)}°</div>}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

const OSM_TILE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const SAT_TILE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SAT_ATTR = "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

export default function SessionMap({
  routeGeojson,
  frames,
  selectedFrameId,
  onMarkerClick,
  sessionTitle,
  showRoute = true,
  tileLayer = "osm",
  fitBoundsTrigger,
}: SessionMapProps) {
  const linePositions = extractLineStringCoords(routeGeojson);
  const center: [number, number] = linePositions[0] ?? [37.3387, -121.8853];

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ height: "100%", width: "100%" }}
    >
      {tileLayer === "satellite" ? (
        <TileLayer url={SAT_TILE} attribution={SAT_ATTR} maxZoom={18} />
      ) : (
        <TileLayer url={OSM_TILE} attribution={OSM_ATTR} />
      )}

      {linePositions.length >= 2 && (
        <FitBounds positions={linePositions} trigger={fitBoundsTrigger} />
      )}

      {showRoute && linePositions.length >= 2 && (
        <Polyline
          positions={linePositions as L.LatLngExpression[]}
          pathOptions={{ color: "#3b82f6", weight: 4, opacity: 0.85 }}
        />
      )}

      <FrameMarkers
        frames={frames}
        selectedFrameId={selectedFrameId}
        onMarkerClick={onMarkerClick}
        sessionTitle={sessionTitle}
      />
    </MapContainer>
  );
}
