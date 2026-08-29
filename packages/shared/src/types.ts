// Resultado de detección devuelto por cualquier adapter que implemente VoiceDetectionPort.
export type DetectionResult =
  | { ok: true; score: number; source: "local" | "truthscan"; label: string }
  | { ok: false; reason: string };

// Veredicto que muestra el semáforo en la UI.
export type Verdict = "verde" | "amarillo" | "rojo";
