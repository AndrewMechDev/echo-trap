import type { Metadata } from "next";
import type { Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ConvexClientProvider } from "../components/ConvexClientProvider";

export const metadata: Metadata = {
  title: "EchoTrap",
  description: "Detector de estafas telefónicas por voz clonada con IA",
  applicationName: "EchoTrap",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

// Layout raíz mínimo válido de Next.js App Router.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body><ConvexClientProvider>{children}</ConvexClientProvider></body>
    </html>
  );
}
