import type { ContentAnalysisResult } from "@echo-trap/shared";

// Contrato que define QUÉ hace cada proveedor de análisis de contenido (razonamiento
// sobre la transcripción de la llamada), no CÓMO.
export interface ContentAnalysisPort {
  analizar(transcript: string): Promise<ContentAnalysisResult>;
}
