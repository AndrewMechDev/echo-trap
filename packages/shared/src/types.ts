// Resultado de detección devuelto por cualquier adapter que implemente VoiceDetectionPort.
export type DetectionResult =
  | { ok: true; score: number; source: "truthscan"; label: string }
  | { ok: false; reason: string };

// Veredicto que muestra el semáforo en la UI.
export type Verdict = "verde" | "amarillo" | "rojo";

// Resultado de transcripción devuelto por cualquier adapter que implemente TranscriptionPort.
export type TranscriptionResult =
  | { ok: true; texto: string }
  | { ok: false; reason: string };

// Veredicto de análisis de CONTENIDO (lo que se dice en la llamada) — campo separado del
// semáforo acústico (Verdict), que solo mide si la voz es sintética. No hay reemplazo ni
// fusión entre ambos: son dos señales independientes que se muestran juntas en la UI.
export type ContentVerdict = "verdadera" | "sospechosa_de_estafa" | "enganosa" | "inconclusa";

// Fuente citada por el análisis de contenido al verificar un dato con búsqueda web.
export interface ContentSource {
  titulo: string;
  url: string;
}

// Resultado de análisis de contenido devuelto por cualquier adapter que implemente
// ContentAnalysisPort. `sources` queda vacío si el modelo no necesitó buscar nada.
export type ContentAnalysisResult =
  | { ok: true; veredicto: ContentVerdict; explicacion: string; sources: ContentSource[] }
  | { ok: false; reason: string };

// Resultado de búsqueda devuelto por cualquier adapter que implemente WebSearchPort.
export type WebSearchResult =
  | { ok: true; resultados: Array<{ titulo: string; url: string; snippet: string }> }
  | { ok: false; reason: string };
