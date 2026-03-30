import { Router, type IRouter, type Request, type Response } from "express";
import http from "http";

const router: IRouter = Router();

const METRO_PORT = 23739;
// How long to keep retrying before giving up (ms)
const RETRY_TIMEOUT_MS = 30_000;
const RETRY_INTERVAL_MS = 800;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Attempt one proxy pass to Metro.  Resolves true on success (response fully
 * piped), false when Metro is not yet listening (ECONNREFUSED / ECONNRESET),
 * and rejects for any other unexpected error.
 */
function tryProxy(req: Request, res: Response): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: "localhost",
      port: METRO_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${METRO_PORT}`,
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      const headers: Record<string, string | string[]> = {};
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        if (v !== undefined) headers[k] = v;
      }
      headers["access-control-allow-origin"] = "*";
      res.writeHead(proxyRes.statusCode ?? 200, headers);
      proxyRes.pipe(res, { end: true });
      proxyRes.on("end", () => resolve(true));
      proxyRes.on("error", reject);
    });

    proxyReq.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET") {
        resolve(false); // Metro not ready yet — caller will retry
      } else {
        reject(err);
      }
    });

    if (req.method !== "GET" && req.method !== "HEAD") {
      req.pipe(proxyReq, { end: true });
    } else {
      proxyReq.end();
    }
  });
}

async function proxyToMetro(req: Request, res: Response) {
  const deadline = Date.now() + RETRY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const ok = await tryProxy(req, res);
      if (ok) return;
      // Metro not ready — wait and retry
      await sleep(RETRY_INTERVAL_MS);
    } catch (err: unknown) {
      if (!res.headersSent) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(502).json({ error: "metro-proxy", message: msg });
      }
      return;
    }
  }

  if (!res.headersSent) {
    res
      .status(503)
      .json({ error: "metro-proxy", message: "Metro did not start in time" });
  }
}

router.use("/", proxyToMetro);

export default router;
