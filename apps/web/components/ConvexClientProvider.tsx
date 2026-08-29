"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const client = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [convexUrl],
  );

  if (!client) {
    return (
      <main className="config-error">
        <div className="config-error__card">
          <span className="eyebrow">Configuración pendiente</span>
          <h1>EchoTrap necesita conectarse a Convex</h1>
          <p>
            Falta definir <code>NEXT_PUBLIC_CONVEX_URL</code> en el entorno de la
            aplicación.
          </p>
        </div>
      </main>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}

