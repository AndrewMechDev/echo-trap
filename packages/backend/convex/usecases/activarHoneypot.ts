import type { Verdict } from "@echo-trap/shared";
import type { VoiceSynthesisPort } from "../ports/VoiceSynthesisPort";

// Lógica pura: no importa Convex ni ningún SDK externo, solo ports y tipos de dominio
// (ver skill backend-senior-echotrap, regla 2). Decide CUÁNDO se activa el honeypot y
// genera la respuesta dilatoria sintetizada, análogo en estilo a usecases/evaluarAudio.ts
// (que orquesta el timeout de motores de detección) pero para el flujo de honeypot.

// Frases dilatorias típicas en español rioplatense neutro — mantienen al estafador en
// línea sin darle información real. Se elige una rotando/al azar en cada activación.
const FRASES_DILATORIAS = [
  "¿Cómo dijiste? No te escucho bien, esperá que me acerco a la ventana.",
  "Un segundo que se me corta, ¿podés repetir eso último?",
  "Ay, disculpá, se me cayó algo, ¿me repetís desde el principio?",
  "Esperá un cachito que atiendo la puerta, no cortes.",
];

export interface ActivacionHoneypot {
  ok: boolean;
  audio?: ArrayBuffer;
  reason?: string;
}

// El honeypot SOLO se activa ante veredicto "rojo" — en amarillo o verde no hay
// suficiente certeza de que sea un intento de estafa, y activarlo ahí arriesga
// hablarle con una voz sintética a alguien real (falso positivo).
export function debeActivarHoneypot(veredicto: Verdict): boolean {
  return veredicto === "rojo";
}

// Elige una frase dilatoria rotando al azar entre las disponibles.
function elegirFraseDilatoria(): string {
  const indice = Math.floor(Math.random() * FRASES_DILATORIAS.length);
  return FRASES_DILATORIAS[indice];
}

// Dado que ya se decidió activar el honeypot, genera el audio de la respuesta dilatoria
// vía el VoiceSynthesisPort inyectado. Envuelve la llamada en try/catch porque, a
// diferencia de VoiceDetectionPort, el contrato de VoiceSynthesisPort.sintetizar puede
// propagar una excepción cruda (ver comentario de diseño en adapters/DeepgramVoiceAdapter.ts)
// — acá la traducimos a un resultado tipado para que la action de Convex no tenga que
// lidiar con excepciones crudas.
export async function generarRespuestaDilatoria(
  synthesizer: VoiceSynthesisPort,
  voiceId: string
): Promise<ActivacionHoneypot> {
  const frase = elegirFraseDilatoria();

  try {
    const audio = await synthesizer.sintetizar(frase, voiceId);
    return { ok: true, audio };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error desconocido";
    return { ok: false, reason: `fallo al sintetizar respuesta dilatoria: ${reason}` };
  }
}
