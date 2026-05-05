import { LogEntry } from '@/contexts/RecordingContext';

const SESSION_COLORS = [
  '#4FC3F7',
  '#81C784',
  '#FFB74D',
  '#F06292',
  '#CE93D8',
  '#80DEEA',
  '#A5D6A7',
  '#FFF176',
  '#FFAB40',
  '#EF9A9A',
  '#90CAF9',
  '#B0BEC5',
];

export interface MapShareOptions {
  mode: 'local' | 'cloud';
  embedPhotos?: Map<string, string>;
}

export function generateMapHtml(
  entries: LogEntry[],
  options: MapShareOptions
): string {
  const geoFeatures = entries
    .filter((e) => e.latitude !== 0 || e.longitude !== 0)
    .map((e) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [e.longitude, e.latitude],
      },
      properties: {
        filename: e.filename,
        timestamp: new Date(e.timestamp).toISOString(),
        session_id: e.sessionId,
        job_name: e.jobName ?? '',
        photo:
          options.mode === 'local'
            ? (options.embedPhotos?.get(e.filename) ?? null)
            : (e.supabaseUrl ?? null),
      },
    }));

  const sessions = [...new Set(entries.map((e) => e.sessionId))];

  const sessionColorMap: Record<string, string> = {};
  sessions.forEach((sid, i) => {
    sessionColorMap[sid] = SESSION_COLORS[i % SESSION_COLORS.length]!;
  });

  const sessionLabels: Record<string, string> = {};
  for (const e of entries) {
    if (!sessionLabels[e.sessionId]) {
      sessionLabels[e.sessionId] = e.jobName || e.sessionId.slice(0, 8);
    }
  }

  const geotaggedCount = geoFeatures.length;
  const photoCount = geoFeatures.filter((f) => f.properties.photo).length;
  const timestamps = entries.map((e) => e.timestamp).filter(Boolean);
  const dateRange =
    timestamps.length > 0
      ? `${new Date(Math.min(...timestamps)).toLocaleDateString()} – ${new Date(Math.max(...timestamps)).toLocaleDateString()}`
      : '';

  const geojson = JSON.stringify({ type: 'FeatureCollection', features: geoFeatures });
  const colors = JSON.stringify(sessionColorMap);
  const labels = JSON.stringify(sessionLabels);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Geospector Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #map { width: 100vw; height: 100vh; }
    #stats {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: rgba(13,17,23,0.88);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: #8b9198;
      font-size: 12px;
      padding: 8px 16px;
      display: flex;
      gap: 16px;
      align-items: center;
      z-index: 1000;
      border-top: 1px solid rgba(255,255,255,0.08);
      flex-wrap: wrap;
    }
    #stats strong { color: #e6edf3; font-weight: 600; }
    .brand { color: #4FC3F7; font-weight: 700; letter-spacing: 0.5px; }
    #legend {
      position: absolute; top: 12px; right: 12px;
      background: rgba(13,17,23,0.9);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 10px 14px;
      z-index: 1000;
      color: #e6edf3;
      font-size: 12px;
      max-width: 220px;
      max-height: 50vh;
      overflow-y: auto;
    }
    #legend h4 {
      font-size: 11px; color: #8b9198; letter-spacing: 0.8px;
      text-transform: uppercase; margin-bottom: 8px;
    }
    .legend-item {
      display: flex; align-items: center; gap: 8px; margin-bottom: 5px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .popup-photo {
      width: 200px; max-height: 150px; object-fit: cover;
      border-radius: 6px; display: block; margin-bottom: 8px;
    }
    .popup-ts { color: #888; font-size: 11px; margin-top: 4px; }
    .popup-job { font-weight: 600; font-size: 13px; color: #222; margin-bottom: 2px; }
    .popup-sid { color: #aaa; font-size: 10px; font-family: monospace; margin-top: 2px; }
    .leaflet-popup-content-wrapper { border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .leaflet-popup-content { margin: 10px 12px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="legend"><h4>Sessions</h4></div>
  <div id="stats">
    <span class="brand">GEOSPECTOR</span>
    <span><strong>${geotaggedCount}</strong> geotagged points</span>
    <span><strong>${photoCount}</strong> photos</span>
    ${dateRange ? `<span>${dateRange}</span>` : ''}
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.min.js" crossorigin=""></script>
  <script>
    var DATA = ${geojson};
    var COLORS = ${colors};
    var LABELS = ${labels};

    var map = L.map('map', { preferCanvas: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var legend = document.getElementById('legend');
    var addedSessions = {};
    var bounds = [];

    DATA.features.forEach(function(f) {
      var c = f.geometry.coordinates;
      var p = f.properties;
      var color = COLORS[p.session_id] || '#4FC3F7';
      var ll = [c[1], c[0]];
      bounds.push(ll);

      var marker = L.circleMarker(ll, {
        radius: 6,
        color: color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 1.5,
        opacity: 0.9
      }).addTo(map);

      var html = '';
      if (p.photo) {
        html += '<img class="popup-photo" src="' + p.photo + '" loading="lazy" />';
      }
      if (p.job_name) {
        html += '<div class="popup-job">' + p.job_name + '</div>';
      }
      html += '<div class="popup-ts">' + new Date(p.timestamp).toLocaleString() + '</div>';
      html += '<div class="popup-sid">' + p.session_id.slice(0, 12) + '&hellip;</div>';
      marker.bindPopup(html, { maxWidth: 240 });

      if (!addedSessions[p.session_id]) {
        addedSessions[p.session_id] = true;
        var item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML =
          '<div class="legend-dot" style="background:' + color + '"></div>' +
          '<span style="overflow:hidden;text-overflow:ellipsis">' +
          (LABELS[p.session_id] || p.session_id.slice(0, 8)) + '</span>';
        legend.appendChild(item);
      }
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 60] });
    } else {
      map.setView([0, 0], 2);
    }
  </script>
</body>
</html>`;
}
