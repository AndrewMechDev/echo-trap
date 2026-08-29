import type { Verdict } from "@echo-trap/shared";
import type { VoiceDetectionPort } from "../ports/VoiceDetectionPort";
import { SCAM_THRESHOLD } from "../domain/thresholds";

// Lógica pura: no importa Convex ni ningún SDK externo, solo ports y tipos de dominio
// (ver skill backend-senior-echotrap, regla 2).

export interface Veredicto {
  ok: boolean;
  veredicto?: Verdict;
  scoreLocal?: number;
  scoreRemoto?: number;
  remotoLlegoATiempo: boolean;
  reason?: string;
}

// Envuelve una promesa con un límite de tiempo duro. En pruebas del equipo, Reality
// Defender llegó a tardar >10min y fue descartado por completo del flujo (ver skill,
// regla 10) — por eso NUNCA esperamos indefinidamente a un motor remoto: si no responde
// dentro del margen, se lo trata como timeout y el semáforo sigue solo con el motor local.
async function conTimeout<T>(
  promesa: Promise<T>,
  ms: number
): Promise<T | { ok: false; reason: "timeout" }> {
  const timeout = new Promise<{ ok: false; reason: "timeout" }>((resolve) =>
    setTimeout(() => resolve({ ok: false, reason: "timeout" }), ms)
  );
  return Promise.race([promesa, timeout]);
}

// Orquesta el motor local (fuente primaria, rápida) y TruthScan (señal secundaria, no
// bloqueante). El motor local determina el color inicial del semáforo; TruthScan solo
// refuerza el veredicto si llega a tiempo.
export async function evaluarAudio(
  audioBuffer: ArrayBuffer,
  localDetector: VoiceDetectionPort,
  remoteDetector: VoiceDetectionPort
): Promise<Veredicto> {
  const [local, remoto] = await Promise.all([
    conTimeout(localDetector.detectar(audioBuffer), 3000), // motor local: 3s de margen
    conTimeout(remoteDetector.detectar(audioBuffer), 4000), // TruthScan: 4s, si no responde se ignora
  ]);

  // Sin el motor local no hay veredicto posible: es la fuente primaria del semáforo.
  if (!local.ok) {
    return {
      ok: false,
      reason: "motor local no disponible",
      remotoLlegoATiempo: false,
    };
  }

  const scoreLocal = local.score;
  const remotoLlegoATiempo = remoto.ok;

  // Caso más común en la demo: TruthScan no respondió a tiempo (o falló) → veredicto
  // basado SOLO en el score local, contra el umbral SUSPICIOUS.
  if (!remoto.ok) {
    const veredicto: Verdict =
      scoreLocal >= SCAM_THRESHOLD.SUSPICIOUS ? "rojo" : scoreLocal >= SCAM_THRESHOLD.SUSPICIOUS / 2 ? "amarillo" : "verde";

    return {
      ok: true,
      veredicto,
      scoreLocal,
      remotoLlegoATiempo: false,
    };
  }

  // TruthScan respondió a tiempo → veredicto por consenso entre ambos motores.
  const scoreRemoto = remoto.score;
  const ambosAltaConfianza =
    scoreLocal >= SCAM_THRESHOLD.HIGH_CONFIDENCE && scoreRemoto >= SCAM_THRESHOLD.HIGH_CONFIDENCE;
  const promedio = (scoreLocal + scoreRemoto) / 2;

  let veredicto: Verdict;
  if (ambosAltaConfianza) {
    veredicto = "rojo";
  } else if (promedio >= SCAM_THRESHOLD.SUSPICIOUS) {
    veredicto = "amarillo";
  } else {
    veredicto = "verde";
  }

  return {
    ok: true,
    veredicto,
    scoreLocal,
    scoreRemoto,
    remotoLlegoATiempo: true,
  };
}
