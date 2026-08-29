import type { ContentSource, ContentVerdict } from "@echo-trap/shared";
import type { TranscriptionPort } from "../ports/TranscriptionPort";
import type { ContentAnalysisPort } from "../ports/ContentAnalysisPort";
import type { AudioContentAnalysisPort } from "../ports/AudioContentAnalysisPort";

// Lógica pura: no importa Convex ni ningún SDK externo, solo ports y tipos de dominio
// (ver skill backend-senior-echotrap, regla 2).

export interface AnalisisContenido {
  ok: boolean;
  veredicto?: ContentVerdict;
  explicacion?: string;
  sources?: ContentSource[];
  transcript?: string;
  reason?: string;
}

// Límite de tiempo duro por paso — nunca un await simple sin margen (regla 10 de la
// skill). A diferencia de evaluarAudio.ts (que alimenta el semáforo en vivo), este
// análisis es una señal secundaria que aparece después en la UI, así que el margen es
// más generoso: transcripción + razonamiento del LLM normalmente tardan más que el
// veredicto acústico.
async function conTimeout<T>(
  promesa: Promise<T>,
  ms: number
): Promise<T | { ok: false; reason: "timeout" }> {
  const timeout = new Promise<{ ok: false; reason: "timeout" }>((resolve) =>
    setTimeout(() => resolve({ ok: false, reason: "timeout" }), ms)
  );
  return Promise.race([promesa, timeout]);
}

// Orquesta transcripción (Deepgram) → análisis de contenido (MiniMax). Campo separado
// del semáforo acústico (ver DECISIONS.md) — no reemplaza ni fusiona con evaluarAudio.
export async function analizarContenido(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  transcriptor: TranscriptionPort,
  analizador: ContentAnalysisPort
): Promise<AnalisisContenido> {
  const transcripcion = await conTimeout(transcriptor.transcribir(audioBuffer, mimeType), 15000);

  if (!transcripcion.ok) {
    return { ok: false, reason: transcripcion.reason };
  }

  // 30s: ahora el análisis puede implicar varias rondas de búsqueda web (function
  // calling), más margen que la versión sin búsqueda.
  const analisis = await conTimeout(analizador.analizar(transcripcion.texto), 30000);

  if (!analisis.ok) {
    return { ok: false, reason: analisis.reason, transcript: transcripcion.texto };
  }

  return {
    ok: true,
    veredicto: analisis.veredicto,
    explicacion: analisis.explicacion,
    sources: analisis.sources,
    transcript: transcripcion.texto,
  };
}

// Variante con audio nativo (Gemini): transcribe + razona + busca en una sola llamada,
// no necesita TranscriptionPort aparte (ver DECISIONS.md — reemplaza al trío
// Deepgram+MiniMax+Tavily en este rol). Mismo margen de 30s que el análisis con búsqueda.
export async function analizarContenidoConAudioNativo(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  analizador: AudioContentAnalysisPort
): Promise<AnalisisContenido> {
  const resultado = await conTimeout(analizador.analizar(audioBuffer, mimeType), 30000);

  if (!resultado.ok) {
    return { ok: false, reason: resultado.reason };
  }

  return {
    ok: true,
    veredicto: resultado.veredicto,
    explicacion: resultado.explicacion,
    sources: resultado.sources,
    transcript: resultado.transcript,
  };
}
