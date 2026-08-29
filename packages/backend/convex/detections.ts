import { v } from "convex/values";
import { z } from "zod";
import type { Verdict } from "@echo-trap/shared";
import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { TruthScanDetectionAdapter } from "./adapters/TruthScanDetectionAdapter";
import { evaluarAudio, requiereAnalisisContenido } from "./usecases/evaluarAudio";
import { debeActivarHoneypot } from "./usecases/activarHoneypot";

// Anotado explícito (en vez de dejar que TS infiera el retorno): esta action llama a
// ctx.runAction(api.honeypot...) / ctx.runAction(api.contenido...), y `api` incluye a
// esta misma action — sin la anotación, TS tira TS7022/TS7023 por referencia circular
// al inferir el tipo.
type EvaluarAudioActionResult =
  | { ok: false; reason: string }
  | { ok: true; veredicto: Verdict; score: number; honeypotAudio?: ArrayBuffer; contentAnalysisTriggered: boolean };

// CERO lógica de negocio acá: solo arma dependencias (adapters concretos), llama al
// usecase puro y persiste el resultado (ver skill backend-senior-echotrap, regla 1).
// La decisión de activar el honeypot vive en el usecase (debeActivarHoneypot); acá solo
// se dispara la cadena detección → honeypot → alerta cuando corresponde.

// Valida el payload de entrada antes de procesarlo (regla 5 de la skill).
const EvaluarAudioArgsSchema = z.object({
  callId: z.string(),
  mimeType: z.string(),
  duracionMs: z.number().positive(),
});

// Mutation interna para persistir un resultado de detección — las actions no tienen
// acceso directo a ctx.db, necesitan pasar por ctx.runMutation.
export const insertarDeteccion = internalMutation({
  args: {
    callId: v.id("calls"),
    source: v.string(),
    score: v.number(),
    veredicto: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("detections", args);
  },
});

// Action pública: recibe el audio de una llamada, corre la detección contra TruthScan
// (única fuente, ver DECISIONS.md) y persiste el resultado en la tabla `detections`.
// Si el veredicto es "rojo", encadena la activación del honeypot y la alerta.
export const evaluarAudioAction = action({
  args: {
    callId: v.id("calls"),
    audioBuffer: v.bytes(),
    mimeType: v.string(),
    duracionMs: v.number(),
  },
  handler: async (ctx, args): Promise<EvaluarAudioActionResult> => {
    const parsed = EvaluarAudioArgsSchema.safeParse({
      callId: args.callId,
      mimeType: args.mimeType,
      duracionMs: args.duracionMs,
    });

    if (!parsed.success) {
      return { ok: false as const, reason: `payload inválido: ${parsed.error.message}` };
    }

    const detector = new TruthScanDetectionAdapter();

    const resultado = await evaluarAudio(args.audioBuffer, detector);

    if (!resultado.ok || !resultado.veredicto || resultado.score === undefined) {
      return { ok: false as const, reason: resultado.reason ?? "no se pudo evaluar el audio" };
    }

    await ctx.runMutation(internal.detections.insertarDeteccion, {
      callId: args.callId,
      source: "truthscan",
      score: resultado.score,
      veredicto: resultado.veredicto,
      timestamp: Date.now(),
    });

    let honeypotAudio: ArrayBuffer | undefined;

    if (debeActivarHoneypot(resultado.veredicto)) {
      await ctx.runMutation(api.alerts.crearAlerta, {
        callId: args.callId,
        tipo: "veredicto_rojo",
      });

      const honeypot = await ctx.runAction(api.honeypot.activarHoneypotAction, {
        callId: args.callId,
        veredicto: resultado.veredicto,
      });

      if (honeypot.ok) {
        honeypotAudio = honeypot.audio;
      }
    }

    // Análisis de contenido (transcripción + MiniMax + búsqueda web): solo en
    // amarillo/rojo, no en cada llamada verde (ver requiereAnalisisContenido).
    // Programado con el scheduler (no un `await` directo ni un `runAction` sin esperar)
    // porque es una señal secundaria que puede tardar hasta 30s y no debe demorar la
    // respuesta del semáforo, que ya se resolvió arriba — y a diferencia de simplemente
    // no esperar la promesa, `ctx.scheduler.runAfter` sí garantiza que la action corra
    // aunque este handler ya haya retornado.
    const contentAnalysisTriggered = requiereAnalisisContenido(resultado.veredicto);
    if (contentAnalysisTriggered) {
      await ctx.scheduler.runAfter(0, api.contenido.analizarContenidoAction, {
        callId: args.callId,
        audioBuffer: args.audioBuffer,
        mimeType: args.mimeType,
      });
    }

    return {
      ok: true as const,
      veredicto: resultado.veredicto,
      score: resultado.score,
      honeypotAudio,
      contentAnalysisTriggered,
    };
  },
});
