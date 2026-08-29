import { v } from "convex/values";
import { z } from "zod";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { GeminiContentAnalysisAdapter } from "./adapters/GeminiContentAnalysisAdapter";
import { analizarContenidoConAudioNativo } from "./usecases/analizarContenido";
// Pipeline anterior (Deepgram STT + MiniMax razonamiento + Tavily búsqueda) — se
// mantiene en el repo, sin usar, por si hace falta volver atrás. Ver DECISIONS.md:
// Gemini reemplaza a este trío en el análisis de contenido porque hace transcripción +
// razonamiento + búsqueda (google_search) en una sola llamada, verificado con audio real
// incluyendo un caso de suplantación bancaria (BCP).
// import { DeepgramTranscriptionAdapter } from "./adapters/DeepgramTranscriptionAdapter";
// import { MiniMaxContentAnalysisAdapter } from "./adapters/MiniMaxContentAnalysisAdapter";
// import { TavilyWebSearchAdapter } from "./adapters/TavilyWebSearchAdapter";
// import { analizarContenido } from "./usecases/analizarContenido";

// CERO lógica de negocio acá: solo arma dependencias (adapters concretos), llama al
// usecase puro y persiste el resultado (ver skill backend-senior-echotrap, regla 1).
// Campo separado del semáforo acústico de detections.ts — no lo toca ni depende de él.

const AnalizarContenidoArgsSchema = z.object({
  callId: z.string(),
  mimeType: z.string(),
});

export const insertarAnalisisContenido = internalMutation({
  args: {
    callId: v.id("calls"),
    veredicto: v.string(),
    explicacion: v.string(),
    sources: v.array(v.object({ titulo: v.string(), url: v.string() })),
    transcript: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("contentAnalysis", args);
  },
});

// Action pública: transcribe el audio (Deepgram) y lo analiza por contenido (MiniMax),
// persiste el resultado. No alimenta el semáforo de detections.ts — es una señal aparte.
export const analizarContenidoAction = action({
  args: {
    callId: v.id("calls"),
    audioBuffer: v.bytes(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const parsed = AnalizarContenidoArgsSchema.safeParse({
      callId: args.callId,
      mimeType: args.mimeType,
    });

    if (!parsed.success) {
      return { ok: false as const, reason: `payload inválido: ${parsed.error.message}` };
    }

    const analizador = new GeminiContentAnalysisAdapter();

    const resultado = await analizarContenidoConAudioNativo(args.audioBuffer, args.mimeType, analizador);

    if (!resultado.ok || !resultado.veredicto || resultado.explicacion === undefined) {
      return { ok: false as const, reason: resultado.reason ?? "no se pudo analizar el contenido" };
    }

    await ctx.runMutation(internal.contenido.insertarAnalisisContenido, {
      callId: args.callId,
      veredicto: resultado.veredicto,
      explicacion: resultado.explicacion,
      sources: resultado.sources ?? [],
      transcript: resultado.transcript ?? "",
      timestamp: Date.now(),
    });

    return {
      ok: true as const,
      veredicto: resultado.veredicto,
      explicacion: resultado.explicacion,
      sources: resultado.sources,
      transcript: resultado.transcript,
    };
  },
});

// Query reactiva para que el frontend lea el análisis de contenido con `useQuery`.
export const obtenerAnalisisContenidoPorLlamada = query({
  args: {
    callId: v.id("calls"),
  },
  handler: async (ctx, args) => {
    const analisis = await ctx.db
      .query("contentAnalysis")
      .filter((q) => q.eq(q.field("callId"), args.callId))
      .collect();

    return analisis.sort((a, b) => a.timestamp - b.timestamp);
  },
});
