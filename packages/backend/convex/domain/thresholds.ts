// Umbrales de veredicto del semáforo, sobre el score 0-100 que devuelve TruthScan
// (única fuente de detección — se descartó el motor local de Hugging Face por falsos
// positivos, ver DECISIONS.md).
// Punto de partida calibrado con audio real del equipo — recalibrar si hace falta.
export const SCAM_THRESHOLD = {
  HIGH_CONFIDENCE: 70, // score >= 70 → rojo
  SUSPICIOUS: 45, // score >= 45 → amarillo
};
