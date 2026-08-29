import type { NextConfig } from "next";

// Config mínima válida de Next.js para EchoTrap.
// El manifest PWA vive en app/manifest.ts; el resto de la configuración
// específica de PWA (service worker, cacheo offline, íconos) se completa
// en la fase de frontend (ver requirements/CLAUDE_CODE_BRIEF.md, sección 5/9).
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
