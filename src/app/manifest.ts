import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Nakama",
    short_name: "Nakama",
    description: "Define, develop, and manage projects with your team.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3f4ea",
    theme_color: "#f3f4ea",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
