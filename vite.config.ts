import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const isReplit =
  process.env.NODE_ENV !== "production" &&
  process.env.REPL_ID !== undefined;

const rawPort = process.env.PORT;
const port = rawPort && !Number.isNaN(Number(rawPort)) && Number(rawPort) > 0
  ? Number(rawPort)
  : 5173;

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    ...(isReplit
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
            m.default(),
          ),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: ["react-google-recaptcha-v3"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // Proxy /mach7/api/* → http://localhost:8080/api/* so the contact form
    // can reach the API server in the Replit dev environment.
    proxy: {
      [`${basePath}api`]: {
        target: "http://localhost:8080",
        changeOrigin: true,
        // Strip the base-path prefix: /mach7/api/contact → /api/contact
        rewrite: (p) => p.slice(basePath.length - 1),
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
