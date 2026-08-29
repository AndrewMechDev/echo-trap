import type { Verdict } from "@echo-trap/shared";
import type { DetectionResult } from "@echo-trap/shared";
import { SCAM_THRESHOLD } from "../domain/thresholds";

// Lógica pura: no importa Convex ni ningún SDK externo, solo tipos de dominio
// (ver skill backend-senior-echotrap, regla 2).

// Motor único: TruthScan (ver DECISIONS.md, 2026-08-29 — se descartó el motor local de
// Hugging Face porque daba falsos positivos con voces reales en pruebas del equipo).
// Se mantiene el timeout duro igual que antes (ver hallazgo de Reality Defender, >10min)
// aunque ahora no haya un segundo motor de respaldo: si TruthScan no responde a tiempo,
// no hay veredicto — se le avisa al usuario que la detección no pudo completarse, nunca
// se inventa un resultado.
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
  if (score >= SCAM_THRESHOLD.HIGH_CONFIDENCE) return "rojo";
  if (score >= SCAM_THRESHOLD.SUSPICIOUS) return "amarillo";
  return "verde";
}

export interface Veredicto {
  ok: boolean;
  veredicto?: Verdict;
  score?: number;
  reason?: string;
}

// Evalúa el audio con el único motor de detección (TruthScan, inyectado como
// VoiceDetectionPort). El caller (detections.ts) es responsable de aplicar el timeout
// duro con conTimeout antes de llamar acá, o de envolver la llamada al detector.
export function evaluarAudio(resultado: DetectionResult): Veredicto {
  if (!resultado.ok) {
    return { ok: false, reason: resultado.reason };
  }

  return {
    ok: true,
    veredicto: veredictoDesdeScore(resultado.score),
    score: resultado.score,
  };
}
