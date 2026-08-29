import type { DetectionResult } from "@echo-trap/shared";

// Fallback comentado por si el import del workspace no resuelve en algún entorno:
// type DetectionResult =
//   | { ok: true; score: number; source: "truthscan"; label: string }
//   | { ok: false; reason: string };

// Contrato que define QUÉ hace cada proveedor de detección de voz clonada, no CÓMO.
export interface VoiceDetectionPort {
  detectar(audioBuffer: ArrayBuffer): Promise<DetectionResult>;
}
