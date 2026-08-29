import type { TranscriptionResult } from "@echo-trap/shared";

// Contrato que define QUÉ hace cada proveedor de transcripción de voz a texto, no CÓMO.
export interface TranscriptionPort {
  transcribir(audioBuffer: ArrayBuffer, mimeType: string): Promise<TranscriptionResult>;
}
