import type { VoiceSynthesisPort } from "../ports/VoiceSynthesisPort";

// Voz por defecto para las respuestas dilatorias del honeypot (Aura TTS de Deepgram),
// ajustable si el equipo prueba otras voces durante la demo.
export const DEFAULT_HONEYPOT_VOICE = "aura-2-thalia-en";

const DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak";

// Adapter de síntesis de voz: usa Deepgram Aura TTS para las respuestas dilatorias del
// honeypot (reemplaza a MiniMax, que queda descartado del código en vivo — ver contexto
// de decisiones recientes del equipo; MiniMax solo se usa manual/offline fuera de este
// repo). Implementa VoiceSynthesisPort.
//
// Decisión de diseño: a diferencia de VoiceDetectionPort (que devuelve un resultado
// tipado `{ ok, reason }` — regla 6 de la skill), el contrato de VoiceSynthesisPort
// devuelve `Promise<ArrayBuffer>` directo, sin lugar para un `ok: false`. Cambiar esa
// firma no está pedido en esta tarea, así que la excepción SÍ se deja propagar hacia
// quien llama (usecases/activarHoneypot.ts), que la envuelve en try/catch y la traduce
// a un resultado tipado antes de que llegue a la action de Convex.
export class DeepgramVoiceAdapter implements VoiceSynthesisPort {
  async sintetizar(texto: string, voiceId: string = DEFAULT_HONEYPOT_VOICE): Promise<ArrayBuffer> {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPGRAM_API_KEY no configurada");
    }

    const response = await fetch(`${DEEPGRAM_TTS_URL}?model=${voiceId}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: texto }),
    });

    if (response.status !== 200) {
      throw new Error(`Deepgram respondió status ${response.status}`);
    }

    return response.arrayBuffer();
  }
}
