import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Sin lógica de negocio compleja: solo persistencia simple de alertas (ver skill
// backend-senior-echotrap, regla 1). El mecanismo del MVP es un popup en la UI: el
// frontend lee estas alertas reactivo con `useQuery` — no hay webhook ni n8n todavía
// (se pospone como opción futura).

// `mutation`, no `action`: no hace ningún fetch externo, solo escribe en la tabla propia
// de Convex (regla 4 de la skill: action solo cuando se necesita llamar afuera).
export const crearAlerta = mutation({
  args: {
    callId: v.id("calls"),
    tipo: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("alerts", {
      callId: args.callId,
      tipo: args.tipo,
      timestamp: Date.now(),
    });
  },
});

// Query reactiva que usará el frontend (más adelante, con `useQuery`) para mostrar el
// popup de alerta ante un veredicto "rojo".
export const listarAlertasPorLlamada = query({
  args: {
    callId: v.id("calls"),
  },
  handler: async (ctx, args) => {
    const alertas = await ctx.db
      .query("alerts")
      .filter((q) => q.eq(q.field("callId"), args.callId))
      .collect();

    return alertas.sort((a, b) => a.timestamp - b.timestamp);
  },
});
