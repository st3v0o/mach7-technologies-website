import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import metroProxy from "./routes/metro-proxy";
import { logger } from "./lib/logger";
import { optionalSupabaseAuth } from "./middlewares/supabaseAuthMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use(optionalSupabaseAuth);

app.use("/api", router);

// In development, also proxy bundle/asset requests that arrive without the
// /api prefix.  Expo Go constructs the JS bundle URL from REACT_NATIVE_PACKAGER_HOSTNAME
// and doesn't always include the /api path prefix that EXPO_PACKAGER_PROXY_URL adds.
// Catching requests at the root level ensures Metro is reachable either way.
if (process.env.NODE_ENV !== "production") {
  app.use(metroProxy);
}

export default app;
