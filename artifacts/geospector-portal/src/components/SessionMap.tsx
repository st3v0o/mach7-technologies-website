import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import type { PortalFrame } from "@workspace/api-client-react";
import L from "leaflet";

interface SessionMapProps {
  routeGeojson?: { [key: string]: unknown } | null;
  frames: PortalFrame[];
  selectedFrameId?: number;
  onMarkerClick: (frame: PortalFrame) => void;
}

function extractLineStringCoords(geojson: { [key: string]: unknown } | null | undefined): [number, number][] {
  if (!geojson) return [];
  if (geojson.type !== "LineString") return [];
  const coords = geojson.coordinates as Array<[number, number]> | undefined;
  if (!Array.isArray(coords)) return [];
  return coords.map(([lon, lat]) => [lat, lon] as [number, number]);
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!fitted.current && positions.length >= 2) {
      try {
        map.fitBounds(positions as L.LatLngBoundsExpression, { padding: [40, 40] });
        fitted.current = true;
      } catch {
      }
    }
  }, [map, positions]);
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
}: {
  frames: PortalFrame[];
  selectedFrameId?: number;
  onMarkerClick: (frame: PortalFrame) => void;
}) {
  return (
    <>
      {frames.map((frame) => (
        <Marker
          key={frame.id}
          position={[frame.latitude, frame.longitude]}
          eventHandlers={{ click: () => onMarkerClick(frame) }}
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

export default function SessionMap({ routeGeojson, frames, selectedFrameId, onMarkerClick }: SessionMapProps) {
  const linePositions = extractLineStringCoords(routeGeojson);
  const center: [number, number] = linePositions[0] ?? [37.3387, -121.8853];

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {linePositions.length >= 2 && (
        <>
          <FitBounds positions={linePositions} />
          <Polyline
            positions={linePositions as L.LatLngExpression[]}
            pathOptions={{ color: "#3b82f6", weight: 4, opacity: 0.85 }}
          />
        </>
      )}

      <FrameMarkers
        frames={frames}
        selectedFrameId={selectedFrameId}
        onMarkerClick={onMarkerClick}
      />
    </MapContainer>
  );
}
