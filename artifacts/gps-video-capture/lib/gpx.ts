/**
 * GPX 1.1 builder.
 *
 * Each element of `segments` becomes a separate <trkseg> inside a single
 * <trk>.  This is the standard GPX representation of a paused track: GPS
 * viewers draw a line within each segment and show a gap between them.
 *
 * Callers that have a single flat array of points should pass [[...points]].
 */

interface GpxPoint {
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  altitude?: number | null;
}

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTrkSeg(points: GpxPoint[]): string {
  const trkpts = points
    .map((p) => {
      const time = new Date(p.timestamp).toISOString();
      const altEl =
        p.altitude != null
          ? `\n        <ele>${p.altitude.toFixed(2)}</ele>`
          : '';
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
        `        <time>${time}</time>${altEl}${speedEl}${hdopEl}\n` +
        `      </trkpt>`
      );
    })
    .join('\n');

  return `    <trkseg>\n${trkpts}\n    </trkseg>`;
}

export function buildGpxXml(
  sessionId: string,
  segments: GpxPoint[][],
  mode: 'video' | 'photo' | 'manual'
): string {
  const allPoints = segments.flat();
  const modeLabel = mode === 'video' ? 'Video' : mode === 'manual' ? 'Manual' : 'Photo';
  const humanName = xmlEscape(sessionId.replace('session_', '').replace(/_/g, ' '));
  const startTime =
    allPoints.length > 0
      ? new Date(allPoints[0].timestamp).toISOString()
      : new Date().toISOString();

  // Filter out empty segments — a pause right at the end might leave one.
  const nonEmpty = segments.filter((seg) => seg.length > 0);

  const trksegs = nonEmpty.map(buildTrkSeg).join('\n');

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
    (nonEmpty.length > 1
      ? `    <desc>Paused ${nonEmpty.length - 1} time(s) — ${nonEmpty.length} track segments</desc>\n`
      : '') +
    trksegs + '\n' +
    `  </trk>\n` +
    `</gpx>`
  );
}
