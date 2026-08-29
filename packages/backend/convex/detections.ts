import { v } from "convex/values";
import { z } from "zod";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { LocalWav2Vec2DetectionAdapter } from "./adapters/LocalWav2Vec2DetectionAdapter";
import { TruthScanDetectionAdapter } from "./adapters/TruthScanDetectionAdapter";
import { conTimeout, calcularVeredictoProvisional, calcularVeredictoFinal } from "./usecases/evaluarAudio";

// CERO lógica de negocio de cálculo de veredicto acá (vive en usecases/evaluarAudio.ts)
// — este archivo solo arma dependencias, orquesta EL MOMENTO de cada llamada/persistencia
// y guarda resultados (ver skill backend-senior-echotrap, regla 1).

// Margen del motor local: rápido, define el semáforo PROVISORIO (ver DECISIONS.md).
const LOCAL_TIMEOUT_MS = 3000;
// Margen de TruthScan: ampliado a ~9s porque su API real es un flujo de 4 pasos
// (presigned URL -> subir audio -> /detect -> sondear /query) que en pruebas reales
// tardó ~7s de punta a punta. Define el semáforo FINAL cuando llega a tiempo.
const REMOTE_TIMEOUT_MS = 9000;

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

// Query reactiva: el frontend la usa con `useQuery` para mostrar el semáforo. Como se
// persiste primero el provisorio (source: "local") y después el final (source:
// "truthscan" o "local-final"), la fila más reciente es siempre la que corresponde
// mostrar — no hace falta que el frontend distinga entre provisorio y final.
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

// Action pública: recibe el audio de una llamada, corre la detección en dos fases —
// persiste el semáforo provisorio apenas responde el motor local, y lo actualiza con el
// final cuando responde TruthScan (o confirma el provisorio si TruthScan no llega a
// tiempo). Es una `action` porque llama a APIs externas (regla 4 de la skill).
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

    const localDetector = new LocalWav2Vec2DetectionAdapter();
    const remoteDetector = new TruthScanDetectionAdapter();

    // Arrancan las dos llamadas en paralelo desde el primer momento — TruthScan necesita
    // el margen más largo, así que conviene que ya esté corriendo mientras esperamos al
    // motor local.
    const localPromise = conTimeout(localDetector.detectar(args.audioBuffer), LOCAL_TIMEOUT_MS);
    const remotoPromise = conTimeout(remoteDetector.detectar(args.audioBuffer), REMOTE_TIMEOUT_MS);

    const local = await localPromise;
    const provisional = calcularVeredictoProvisional(local);

    if (!provisional) {
      return { ok: false as const, reason: "motor local no disponible" };
    }

    await ctx.runMutation(internal.detections.insertarDeteccion, {
      callId: args.callId,
      source: "local",
      score: provisional.scoreLocal,
      veredicto: provisional.veredicto,
      timestamp: Date.now(),
    });

    // remotoPromise ya viene corriendo desde el principio — esto solo espera lo que
    // falte de su margen de 9s.
    const remoto = await remotoPromise;
    const final = calcularVeredictoFinal(local, remoto);

    if (!final) {
      // No debería pasar (ya confirmamos que local.ok arriba), pero por las dudas no
      // dejamos el veredicto sin confirmar.
      return { ok: true as const, veredicto: provisional.veredicto, confirmadoPorTruthScan: false };
    }

    await ctx.runMutation(internal.detections.insertarDeteccion, {
      callId: args.callId,
      source: final.truthScanLlegoATiempo ? "truthscan" : "local-final",
      score: final.truthScanLlegoATiempo ? (final.scoreTruthScan ?? 0) : final.scoreLocal,
      veredicto: final.veredicto,
      timestamp: Date.now(),
    });

    return {
      ok: true as const,
      veredicto: final.veredicto,
      scoreLocal: final.scoreLocal,
      scoreTruthScan: final.scoreTruthScan,
      confirmadoPorTruthScan: final.truthScanLlegoATiempo,
    };
  },
});
