import type { TranscriptionResult } from "@echo-trap/shared";
import type { TranscriptionPort } from "../ports/TranscriptionPort";

const DEEPGRAM_STT_URL = "https://api.deepgram.com/v1/listen";

interface DeepgramResponse {
  results?: {
    channels?: Array<{
      alternatives?: Array<{ transcript?: string }>;
    }>;
  };
}

// Adapter de transcripción: Deepgram (pre-recorded audio, modelo nova-2 en español) —
// paso previo obligatorio para el análisis de contenido, porque MiniMax no acepta audio
// como input directo (solo texto/imagen/video). Implementa TranscriptionPort.
export class DeepgramTranscriptionAdapter implements TranscriptionPort {
  async transcribir(audioBuffer: ArrayBuffer, mimeType: string): Promise<TranscriptionResult> {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return { ok: false, reason: "DEEPGRAM_API_KEY no configurada" };
    }

    try {
      const response = await fetch(
        `${DEEPGRAM_STT_URL}?model=nova-2&language=es&smart_format=true`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": mimeType,
          },
          body: audioBuffer,
        }
      );

      if (!response.ok) {
        return { ok: false, reason: `Deepgram respondió status ${response.status}` };
      }

      const data = (await response.json()) as DeepgramResponse;
      const texto = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

      if (!texto.trim()) {
        return { ok: false, reason: "Deepgram no devolvió texto (audio vacío o silencioso)" };
      }

      return { ok: true, texto };
    } catch (error) {
      // Nunca dejamos escapar una excepción cruda hacia el usecase (regla 6 de la skill).
      const reason = error instanceof Error ? error.message : "error desconocido";
      return { ok: false, reason: `fallo de red con Deepgram: ${reason}` };
    }
  }
}
