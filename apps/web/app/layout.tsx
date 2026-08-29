import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "EchoTrap",
  description: "Detector de estafas telefónicas por voz clonada con IA",
};

// Layout raíz mínimo válido de Next.js App Router.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
