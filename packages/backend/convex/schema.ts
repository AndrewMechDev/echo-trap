import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Schema de Convex — 4 tablas: calls, detections, alerts, contentAnalysis.
export default defineSchema({
  calls: defineTable({
    startedAt: v.number(),
    contactoConfianza: v.optional(v.string()),
  }),

  detections: defineTable({
    callId: v.id("calls"),
    source: v.string(),
    score: v.number(),
    veredicto: v.string(),
    timestamp: v.number(),
  }),

  alerts: defineTable({
    callId: v.id("calls"),
    tipo: v.string(),
    timestamp: v.number(),
  }),

  // Veredicto de análisis de CONTENIDO (transcripción + razonamiento MiniMax, con
  // fact-checking real vía Tavily) — campo separado del semáforo acústico en
  // `detections`, no lo reemplaza ni se fusiona.
  contentAnalysis: defineTable({
    callId: v.id("calls"),
    veredicto: v.string(),
    explicacion: v.string(),
    // Acotado: MiniMax cita como mucho 3 resultados por búsqueda (ver Tavily
    // max_results), nunca crece sin límite.
    sources: v.array(v.object({ titulo: v.string(), url: v.string() })),
    transcript: v.string(),
    timestamp: v.number(),
  }),
});
