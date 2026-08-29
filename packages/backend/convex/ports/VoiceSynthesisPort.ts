// Contrato que define QUÉ hace cada proveedor de síntesis/clonación de voz, no CÓMO.
export interface VoiceSynthesisPort {
  sintetizar(texto: string, voiceId: string): Promise<ArrayBuffer>;
}
