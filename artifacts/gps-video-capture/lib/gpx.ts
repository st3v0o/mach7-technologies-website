/**
 * GPX 1.1 builder.
 *
 * Each element of `segments` becomes a separate <trk> element.
 * Using distinct <trk> elements (rather than multiple <trkseg> inside one
 * <trk>) guarantees that every GPS viewer — including Apple Maps — treats
 * each recording interval as a fully independent track and never draws a
 * connecting line between them.
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

function buildTrkPts(points: GpxPoint[]): string {
  return points
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
}

function buildTrk(name: string, desc: string | null, points: GpxPoint[]): string {
  const descEl = desc ? `    <desc>${xmlEscape(desc)}</desc>\n` : '';
  return (
    `  <trk>\n` +
    `    <name>${xmlEscape(name)}</name>\n` +
    descEl +
    `    <trkseg>\n` +
    buildTrkPts(points) + '\n' +
    `    </trkseg>\n` +
    `  </trk>`
  );
}

export function buildGpxXml(
  sessionId: string,
  segments: GpxPoint[][],
  mode: 'video' | 'photo' | 'manual'
): string {
  const allPoints = segments.flat();
  const modeLabel = mode === 'video' ? 'Video' : mode === 'manual' ? 'Manual' : 'Photo';
  // Keep raw (unescaped) — buildTrk / xmlEscape calls at insertion points below
  // will escape exactly once.
  const humanName = sessionId.replace('session_', '').replace(/_/g, ' ');
  const startTime =
    allPoints.length > 0
      ? new Date(allPoints[0].timestamp).toISOString()
      : new Date().toISOString();

  // Drop empty segments (e.g. a pause right at the end of recording).
  const nonEmpty = segments.filter((seg) => seg.length > 0);
  const total = nonEmpty.length;

  // Each segment → its own <trk> so viewers never connect across the gap.
  // buildTrk calls xmlEscape(name) internally, so humanName is escaped once.
  const trkBlocks = nonEmpty
    .map((seg, i) => {
      const segName =
        total === 1
          ? `${modeLabel} — ${humanName}`
          : `${modeLabel} — ${humanName} — Segment ${i + 1} of ${total}`;
      const desc =
        total > 1 && i === 0
          ? `Session paused ${total - 1} time(s). This is segment ${i + 1} of ${total}.`
          : total > 1
            ? `Segment ${i + 1} of ${total}.`
            : null;
      return buildTrk(segName, desc, seg);
    })
    .join('\n');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1"\n` +
    `     creator="Geospector"\n` +
    `     xmlns="http://www.topografix.com/GPX/1/1"\n` +
    `     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n` +
    `     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n` +
    `  <metadata>\n` +
    `    <name>${xmlEscape(modeLabel)} Session — ${xmlEscape(humanName)}</name>\n` +
    `    <time>${startTime}</time>\n` +
    `  </metadata>\n` +
    trkBlocks + '\n' +
    `</gpx>`
  );
}
