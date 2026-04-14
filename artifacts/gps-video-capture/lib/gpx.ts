import { GpsPoint } from '@/contexts/RecordingContext';

export function buildGpxXml(
  trackName: string,
  segments: GpsPoint[][],
  mode: 'video' | 'photo' | 'manual'
): string {
  const now = new Date().toISOString();
  const trackSegments = segments
    .filter((seg) => seg.length > 0)
    .map((seg) => {
      const points = seg
        .map((p) => {
          const time = new Date(p.timestamp).toISOString();
          const speedTag = p.speed != null ? `\n          <speed>${p.speed.toFixed(4)}</speed>` : '';
          const accTag = p.accuracy != null ? `\n          <hdop>${p.accuracy.toFixed(2)}</hdop>` : '';
          return `      <trkpt lat="${p.latitude.toFixed(7)}" lon="${p.longitude.toFixed(7)}">
        <time>${time}</time>${accTag}${speedTag}
      </trkpt>`;
        })
        .join('\n');
      return `    <trkseg>\n${points}\n    </trkseg>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Geospector"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${trackName}</name>
    <time>${now}</time>
    <desc>Recorded with Geospector — mode: ${mode}</desc>
  </metadata>
  <trk>
    <name>${trackName}</name>
    <type>${mode}</type>
${trackSegments}
  </trk>
</gpx>`;
}
