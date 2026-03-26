#!/usr/bin/env node
/**
 * warm.js — Pre-compiles the iOS Metro bundle immediately after Metro starts.
 * Run in the background alongside `expo start` so the Replit proxy never times
 * out waiting for the first cold-build (~15-20 s) when a phone scans the QR code.
 */

const http = require('http');
const path = require('path');

const PORT = process.env.PORT || '23739';

// Dynamically resolve the expo-router entry module so the path stays correct
// across pnpm content-addressable installs.
let entryAbsolute;
try {
  entryAbsolute = require.resolve('expo-router/entry', { paths: [path.join(__dirname, '..')] });
} catch (e) {
  console.error('[warm] Could not resolve expo-router/entry:', e.message);
  process.exit(0); // non-fatal — just skip warming
}

// Metro serves files relative to the monorepo root (two levels up from this package).
// e.g. /home/runner/workspace/node_modules/.pnpm/... → /node_modules/.pnpm/...
const workspaceRoot = path.resolve(__dirname, '..', '..', '..');
const entryUrlPath = '/' + path.relative(workspaceRoot, entryAbsolute).replace(/\\/g, '/');

const bundleQuery = new URLSearchParams({
  platform: 'ios',
  dev: 'true',
  hot: 'false',
  lazy: 'true',
  'transform.engine': 'hermes',
  'transform.bytecode': '1',
  'transform.routerRoot': 'app',
  'transform.reactCompiler': 'true',
  'unstable_transformProfile': 'hermes-stable',
}).toString();

const bundlePath = entryUrlPath.replace(/\.(tsx?|js)$/, '.bundle') + '?' + bundleQuery;

function tryRequest(urlPath, label) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { hostname: 'localhost', port: Number(PORT), path: urlPath, timeout: 150_000 },
      (res) => {
        let bytes = 0;
        res.on('data', (c) => { bytes += c.length; });
        res.on('end', () => {
          console.log(`[warm] ${label} ready — ${(bytes / 1024 / 1024).toFixed(1)} MB, HTTP ${res.statusCode}`);
          resolve();
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(150_000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function waitForMetro(maxMs = 90_000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(
          { hostname: 'localhost', port: Number(PORT), path: '/', timeout: 3000 },
          (res) => { res.resume(); resolve(); }
        );
        req.on('error', reject);
        req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return false;
}

(async () => {
  console.log(`[warm] Waiting for Metro on port ${PORT}…`);
  const ready = await waitForMetro();
  if (!ready) {
    console.log('[warm] Metro did not respond in time — skipping warm-up');
    return;
  }
  console.log('[warm] Metro up. Pre-compiling iOS bundle…');
  console.log('[warm] Entry:', bundlePath.slice(0, 120) + '…');
  try {
    await tryRequest(bundlePath, 'iOS bundle');
  } catch (e) {
    console.log('[warm] Warm-up error (non-fatal):', e.message);
  }
})();
