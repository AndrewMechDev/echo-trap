// Umbrales de veredicto del semáforo, sobre el score 0-100 que devuelve TruthScan
// (única fuente de detección, ver DECISIONS.md).
// Punto de partida — el humano los recalibra con pruebas de audio real del equipo.
export const SCAM_THRESHOLD = {
  HIGH_CONFIDENCE: 70, // score >= 70 → rojo
  SUSPICIOUS: 45, // score >= 45 → amarillo
};
