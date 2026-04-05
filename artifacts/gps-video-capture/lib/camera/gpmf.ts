/**
 * GPMF (GoPro Metadata Format) parser.
 *
 * Extracts GPS5 telemetry from GoPro MP4 files by:
 *   1. Parsing the MP4 box structure to locate the GoPro metadata track.
 *   2. Reading raw GPMF binary samples using the track's sample-table.
 *   3. Decoding GPS5 KLV elements into GPSPoint objects.
 *
 * Reference: https://github.com/gopro/gpmf-parser/blob/master/GPMF_spec.md
 * Platform: expo-file-system/legacy partial-reads (position + length options).
 */

import * as FileSystem from 'expo-file-system/legacy';
import type { GPSPoint } from './types';

// ─── constants ───────────────────────────────────────────────────────────────

const GPMF_GPS_HZ = 18;            // GoPro GPS polling rate (samples per second)
const SEARCH_WINDOW = 4 * 1024 * 1024; // 4 MB scan window from EOF to find moov

// ─── low-level helpers ───────────────────────────────────────────────────────

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64.replace(/\s/g, ''));
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf;
}

async function readFileBytes(
  uri: string,
  offset: number,
  length: number,
): Promise<Uint8Array> {
  const b64 = await (FileSystem as any).readAsStringAsync(uri, {
    encoding: 'base64',
    position: offset,
    length,
  });
  return base64ToBytes(b64);
}

function readUint32BE(buf: Uint8Array, off: number): number {
  return ((buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3]) >>> 0;
}

function readInt32BE(buf: Uint8Array, off: number): number {
  const v = readUint32BE(buf, off);
  return v > 0x7fffffff ? v - 0x100000000 : v;
}

function readUint16BE(buf: Uint8Array, off: number): number {
  return ((buf[off] << 8) | buf[off + 1]) >>> 0;
}

function fourCC(buf: Uint8Array, off: number): string {
  return String.fromCharCode(buf[off], buf[off + 1], buf[off + 2], buf[off + 3]);
}

// ─── MP4 box navigation ──────────────────────────────────────────────────────

interface Box {
  type: string;
  offset: number;   // byte offset inside buf where the content starts (after 8-byte header)
  size: number;     // total box size including header
}

/** Parse the direct child boxes of a container starting at buf[start..end]. */
function listBoxes(buf: Uint8Array, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let pos = start;
  while (pos + 8 <= end) {
    let size = readUint32BE(buf, pos);
    const type = fourCC(buf, pos + 4);
    let headerSize = 8;
    if (size === 1) {
      // Extended 64-bit size — we only keep the low 32 bits (files < 4 GB are fine)
      size = readUint32BE(buf, pos + 12);
      headerSize = 16;
    }
    if (size < headerSize || pos + size > end + 1) break;
    boxes.push({ type, offset: pos + headerSize, size });
    pos += size;
  }
  return boxes;
}

function findBox(buf: Uint8Array, start: number, end: number, type: string): Box | null {
  return listBoxes(buf, start, end).find(b => b.type === type) ?? null;
}

// ─── locate moov in a file buffer ────────────────────────────────────────────

/**
 * Scan the supplied buffer (which covers bytes fileOffset..fileOffset+buf.length)
 * for a top-level 'moov' box.  Returns the in-buffer start offset (pointing at
 * the 4-byte size field) or -1.
 */
function findMoovInBuffer(buf: Uint8Array): number {
  const m = [0x6d, 0x6f, 0x6f, 0x76]; // 'moov'
  for (let i = 4; i < buf.length - 4; i++) {
    if (buf[i] === m[0] && buf[i + 1] === m[1] && buf[i + 2] === m[2] && buf[i + 3] === m[3]) {
      return i - 4; // box starts 4 bytes before the type field
    }
  }
  return -1;
}

// ─── GoPro metadata track extraction ─────────────────────────────────────────

interface SampleEntry {
  fileOffset: number;  // absolute byte offset in the MP4 file
  size: number;        // byte length of this sample
  timeMs: number;      // start time of the sample in milliseconds
}

function parseMetaTrack(
  buf: Uint8Array,
  moovContentStart: number,
  moovEnd: number,
): SampleEntry[] | null {
  const trakBoxes = listBoxes(buf, moovContentStart, moovEnd).filter(b => b.type === 'trak');

  for (const trak of trakBoxes) {
    const trakEnd = trak.offset + trak.size - 8;
    const mdia = findBox(buf, trak.offset, trakEnd, 'mdia');
    if (!mdia) continue;
    const mdiaEnd = mdia.offset + mdia.size - 8;

    // Check handler name contains "GoPro MET"
    const hdlr = findBox(buf, mdia.offset, mdiaEnd, 'hdlr');
    if (!hdlr) continue;
    const hdlrContent = buf.slice(hdlr.offset, hdlr.offset + hdlr.size);
    const hdlrStr = Array.from(hdlrContent).map(b => String.fromCharCode(b)).join('');
    if (!hdlrStr.includes('GoPro MET') && !hdlrStr.includes('tmcd')) {
      // Also accept handler type 'meta' with GoPro signature
      const handlerType = fourCC(buf, hdlr.offset + 4);
      if (handlerType !== 'meta' && !hdlrStr.includes('GoPro')) continue;
      if (!hdlrStr.includes('GoPro')) continue;
    }

    // Parse mdhd for timescale
    const mdhd = findBox(buf, mdia.offset, mdiaEnd, 'mdhd');
    let timescale = 1000;
    if (mdhd) {
      const version = buf[mdhd.offset];
      timescale = version === 1
        ? readUint32BE(buf, mdhd.offset + 20)
        : readUint32BE(buf, mdhd.offset + 12);
    }

    const minf = findBox(buf, mdia.offset, mdiaEnd, 'minf');
    if (!minf) continue;
    const minfEnd = minf.offset + minf.size - 8;

    const stbl = findBox(buf, minf.offset, minfEnd, 'stbl');
    if (!stbl) continue;
    const stblEnd = stbl.offset + stbl.size - 8;

    // stco / co64: chunk offsets (absolute file positions)
    const stco = findBox(buf, stbl.offset, stblEnd, 'stco');
    const co64 = findBox(buf, stbl.offset, stblEnd, 'co64');
    if (!stco && !co64) continue;

    let chunkOffsets: number[] = [];
    if (stco) {
      const count = readUint32BE(buf, stco.offset + 4);
      for (let i = 0; i < count; i++) {
        chunkOffsets.push(readUint32BE(buf, stco.offset + 8 + i * 4));
      }
    } else if (co64) {
      const count = readUint32BE(buf, co64.offset + 4);
      for (let i = 0; i < count; i++) {
        // Only take low 32 bits (files < 4 GB)
        chunkOffsets.push(readUint32BE(buf, co64.offset + 8 + i * 8 + 4));
      }
    }

    // stsc: sample-to-chunk (first_chunk, samples_per_chunk, sample_description_index)
    const stsc = findBox(buf, stbl.offset, stblEnd, 'stsc');
    if (!stsc) continue;
    const stscCount = readUint32BE(buf, stsc.offset + 4);
    const stscEntries: { firstChunk: number; samplesPerChunk: number }[] = [];
    for (let i = 0; i < stscCount; i++) {
      stscEntries.push({
        firstChunk: readUint32BE(buf, stsc.offset + 8 + i * 12),
        samplesPerChunk: readUint32BE(buf, stsc.offset + 8 + i * 12 + 4),
      });
    }

    // stsz: sample sizes
    const stsz = findBox(buf, stbl.offset, stblEnd, 'stsz');
    if (!stsz) continue;
    const defaultSize = readUint32BE(buf, stsz.offset + 4);
    const stszCount = readUint32BE(buf, stsz.offset + 8);
    const sampleSizes: number[] = [];
    if (defaultSize !== 0) {
      for (let i = 0; i < stszCount; i++) sampleSizes.push(defaultSize);
    } else {
      for (let i = 0; i < stszCount; i++) {
        sampleSizes.push(readUint32BE(buf, stsz.offset + 12 + i * 4));
      }
    }

    // stts: time-to-sample (for timestamps)
    const stts = findBox(buf, stbl.offset, stblEnd, 'stts');
    let sampleTimeMs = 0;
    const sampleTimes: number[] = [];
    if (stts) {
      const sttsCount = readUint32BE(buf, stts.offset + 4);
      let sIdx = 0;
      for (let e = 0; e < sttsCount && sIdx < stszCount; e++) {
        const count = readUint32BE(buf, stts.offset + 8 + e * 8);
        const delta = readUint32BE(buf, stts.offset + 8 + e * 8 + 4);
        for (let i = 0; i < count && sIdx < stszCount; i++, sIdx++) {
          sampleTimes.push(Math.round((sampleTimeMs * 1000) / timescale));
          sampleTimeMs += delta;
        }
      }
    } else {
      for (let i = 0; i < stszCount; i++) sampleTimes.push(i * 100);
    }

    // Build flat sample list using stsc + stco
    const samples: SampleEntry[] = [];
    let sampleIdx = 0;
    for (let chunkIdx = 0; chunkIdx < chunkOffsets.length && sampleIdx < sampleSizes.length; chunkIdx++) {
      const chunk1Based = chunkIdx + 1;
      let spc = 1;
      for (let e = stscEntries.length - 1; e >= 0; e--) {
        if (chunk1Based >= stscEntries[e].firstChunk) { spc = stscEntries[e].samplesPerChunk; break; }
      }
      let fileOff = chunkOffsets[chunkIdx];
      for (let s = 0; s < spc && sampleIdx < sampleSizes.length; s++, sampleIdx++) {
        samples.push({
          fileOffset: fileOff,
          size: sampleSizes[sampleIdx],
          timeMs: sampleTimes[sampleIdx] ?? 0,
        });
        fileOff += sampleSizes[sampleIdx];
      }
    }

    if (samples.length > 0) return samples;
  }
  return null;
}

// ─── GPMF binary parser ───────────────────────────────────────────────────────

interface GpmfElement {
  key: string;
  type: string;
  size: number;
  repeat: number;
  dataOffset: number; // offset in the buf slice
}

/** Parse top-level GPMF elements from a raw sample buffer. */
function listGpmfElements(buf: Uint8Array, start: number, end: number): GpmfElement[] {
  const elems: GpmfElement[] = [];
  let pos = start;
  while (pos + 8 <= end) {
    const key = fourCC(buf, pos);
    const type = String.fromCharCode(buf[pos + 4]);
    const size = buf[pos + 5];
    const repeat = readUint16BE(buf, pos + 6);
    const dataBytes = size * repeat;
    const padded = Math.ceil((dataBytes) / 4) * 4;
    elems.push({ key, type, size, repeat, dataOffset: pos + 8 });
    pos += 8 + padded;
  }
  return elems;
}

interface Gps5Point {
  lat: number;
  lon: number;
  alt: number;
  speed2d: number;
  speed3d: number;
}

function decodeScal(buf: Uint8Array, elem: GpmfElement): number {
  if (elem.type === 'l' || elem.type === 'L') return readUint32BE(buf, elem.dataOffset);
  if (elem.type === 's' || elem.type === 'S') return readUint16BE(buf, elem.dataOffset);
  if (elem.type === 'b' || elem.type === 'B') return buf[elem.dataOffset];
  return 1;
}

function decodeGps5(buf: Uint8Array, elem: GpmfElement, scal: number): Gps5Point[] {
  const points: Gps5Point[] = [];
  const bytesPerEntry = 5 * 4; // 5 × int32
  if (elem.size !== bytesPerEntry) return points; // unexpected format
  for (let i = 0; i < elem.repeat; i++) {
    const off = elem.dataOffset + i * bytesPerEntry;
    points.push({
      lat: readInt32BE(buf, off + 0) / scal,
      lon: readInt32BE(buf, off + 4) / scal,
      alt: readInt32BE(buf, off + 8) / scal,
      speed2d: readInt32BE(buf, off + 12) / scal,
      speed3d: readInt32BE(buf, off + 16) / scal,
    });
  }
  return points;
}

/** Parse a single GPMF sample blob and return all GPS5 readings inside it. */
function parseGpmfSample(
  sampleBuf: Uint8Array,
  sampleStartMs: number,
): Array<Omit<GPSPoint, 'source'>> {
  const results: Array<Omit<GPSPoint, 'source'>> = [];
  const elems = listGpmfElements(sampleBuf, 0, sampleBuf.length);

  for (const elem of elems) {
    if (elem.key !== 'DEVC') continue;
    // Recurse into DEVC streams
    const devcEnd = elem.dataOffset + elem.size * elem.repeat;
    const streams = listGpmfElements(sampleBuf, elem.dataOffset, devcEnd);

    for (const stream of streams) {
      if (stream.key !== 'STRM') continue;
      const strmEnd = stream.dataOffset + stream.size * stream.repeat;
      const children = listGpmfElements(sampleBuf, stream.dataOffset, strmEnd);

      let scal = 1;
      let gpsFix = 3; // default: 3D
      const gps5Elem = children.find(c => c.key === 'GPS5');

      for (const child of children) {
        if (child.key === 'SCAL') scal = decodeScal(sampleBuf, child);
        if (child.key === 'GPSF' && child.repeat === 1) gpsFix = readInt32BE(sampleBuf, child.dataOffset);
      }

      if (!gps5Elem || gpsFix === 0) continue;

      const pts = decodeGps5(sampleBuf, gps5Elem, scal);
      const intervalMs = pts.length > 1 ? (1000 / GPMF_GPS_HZ) : 0;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) continue; // sanity check
        results.push({
          timestamp: sampleStartMs + Math.round(i * intervalMs),
          latitude: p.lat,
          longitude: p.lon,
          altitude: p.alt,
          speed: p.speed2d,
          heading: undefined,
          accuracy: undefined,
        });
      }
    }
  }
  return results;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Parse GPMF GPS telemetry from a locally-downloaded GoPro MP4 file.
 *
 * Returns an array of GPSPoint objects (source='camera') sorted by timestamp.
 * Returns an empty array if no GPS data is found (e.g. GPS was disabled on camera).
 *
 * @param localFilePath  expo-file-system URI of the downloaded MP4 (e.g. file:///…)
 * @param clipStartMs    Unix timestamp (ms) to anchor relative track times;
 *                       defaults to Date.now() if not provided.
 */
export async function extractGpsFromGoProMp4(
  localFilePath: string,
  clipStartMs: number = Date.now(),
): Promise<Array<Omit<GPSPoint, 'source'>>> {
  try {
    const info = await (FileSystem as any).getInfoAsync(localFilePath, { size: true });
    const fileSize: number = (info as any).size ?? 0;
    if (fileSize < 1024) return [];

    // Read trailing window to find moov (GoPro typically writes moov at EOF)
    const windowSize = Math.min(SEARCH_WINDOW, fileSize);
    const windowOffset = fileSize - windowSize;
    const windowBuf = await readFileBytes(localFilePath, windowOffset, windowSize);

    let moovInBufOffset = findMoovInBuffer(windowBuf);

    // If moov not found at end, try start of file
    if (moovInBufOffset === -1) {
      const headBuf = await readFileBytes(localFilePath, 0, Math.min(SEARCH_WINDOW, fileSize));
      moovInBufOffset = findMoovInBuffer(headBuf);
      if (moovInBufOffset === -1) return [];

      const moovSize = readUint32BE(headBuf, moovInBufOffset);
      const moovContentStart = moovInBufOffset + 8;
      const moovEnd = moovInBufOffset + moovSize;

      const samples = parseMetaTrack(headBuf, moovContentStart, moovEnd);
      if (!samples || samples.length === 0) return [];
      return await readAndParseGpmfSamples(localFilePath, samples, clipStartMs);
    }

    const moovSize = readUint32BE(windowBuf, moovInBufOffset);
    const moovContentStart = moovInBufOffset + 8;
    const moovEnd = moovInBufOffset + moovSize;

    // If moov extends beyond our window, re-read with the absolute offset
    if (moovEnd > windowBuf.length) {
      const absoluteMoovStart = windowOffset + moovInBufOffset;
      const fullMoov = await readFileBytes(localFilePath, absoluteMoovStart, moovSize);
      const samples = parseMetaTrack(fullMoov, 8, moovSize);
      if (!samples || samples.length === 0) return [];
      return await readAndParseGpmfSamples(localFilePath, samples, clipStartMs);
    }

    const samples = parseMetaTrack(windowBuf, moovContentStart, moovEnd);
    if (!samples || samples.length === 0) return [];
    return await readAndParseGpmfSamples(localFilePath, samples, clipStartMs);
  } catch (err) {
    console.warn('[GPMF] parse error:', err);
    return [];
  }
}

async function readAndParseGpmfSamples(
  localFilePath: string,
  samples: SampleEntry[],
  clipStartMs: number,
): Promise<Array<Omit<GPSPoint, 'source'>>> {
  const allPoints: Array<Omit<GPSPoint, 'source'>> = [];
  for (const sample of samples) {
    if (sample.size === 0) continue;
    const sampleBuf = await readFileBytes(localFilePath, sample.fileOffset, sample.size);
    const pts = parseGpmfSample(sampleBuf, clipStartMs + sample.timeMs);
    allPoints.push(...pts);
  }
  allPoints.sort((a, b) => a.timestamp - b.timestamp);
  return allPoints;
}
