import type { DetectionResult } from "@echo-trap/shared";
import type { VoiceDetectionPort } from "../ports/VoiceDetectionPort";

// Contrato real confirmado contra la documentación oficial de TruthScan
// (https://truthscan.com/truthscan-ai-audio-detection-api-documentation) — es un flujo
// ASÍNCRONO de 4 pasos, no una sola llamada: pedir URL pre-firmada, subir el audio ahí,
// pedir la detección (devuelve "pending" de inmediato) y sondear /query hasta "done".
// Por eso este adapter realista va a tardar casi siempre MÁS que el margen de 4s que le
// da evaluarAudio.ts — es exactamente el caso para el que se diseñó el timeout no
// bloqueante (ver skill backend-senior-echotrap, regla 10): si no llega a tiempo, el
// semáforo sigue solo con el motor local, sin esperar más.
const TRUTHSCAN_BASE_URL = "https://detect-audio.truthscan.com";
const POLL_INTERVAL_MS = 700;
const MAX_POLL_ATTEMPTS = 6; // ~4.2s de sondeo — límite propio además del timeout externo, para no dejar el poll corriendo indefinidamente si el timeout externo ya abandonó la promesa

interface PresignedUrlResponse {
  status: string;
  presigned_url: string;
  file_path: string;
}

interface DetectResponse {
  id: string;
  status: string;
}

interface QueryResponse {
  id: string;
  status: "pending" | "analyzing" | "done" | "failed";
  result?: number;
  result_details?: {
    mean_ai_prob?: number;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Adapter del motor remoto confirmado (TruthScan): señal SECUNDARIA de refuerzo, no
// bloqueante. Reality Defender fue descartado por latencia >10min y no se implementa.
// Igual que el adapter local, NO implementa su propio timeout duro: lo aplica
// usecases/evaluarAudio.ts — acá solo se pone un tope de intentos de sondeo razonable.
export class TruthScanDetectionAdapter implements VoiceDetectionPort {
  async detectar(audioBuffer: ArrayBuffer): Promise<DetectionResult> {
    const apiKey = process.env.TRUTHSCAN_API_KEY;
    if (!apiKey) {
      return { ok: false, reason: "TRUTHSCAN_API_KEY no configurada" };
    }

    try {
      // 1. Pedir URL pre-firmada para subir el audio.
      const fileName = `echotrap-${Date.now()}.wav`;
      const presignedResponse = await fetch(
        `${TRUTHSCAN_BASE_URL}/get-presigned-url?file_name=${encodeURIComponent(fileName)}`,
        { headers: { apikey: apiKey } }
      );

      if (!presignedResponse.ok) {
        return { ok: false, reason: `fallo al pedir URL pre-firmada: status ${presignedResponse.status}` };
      }

      const presigned = (await presignedResponse.json()) as PresignedUrlResponse;

      // 2. Subir el audio directo a la URL pre-firmada.
      const uploadResponse = await fetch(presigned.presigned_url, {
        method: "PUT",
        headers: {
          "Content-Type": "audio/wav",
          "x-amz-acl": "private",
        },
        body: audioBuffer,
      });

      if (uploadResponse.status !== 200) {
        return { ok: false, reason: `fallo al subir audio a TruthScan: status ${uploadResponse.status}` };
      }

      // 3. Pedir la detección — responde de inmediato con status "pending", el análisis
      // real sigue en su servidor.
      const detectResponse = await fetch(`${TRUTHSCAN_BASE_URL}/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: apiKey,
          url: presigned.file_path,
          document_type: "Audio",
          analyzeUpToSeconds: 10, // alcanza para un clip corto de llamada, mantiene el análisis liviano
        }),
      });

      if (!detectResponse.ok) {
        return { ok: false, reason: `fallo al enviar detección a TruthScan: status ${detectResponse.status}` };
      }

      const { id } = (await detectResponse.json()) as DetectResponse;

      // 4. Sondear /query hasta que el análisis termine (o se agote el tope de intentos
      // propio — el timeout externo de evaluarAudio.ts probablemente corte antes que esto).
      for (let intento = 0; intento < MAX_POLL_ATTEMPTS; intento++) {
        await sleep(POLL_INTERVAL_MS);

        const queryResponse = await fetch(`${TRUTHSCAN_BASE_URL}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });

        if (!queryResponse.ok) {
          return { ok: false, reason: `fallo al consultar estado en TruthScan: status ${queryResponse.status}` };
        }

        const data = (await queryResponse.json()) as QueryResponse;

        if (data.status === "failed") {
          return { ok: false, reason: "TruthScan reportó status failed" };
        }

        if (data.status === "done") {
          // mean_ai_prob viene en escala 0-1 (probabilidad de ser generado por IA).
          const probabilidad = data.result_details?.mean_ai_prob ?? data.result ?? 0;
          return {
            ok: true,
            score: Math.round(probabilidad * 100),
            source: "truthscan",
            label: probabilidad >= 0.5 ? "sintetica" : "real",
          };
        }
        // status "pending" o "analyzing": seguimos sondeando.
      }

      return { ok: false, reason: "timeout de sondeo propio agotado antes de que TruthScan termine" };
    } catch (error) {
      // Nunca dejamos escapar una excepción cruda hacia el usecase (regla 6 de la skill).
      const reason = error instanceof Error ? error.message : "error desconocido";
      return { ok: false, reason: `fallo de red con TruthScan: ${reason}` };
    }
  }
}
