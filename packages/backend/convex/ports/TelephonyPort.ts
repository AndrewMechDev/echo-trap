// TODO fase 4
// Contrato básico para telefonía (p. ej. Vapi) — dilatar al estafador vía el honeypot.
export interface TelephonyPort {
  iniciarLlamada(numeroDestino: string): Promise<{ callId: string }>;
  enviarRespuesta(callId: string, textoRespuesta: string): Promise<void>;
}
