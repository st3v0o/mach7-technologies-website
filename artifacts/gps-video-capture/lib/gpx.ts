import { GpsPoint } from '@/contexts/RecordingContext';

function xmlEscape(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildGpxXml(
  sessionId: string,
  points: GpsPoint[],
  mode: 'video' | 'photo' | 'manual'
): string {
  const modeLabel = mode === 'video' ? 'Video' : mode === 'manual' ? 'Manual' : 'Photo';
  const humanName = xmlEscape(
    sessionId.replace('session_', '').replace(/_/g, ' ')
  );
  const startTime =
    points.length > 0
      ? new Date(points[0].timestamp).toISOString()
      : new Date().toISOString();

  const trkpts = points
    .map((p) => {
      const time = new Date(p.timestamp).toISOString();
      const speedEl =
        p.speed != null && p.speed >= 0
          ? `\n        <speed>${p.speed.toFixed(4)}</speed>`
          : '';
      const hdopEl =
        p.accuracy != null
          ? `\n        <hdop>${(p.accuracy / 5).toFixed(2)}</hdop>`
          : '';
      return (
        `      <trkpt lat="${p.latitude.toFixed(8)}" lon="${p.longitude.toFixed(8)}">\n` +
        `        <time>${time}</time>${speedEl}${hdopEl}\n` +
        `      </trkpt>`
      );
    })
    .join('\n');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1"\n` +
    `     creator="GPS Video Capture"\n` +
    `     xmlns="http://www.topografix.com/GPX/1/1"\n` +
    `     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n` +
    `     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n` +
    `  <metadata>\n` +
    `    <name>${xmlEscape(modeLabel)} Session — ${humanName}</name>\n` +
    `    <time>${startTime}</time>\n` +
    `  </metadata>\n` +
    `  <trk>\n` +
    `    <name>${xmlEscape(modeLabel)} — ${xmlEscape(sessionId)}</name>\n` +
    `    <trkseg>\n` +
    trkpts +
    `\n    </trkseg>\n` +
    `  </trk>\n` +
    `</gpx>`
  );
}
