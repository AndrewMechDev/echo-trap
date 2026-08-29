import type { DetectionResult } from "@echo-trap/shared";
import type { VoiceDetectionPort } from "../ports/VoiceDetectionPort";

// Etiquetas del pipeline de HuggingFace (audio-classification) que consideramos
// "voz sintética / fake" al traducir la respuesta del microservicio Python.
const SYNTHETIC_LABELS = ["fake", "spoof", "synthetic", "ai-generated", "cloned"];

interface Wav2Vec2Response {
  resultados: Array<{ label: string; score: number }>;
}

// Adapter de la fuente PRIMARIA y rápida del semáforo: un microservicio Python propio
// que corre Wav2Vec2 localmente (<1-2s). NO implementa su propio timeout: quien orquesta
// (usecases/evaluarAudio.ts) es responsable de aplicar el límite de tiempo, según la skill
// backend-senior-echotrap (regla 10).
export class LocalWav2Vec2DetectionAdapter implements VoiceDetectionPort {
  async detectar(audioBuffer: ArrayBuffer): Promise<DetectionResult> {
    const baseUrl = process.env.DETECTION_PY_URL;
    if (!baseUrl) {
      return { ok: false, reason: "DETECTION_PY_URL no configurada" };
    }

    try {
      const formData = new FormData();
      formData.append("audio", new Blob([audioBuffer]), "audio.wav");

      const response = await fetch(`${baseUrl}/detect`, {
        method: "POST",
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY ?? "",
        },
        body: formData,
      });

      if (response.status !== 200) {
        return { ok: false, reason: `microservicio local respondió status ${response.status}` };
      }

      const data = (await response.json()) as Wav2Vec2Response;

      if (!data.resultados || data.resultados.length === 0) {
        return { ok: false, reason: "microservicio local no devolvió resultados" };
      }

      // El label ganador es el de mayor score (formato estándar del pipeline HF).
      const ganador = data.resultados.reduce((mejor, actual) =>
        actual.score > mejor.score ? actual : mejor
      );

      const esSintetica = SYNTHETIC_LABELS.some((label) =>
        ganador.label.toLowerCase().includes(label)
      );

      return {
        ok: true,
        // El score del pipeline HF viene en escala 0-1, lo llevamos a 0-100 para el semáforo.
        score: esSintetica ? Math.round(ganador.score * 100) : Math.round((1 - ganador.score) * 100),
        source: "local",
        label: ganador.label,
      };
    } catch (error) {
      // Nunca dejamos escapar una excepción cruda hacia el usecase (regla 6 de la skill).
      const reason = error instanceof Error ? error.message : "error desconocido";
      return { ok: false, reason: `fallo de red con microservicio local: ${reason}` };
    }
  }
}
