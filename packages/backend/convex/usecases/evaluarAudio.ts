import type { Verdict } from "@echo-trap/shared";
import type { VoiceDetectionPort } from "../ports/VoiceDetectionPort";
import { SCAM_THRESHOLD } from "../domain/thresholds";

// Lógica pura: no importa Convex ni ningún SDK externo, solo ports y tipos de dominio
// (ver skill backend-senior-echotrap, regla 2).

export interface Veredicto {
  ok: boolean;
  veredicto?: Verdict;
  score?: number;
  reason?: string;
}

// Límite de tiempo duro para el motor de detección — nunca un await simple sin margen
// (ver skill backend-senior-echotrap, regla 10).
async function conTimeout<T>(
  promesa: Promise<T>,
  ms: number
): Promise<T | { ok: false; reason: "timeout" }> {
  const timeout = new Promise<{ ok: false; reason: "timeout" }>((resolve) =>
    setTimeout(() => resolve({ ok: false, reason: "timeout" }), ms)
  );
  return Promise.race([promesa, timeout]);
}

// TruthScan es la única fuente del veredicto (ver DECISIONS.md: motor local descartado
// por falsos positivos sistemáticos). Su flujo real (presigned URL -> subir audio ->
// /detect -> sondear /query) tardó ~7s de punta a punta en pruebas, y el propio adapter
// ya sondea internamente hasta ~4.2s de eso — con subida + detect + sondeo, el peor caso
// medido ronda los ~10s. Acá se deja un margen externo de 12s como red de seguridad
// (ver hallazgo de Reality Defender, >10min: nunca se espera indefinidamente a ningún
// motor remoto).
const TRUTHSCAN_TIMEOUT_MS = 12000;

export async function evaluarAudio(
  audioBuffer: ArrayBuffer,
  detector: VoiceDetectionPort
): Promise<Veredicto> {
  const resultado = await conTimeout(detector.detectar(audioBuffer), TRUTHSCAN_TIMEOUT_MS);

  if (!resultado.ok) {
    return {
      ok: false,
      reason: "reason" in resultado ? resultado.reason : "motor de detección no disponible",
    };
  }

  const score = resultado.score;
  const veredicto: Verdict =
    score >= SCAM_THRESHOLD.HIGH_CONFIDENCE ? "rojo" : score >= SCAM_THRESHOLD.SUSPICIOUS ? "amarillo" : "verde";

  return { ok: true, veredicto, score };
}

// El análisis de contenido (transcripción + razonamiento + búsqueda web) es costoso en
// tiempo y en créditos de las 3 APIs que usa — solo se dispara si el semáforo acústico
// ya sospecha algo. En "verde" no hay motivo para gastarlo en cada llamada normal.
export function requiereAnalisisContenido(veredicto: Verdict): boolean {
  return veredicto === "amarillo" || veredicto === "rojo";
}
