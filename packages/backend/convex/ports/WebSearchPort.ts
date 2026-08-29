import type { WebSearchResult } from "@echo-trap/shared";

// Contrato que define QUÉ hace cada proveedor de búsqueda web, no CÓMO. Lo usa
// MiniMaxContentAnalysisAdapter cuando el modelo pide verificar un dato (function calling).
export interface WebSearchPort {
  buscar(query: string): Promise<WebSearchResult>;
}
