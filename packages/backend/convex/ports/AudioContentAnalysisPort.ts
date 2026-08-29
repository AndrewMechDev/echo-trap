import type { ContentSource, ContentVerdict } from "@echo-trap/shared";

// A diferencia de ContentAnalysisPort (que recibe texto ya transcripto), este contrato
// es para proveedores que entienden audio nativo y devuelven transcripción + veredicto +
// fuentes en una sola llamada (ej. Gemini, que no necesita un TranscriptionPort aparte).
export type AudioContentAnalysisResult =
  | { ok: true; veredicto: ContentVerdict; explicacion: string; sources: ContentSource[]; transcript: string }
  | { ok: false; reason: string };

export interface AudioContentAnalysisPort {
  analizar(audioBuffer: ArrayBuffer, mimeType: string): Promise<AudioContentAnalysisResult>;
}
