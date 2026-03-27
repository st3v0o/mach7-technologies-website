import { Router, type IRouter, type Request, type Response } from "express";
import http from "http";

const router: IRouter = Router();

const METRO_PORT = 23739;

function proxyToMetro(req: Request, res: Response) {
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
  });

  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.status(502).json({ error: "metro-proxy", message: err.message });
    }
  });

  if (req.method !== "GET" && req.method !== "HEAD") {
    req.pipe(proxyReq, { end: true });
  } else {
    proxyReq.end();
  }
}

router.use("/", proxyToMetro);

export default router;
