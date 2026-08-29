import { v } from "convex/values";
import { z } from "zod";
import { action } from "./_generated/server";
import { DeepgramVoiceAdapter, DEFAULT_HONEYPOT_VOICE } from "./adapters/DeepgramVoiceAdapter";
import { debeActivarHoneypot, generarRespuestaDilatoria } from "./usecases/activarHoneypot";
import type { Verdict } from "@echo-trap/shared";

// CERO lógica de negocio acá: solo arma dependencias (adapter concreto), llama al
// usecase puro y devuelve el resultado (ver skill backend-senior-echotrap, regla 1).

// Valida el payload de entrada antes de procesarlo (regla 5 de la skill).
const ActivarHoneypotArgsSchema = z.object({
  callId: z.string(),
  veredicto: z.enum(["verde", "amarillo", "rojo"]),
});

// Action pública: recibe el callId y el veredicto ya calculado por evaluarAudio, decide
// si corresponde activar el honeypot (solo en "rojo") y, de ser así, sintetiza la
// respuesta dilatoria vía Deepgram. Es una `action` (no `mutation`) porque llama a una
// API externa (regla 4 de la skill).
export const activarHoneypotAction = action({
  args: {
    callId: v.id("calls"),
    veredicto: v.string(),
  },
  handler: async (_ctx, args) => {
    const parsed = ActivarHoneypotArgsSchema.safeParse({
      callId: args.callId,
      veredicto: args.veredicto,
    });

    if (!parsed.success) {
      return { ok: false as const, reason: `payload inválido: ${parsed.error.message}` };
    }

    const veredicto: Verdict = parsed.data.veredicto;

    if (!debeActivarHoneypot(veredicto)) {
      return { ok: false as const, reason: "veredicto no amerita activar el honeypot" };
    }

    const synthesizer = new DeepgramVoiceAdapter();
    const resultado = await generarRespuestaDilatoria(synthesizer, DEFAULT_HONEYPOT_VOICE);

    if (!resultado.ok || !resultado.audio) {
      return { ok: false as const, reason: resultado.reason ?? "no se pudo generar el audio dilatorio" };
    }

    // Convex no serializa ArrayBuffer directo como resultado de una action — se
    // devuelve como array de bytes (opción más simple y válida) para que el caller lo
    // reconstruya del lado del cliente si lo necesita.
    return {
      ok: true as const,
      audioBytes: Array.from(new Uint8Array(resultado.audio)),
    };
  },
});
