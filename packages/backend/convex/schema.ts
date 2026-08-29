import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Schema de Convex — 3 tablas: calls, detections, alerts.
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
});
