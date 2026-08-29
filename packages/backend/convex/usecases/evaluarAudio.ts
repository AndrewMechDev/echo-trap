import type { Verdict } from "@echo-trap/shared";
import type { DetectionResult } from "@echo-trap/shared";
import { SCAM_THRESHOLD } from "../domain/thresholds";

// Lógica pura: no importa Convex ni ningún SDK externo, solo tipos de dominio
// (ver skill backend-senior-echotrap, regla 2).

// Cambio de arquitectura (2026-08-29, ver DECISIONS.md): validado con audio real que
// TruthScan es bastante más preciso que el motor local en este proyecto (el modelo local
// dio falsos positivos con voces reales del equipo). TruthScan pasa a ser la fuente que
// define el VEREDICTO FINAL; el motor local sigue respondiendo primero y rápido (1-3s)
// para mostrar un semáforo PROVISORIO mientras se espera la confirmación.

// Envuelve una promesa con un límite de tiempo duro — igual que antes, nunca esperamos
// indefinidamente a ningún motor remoto (ver hallazgo de Reality Defender, >10min).
export async function conTimeout<T>(
  promesa: Promise<T>,
  ms: number
): Promise<T | { ok: false; reason: "timeout" }> {
  const timeout = new Promise<{ ok: false; reason: "timeout" }>((resolve) =>
    setTimeout(() => resolve({ ok: false, reason: "timeout" }), ms)
  );
  return Promise.race([promesa, timeout]);
}

function veredictoDesdeScore(score: number): Verdict {
  if (score >= SCAM_THRESHOLD.SUSPICIOUS) return "rojo";
  if (score >= SCAM_THRESHOLD.SUSPICIOUS / 2) return "amarillo";
  return "verde";
}

// Semáforo PROVISORIO: se calcula apenas responde el motor local, mientras se sigue
// esperando a TruthScan en paralelo (con más margen, ver evaluarAudioFinal).
export function calcularVeredictoProvisional(local: DetectionResult): { veredicto: Verdict; scoreLocal: number } | null {
  if (!local.ok) return null;
  return { veredicto: veredictoDesdeScore(local.score), scoreLocal: local.score };
}

export interface VeredictoFinal {
  veredicto: Verdict;
  scoreLocal: number;
  scoreTruthScan?: number;
  truthScanLlegoATiempo: boolean;
}

// Semáforo FINAL: si TruthScan respondió a tiempo, es la fuente que decide (más precisa
// según la calibración real del equipo). Si TruthScan no llegó o falló, el veredicto
// final queda confirmado con el del motor local (el provisorio se vuelve definitivo).
export function calcularVeredictoFinal(local: DetectionResult, remoto: DetectionResult): VeredictoFinal | null {
  if (!local.ok) return null;

  if (remoto.ok) {
    return {
      veredicto: veredictoDesdeScore(remoto.score),
      scoreLocal: local.score,
      scoreTruthScan: remoto.score,
      truthScanLlegoATiempo: true,
    };
  }

  return {
    veredicto: veredictoDesdeScore(local.score),
    scoreLocal: local.score,
    truthScanLlegoATiempo: false,
  };
}
