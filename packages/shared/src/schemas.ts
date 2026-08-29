import { z } from "zod";

// Valida el payload de audio entrante antes de procesarlo (ver skill backend-senior-echotrap, regla 5).
export const AudioPayloadSchema = z.object({
  audioBuffer: z.instanceof(ArrayBuffer),
  mimeType: z.string(),
  duracionMs: z.number().positive(),
});

export type AudioPayload = z.infer<typeof AudioPayloadSchema>;
