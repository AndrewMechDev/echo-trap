import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Sin lógica de negocio: persistencia simple de llamadas (ver skill
// backend-senior-echotrap, regla 1). No requiere usecase propio porque no hay ninguna
// decisión que tomar, solo crear/leer el registro.

// Arranca una sesión de llamada nueva. `contactoConfianza` es texto libre (a quién
// avisar si el veredicto da "rojo"), sin usuario asociado — no hay login en este
// hackathon (ver skill, regla 9).
export const crearLlamada = mutation({
  args: {
    contactoConfianza: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callId = await ctx.db.insert("calls", {
      startedAt: Date.now(),
      contactoConfianza: args.contactoConfianza,
    });
    return callId;
  },
});

// Query reactiva para que el frontend lea el estado de una llamada con `useQuery`.
export const obtenerLlamada = query({
  args: {
    callId: v.id("calls"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.callId);
  },
});
