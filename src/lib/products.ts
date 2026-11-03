// MACH 7's apps. The switcher in the navbar moves between their pages; each page sets its own accent color
// (index.css, [data-product]) and title.
import { APP_STORE_URL, OUTSIDEY_APP_STORE_URL, OUTSIDEY_SITE_URL } from "@/lib/links";

export type ProductId = "geospector" | "outsidey";

export type Product = {
  id: ProductId;
  path: string;
  name: string;
  mark: string;
  tagline: string;
  title: string;
  appStoreUrl: string;
  nav: { href: string; label: string }[];
};

export const PRODUCTS: Product[] = [
  {
    id: "geospector",
    path: "/",
    name: "GEOSPECTOR",
    mark: "GS",
    tagline: "Professional iOS field capture — frame-by-frame GPS tagging, speed-adaptive recording, and expert manual mode with coverage accountability.",
    title: "Geospector | Frame-Level GPS Field Capture",
    appStoreUrl: APP_STORE_URL,
    nav: [
      { href: "#features", label: "Capabilities" },
      { href: "#workflow", label: "Workflow" },
      { href: "#specs", label: "Specs" },
      { href: "#screenshots", label: "Screenshots" },
      { href: "#contact", label: "Contact" },
    ],
  },
  {
    id: "outsidey",
    path: "/outsidey",
    name: "OUTSIDEY",
    mark: "OY",
    tagline: "Where can I go today? Closures, river levels, trout stocking and weather for every trail, campground and boat ramp, checked every morning from public agency data.",
    title: "Outsidey | Where Can I Go Today?",
    appStoreUrl: OUTSIDEY_APP_STORE_URL,
    nav: [
      { href: "#features", label: "Features" },
      { href: "#how", label: "How it works" },
      { href: "#states", label: "States" },
      { href: "#screenshots", label: "Screenshots" },
      { href: OUTSIDEY_SITE_URL, label: "Web map" },
    ],
  },
];

export const productAt = (location: string): Product =>
  PRODUCTS.find((p) => p.path !== "/" && location.startsWith(p.path)) ?? PRODUCTS[0];
