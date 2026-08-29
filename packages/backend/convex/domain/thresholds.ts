// Umbrales de veredicto del semáforo (ver brief sección 4, regla 10).
// Punto de partida — el humano los recalibra con pruebas de audio real del equipo.
export const SCAM_THRESHOLD = {
  HIGH_CONFIDENCE: 70, // ambos motores de acuerdo en "sintética" (remoto respondió a tiempo)
  SUSPICIOUS: 45, // solo el motor local respondió, o solo uno marca
};
