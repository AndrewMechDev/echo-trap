import { v } from "convex/values";
import { z } from "zod";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { TruthScanDetectionAdapter } from "./adapters/TruthScanDetectionAdapter";
import { evaluarAudio } from "./usecases/evaluarAudio";

// CERO lógica de negocio acá: solo arma dependencias (adapters concretos), llama al
// usecase puro y persiste el resultado (ver skill backend-senior-echotrap, regla 1).

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

// Action pública: recibe el audio de una llamada, corre la detección (local + TruthScan
// como refuerzo no bloqueante) y persiste el/los resultado(s) en la tabla `detections`.
export const evaluarAudioAction = action({
  args: {
    callId: v.id("calls"),
    audioBuffer: v.bytes(),
    mimeType: v.string(),
    duracionMs: v.number(),
  },
  handler: async (ctx, args) => {
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

    return {
      ok: true as const,
      veredicto: resultado.veredicto,
      score: resultado.score,
    };
  },
});
