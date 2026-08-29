import { v } from "convex/values";
import { z } from "zod";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { TruthScanDetectionAdapter } from "./adapters/TruthScanDetectionAdapter";
import { conTimeout, evaluarAudio } from "./usecases/evaluarAudio";

// CERO lógica de negocio de cálculo de veredicto acá (vive en usecases/evaluarAudio.ts)
// — este archivo solo arma dependencias, aplica el timeout y persiste el resultado
// (ver skill backend-senior-echotrap, regla 1).

// TruthScan es motor único. Su flujo real (presigned URL -> subir audio -> /detect ->
// sondear /query) tardó ~7s de punta a punta en pruebas reales — se deja margen extra.
// Nunca se espera indefinidamente a ningún motor remoto (ver hallazgo de Reality
// Defender, >10min, descartado por completo).
const TRUTHSCAN_TIMEOUT_MS = 12000;

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

// Query reactiva: el frontend la usa con `useQuery` para mostrar el semáforo.
export const listarDeteccionesPorLlamada = query({
  args: {
    callId: v.id("calls"),
  },
  handler: async (ctx, args) => {
    const detecciones = await ctx.db
      .query("detections")
      .filter((q) => q.eq(q.field("callId"), args.callId))
      .collect();

    return detecciones.sort((a, b) => a.timestamp - b.timestamp);
  },
});

// Action pública: recibe el audio de una llamada, lo evalúa con TruthScan (con timeout
// duro) y persiste el veredicto. Es una `action` porque llama a una API externa (regla 4
// de la skill).
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
    const resultadoDeteccion = await conTimeout(detector.detectar(args.audioBuffer), TRUTHSCAN_TIMEOUT_MS);
    const veredicto = evaluarAudio(resultadoDeteccion);

    if (!veredicto.ok || !veredicto.veredicto || veredicto.score === undefined) {
      return { ok: false as const, reason: veredicto.reason ?? "no se pudo evaluar el audio" };
    }

    await ctx.runMutation(internal.detections.insertarDeteccion, {
      callId: args.callId,
      source: "truthscan",
      score: veredicto.score,
      veredicto: veredicto.veredicto,
      timestamp: Date.now(),
    });

    return {
      ok: true as const,
      veredicto: veredicto.veredicto,
      score: veredicto.score,
    };
  },
});
