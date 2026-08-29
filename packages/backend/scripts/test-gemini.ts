// Prueba AISLADA de Gemini — no toca el pipeline del proyecto, solo confirma que la key
// y el grounding con google_search funcionan desde nuestro lado (Node), antes de
// construir el adapter real. Uso: pnpm --filter @echo-trap/backend test:gemini <audio.wav>
import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `Eres un monitor de ciberseguridad para llamadas telefónicas.
Analiza el audio y respondé ÚNICAMENTE con este formato de 3 líneas:

[ESTADO]: OK | ADVERTENCIA | ALERTA: VISHING
[DICE]: <máximo 12 palabras resumiendo lo que dijo el hablante>
[MOTIVO]: <máximo 12 palabras con la razón del riesgo o 'Ninguno'>

Sé extremadamente breve. Sin intros, sin explicaciones largas.`;

async function main() {
  const audioPath = process.argv[2];
  if (!audioPath) {
    console.error("Uso: pnpm --filter @echo-trap/backend test:gemini <ruta-al-audio.wav>");
    process.exit(1);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Falta GEMINI_API_KEY en el entorno.");
    process.exit(1);
  }

  const client = new GoogleGenAI({ apiKey });
  const audioBytes = readFileSync(audioPath);

  console.log(`Analizando ${audioPath} (${audioBytes.length} bytes) con Gemini...`);
  const t0 = Date.now();

  const response = await client.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: "Evaluá este audio:" },
          { inlineData: { mimeType: "audio/wav", data: audioBytes.toString("base64") } },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ googleSearch: {} }],
    },
  });

  const t1 = Date.now();
  console.log(`\n--- Respuesta (${t1 - t0}ms) ---`);
  console.log(response.text);

  const grounding = response.candidates?.[0]?.groundingMetadata;
  console.log(`\n--- Grounding metadata ---`);
  console.log(JSON.stringify(grounding, null, 2));
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
