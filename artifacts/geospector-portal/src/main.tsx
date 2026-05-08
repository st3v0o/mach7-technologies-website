import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { setBaseUrl } from "@workspace/api-client-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// When VITE_API_BASE_URL is set (e.g. in Cloudflare Pages), direct API calls
// to the deployed atlas-api Worker instead of same-origin relative paths.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
setBaseUrl(apiBaseUrl || null);

createRoot(document.getElementById("root")!).render(<App />);
