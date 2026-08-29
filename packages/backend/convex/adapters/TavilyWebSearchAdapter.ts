import type { WebSearchResult } from "@echo-trap/shared";
import type { WebSearchPort } from "../ports/WebSearchPort";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

interface TavilyResponse {
  results?: Array<{ title?: string; url?: string; content?: string }>;
}

// Adapter de búsqueda web: Tavily (créditos sponsor del hackathon) — usado por
// MiniMaxContentAnalysisAdapter para el fact-checking real del análisis de contenido.
// Implementa WebSearchPort.
export class TavilyWebSearchAdapter implements WebSearchPort {
  async buscar(query: string): Promise<WebSearchResult> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return { ok: false, reason: "TAVILY_API_KEY no configurada" };
    }

    try {
      const response = await fetch(TAVILY_SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, query, max_results: 3 }),
      });

      if (!response.ok) {
        return { ok: false, reason: `Tavily respondió status ${response.status}` };
      }

      const data = (await response.json()) as TavilyResponse;

      return {
        ok: true,
        resultados: (data.results ?? []).map((r) => ({
          titulo: r.title ?? "",
          url: r.url ?? "",
          // Recortado: no hace falta el contenido completo de la página para el
          // razonamiento del modelo, y mantiene el mensaje "tool" liviano.
          snippet: (r.content ?? "").slice(0, 300),
        })),
      };
    } catch (error) {
      // Nunca dejamos escapar una excepción cruda hacia el usecase (regla 6 de la skill).
      const reason = error instanceof Error ? error.message : "error desconocido";
      return { ok: false, reason: `fallo de red con Tavily: ${reason}` };
    }
  }
}
