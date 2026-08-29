"use client";

import { CircleHelp, ShieldCheck, TriangleAlert } from "lucide";
import { MorphIcon } from "morphicons/react";
import type { Verdict } from "@echo-trap/shared";

interface SemaphoreProps {
  verdict?: Verdict;
  score?: number;
  isLoading?: boolean;
  errorMessage?: string;
}

const stateCopy: Record<Verdict, { title: string; description: string }> = {
  verde: { title: "Voz verificada", description: "No se detectaron señales de voz sintética." },
  amarillo: { title: "Voz sospechosa", description: "Hay señales que requieren atención." },
  rojo: { title: "Alerta: posible estafa", description: "La voz fue identificada como sintética." },
};

export function Semaphore({ verdict, score, isLoading, errorMessage }: SemaphoreProps) {
  const icon = verdict === "rojo" ? TriangleAlert : verdict === "amarillo" ? CircleHelp : ShieldCheck;
  const copy = verdict ? stateCopy[verdict] : undefined;

  return (
    <section className={`semaphore semaphore--${verdict ?? "idle"}`} aria-live="polite" aria-labelledby="semaphore-title">
      <div className="semaphore__orb" aria-hidden="true">
        <MorphIcon icon={icon} size={72} strokeWidth={1.6} color="currentColor" reducedMotion="user" />
      </div>
      <div className="semaphore__content">
        <span className="eyebrow">Semáforo acústico</span>
        <h2 id="semaphore-title">{isLoading ? "Analizando audio…" : copy?.title ?? "Esperando audio"}</h2>
        <p>{isLoading ? "TruthScan está verificando este segmento de voz." : copy?.description ?? "Iniciá la detección para comenzar."}</p>
        {typeof score === "number" && <strong className="semaphore__score">{score.toFixed(1)}% señal sintética</strong>}
        {errorMessage && <p className="inline-error">{errorMessage}</p>}
      </div>
    </section>
  );
}
