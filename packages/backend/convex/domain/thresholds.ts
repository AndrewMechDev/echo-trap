// Umbrales de veredicto del semáforo. Motor único: TruthScan (ver DECISIONS.md,
// 2026-08-29 — se descartó el motor local de Hugging Face por falsos positivos).
// Calibrados con audio real del equipo: voz real ~0, voz clonada ~87-99.
export const SCAM_THRESHOLD = {
  HIGH_CONFIDENCE: 70, // score de TruthScan que da rojo directo
  SUSPICIOUS: 45, // score de TruthScan que ya amerita amarillo
};
