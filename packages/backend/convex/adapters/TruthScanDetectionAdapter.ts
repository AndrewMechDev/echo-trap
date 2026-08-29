import type { DetectionResult } from "@echo-trap/shared";
import type { VoiceDetectionPort } from "../ports/VoiceDetectionPort";

// TODO: confirmar endpoint exacto contra la doc de TruthScan una vez validado el free trial.
const TRUTHSCAN_API_URL = "https://api.truthscan.com/v1/detect";

// Etiquetas que TruthScan puede devolver como "sintética" — se ajusta cuando el equipo
// confirme el formato real de la respuesta durante el free trial.
const SYNTHETIC_LABELS = ["fake", "spoof", "synthetic", "ai-generated", "cloned"];

interface TruthScanResponse {
  resultados: Array<{ label: string; score: number }>;
}

// Adapter del motor remoto confirmado (TruthScan): señal SECUNDARIA de refuerzo, no
// bloqueante (ver skill backend-senior-echotrap, regla 10). Reality Defender fue
// descartado por latencia >10min y no se implementa. Igual que el adapter local, NO
// implementa su propio timeout: lo aplica usecases/evaluarAudio.ts.
export class TruthScanDetectionAdapter implements VoiceDetectionPort {
  async detectar(audioBuffer: ArrayBuffer): Promise<DetectionResult> {
    const apiKey = process.env.TRUTHSCAN_API_KEY;
    if (!apiKey) {
      return { ok: false, reason: "TRUTHSCAN_API_KEY no configurada" };
    }

    try {
      const formData = new FormData();
      formData.append("audio", new Blob([audioBuffer]), "audio.wav");

      const response = await fetch(TRUTHSCAN_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
        },
        body: formData,
      });

      if (response.status !== 200) {
        return { ok: false, reason: `TruthScan respondió status ${response.status}` };
      }

      const data = (await response.json()) as TruthScanResponse;

      if (!data.resultados || data.resultados.length === 0) {
        return { ok: false, reason: "TruthScan no devolvió resultados" };
      }

      const ganador = data.resultados.reduce((mejor, actual) =>
        actual.score > mejor.score ? actual : mejor
      );

      const esSintetica = SYNTHETIC_LABELS.some((label) =>
        ganador.label.toLowerCase().includes(label)
      );

      return {
        ok: true,
        score: esSintetica ? Math.round(ganador.score * 100) : Math.round((1 - ganador.score) * 100),
        source: "truthscan",
        label: ganador.label,
      };
    } catch (error) {
      // Nunca dejamos escapar una excepción cruda hacia el usecase (regla 6 de la skill).
      const reason = error instanceof Error ? error.message : "error desconocido";
      return { ok: false, reason: `fallo de red con TruthScan: ${reason}` };
    }
  }
}
