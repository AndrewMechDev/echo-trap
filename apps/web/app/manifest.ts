import type { MetadataRoute } from "next";

// Manifest PWA mínimo válido. Íconos y detalles finos se completan en la fase de frontend.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EchoTrap",
    short_name: "EchoTrap",
    description: "Detector de estafas telefónicas por voz clonada con IA",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
