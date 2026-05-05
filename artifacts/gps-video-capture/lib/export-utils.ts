import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';

import { LogEntry } from '@/contexts/RecordingContext';

export const BASE_DIR = FileSystem.documentDirectory + 'gps-capture/';
export const CSV_PATH = BASE_DIR + 'frame_log.csv';
export const GPX_DIR = BASE_DIR + 'gpx/';

export function isoNow() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateGeoJSON(entries: LogEntry[]): string {
  const features = entries
    .filter((e) => e.latitude !== 0 || e.longitude !== 0)
    .map((e) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          parseFloat(e.longitude.toFixed(7)),
          parseFloat(e.latitude.toFixed(7)),
        ],
      },
      properties: {
        filename: e.filename,
        timestamp: new Date(e.timestamp).toISOString(),
        session_id: e.sessionId,
        job_name: e.jobName ?? '',
        mode: e.videoSegment === 'photo' ? 'photo' : 'video_frame',
        local_path: e.localPath,
        image_url: e.supabaseUrl ?? null,
      },
    }));

  return JSON.stringify(
    {
      type: 'FeatureCollection',
      name: 'Geospector Export',
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
      },
      features,
    },
    null,
    2
  );
}

export function generateKML(entries: LogEntry[]): string {
  const points = entries
    .filter((e) => e.latitude !== 0 || e.longitude !== 0)
    .map(
      (e) => `    <Placemark>
      <name>${xmlEscape(e.filename)}</name>
      <description>${xmlEscape(new Date(e.timestamp).toISOString())} — ${xmlEscape(e.sessionId)}</description>
      <ExtendedData>
        <Data name="job_name"><value>${xmlEscape(e.jobName ?? '')}</value></Data>
        <Data name="session_id"><value>${xmlEscape(e.sessionId)}</value></Data>
        <Data name="timestamp"><value>${xmlEscape(new Date(e.timestamp).toISOString())}</value></Data>
      </ExtendedData>
      <Point><coordinates>${e.longitude.toFixed(7)},${e.latitude.toFixed(7)},0</coordinates></Point>
    </Placemark>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Geospector Export</name>
    <description>GPS-tagged frames — exported ${new Date().toISOString()}</description>
    <Folder>
      <name>Frames (${entries.length})</name>
${points}
    </Folder>
  </Document>
</kml>`;
}

export function generateCSV(entries: LogEntry[]): string {
  const header =
    'filename,timestamp,latitude,longitude,mode,local_path,session_id,job_name\n';
  const rows = entries
    .map((e) => {
      const ts = new Date(e.timestamp).toISOString();
      const mode = e.videoSegment === 'photo' ? 'photo' : 'video_frame';
      const jobName = e.jobName ? `"${e.jobName.replace(/"/g, '""')}"` : '';
      return `${e.filename},${ts},${e.latitude.toFixed(7)},${e.longitude.toFixed(7)},${mode},${e.localPath},${e.sessionId},${jobName}`;
    })
    .join('\n');
  return header + rows;
}

export async function getGpxFiles(
  sessionIds: string[]
): Promise<{ name: string; path: string }[]> {
  const result: { name: string; path: string }[] = [];
  for (const sid of sessionIds) {
    const path = GPX_DIR + sid + '.gpx';
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      result.push({ name: `${sid}.gpx`, path });
    }
  }
  const manualInfo = await FileSystem.getInfoAsync(GPX_DIR);
  if (manualInfo.exists) {
    try {
      const all = await FileSystem.readDirectoryAsync(GPX_DIR);
      for (const f of all) {
        if (!f.endsWith('.gpx')) continue;
        const sid = f.replace('.gpx', '');
        if (!sessionIds.includes(sid)) {
          result.push({ name: f, path: GPX_DIR + f });
        }
      }
    } catch {}
  }
  return result;
}

export async function writeAndShare(
  filename: string,
  content: string,
  mimeType: string,
  encoding: FileSystem.EncodingType = FileSystem.EncodingType.UTF8
) {
  const dest = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(dest, content, { encoding });
  await Sharing.shareAsync(dest, {
    mimeType,
    dialogTitle: 'Export',
    UTI: mimeType,
  });
}

export async function buildZipAndShare(
  filename: string,
  populate: (zip: JSZip) => Promise<void>
) {
  const zip = new JSZip();
  await populate(zip);
  const b64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const dest = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(dest, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(dest, {
    mimeType: 'application/zip',
    dialogTitle: 'Export',
    UTI: 'public.zip-archive',
  });
}

export async function addPhotosToZip(
  zip: JSZip,
  entries: LogEntry[],
  folder = 'photos'
) {
  const photos = entries.filter((e) => e.localPath);
  const f = zip.folder(folder)!;
  for (const entry of photos) {
    try {
      const info = await FileSystem.getInfoAsync(entry.localPath);
      if (!info.exists) continue;
      const b64 = await FileSystem.readAsStringAsync(entry.localPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      f.file(entry.filename, b64, { base64: true });
    } catch {}
  }
}

export async function addGpxToZip(
  zip: JSZip,
  sessionIds: string[],
  folder = 'gpx_tracks'
) {
  const gpxFiles = await getGpxFiles(sessionIds);
  if (gpxFiles.length === 0) return;
  const f = zip.folder(folder)!;
  for (const { name, path } of gpxFiles) {
    try {
      const content = await FileSystem.readAsStringAsync(path);
      f.file(name, content);
    } catch {}
  }
}
