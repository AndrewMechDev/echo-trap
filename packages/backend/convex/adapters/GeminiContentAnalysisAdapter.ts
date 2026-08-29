import { GoogleGenAI } from "@google/genai";
import type { ContentVerdict } from "@echo-trap/shared";
import type { AudioContentAnalysisPort, AudioContentAnalysisResult } from "../ports/AudioContentAnalysisPort";

// Verificado en pruebas reales (2026-08-29, ver DECISIONS.md): Gemini SÍ tiene grounding
// con google_search funcionando en esta cuenta — el hallazgo anterior ("no disponible en
// plan gratis") no aplica acá. No asumir que siempre va a funcionar igual; si en algún
// momento deja de traer groundingMetadata, revisar el plan/cuota de la cuenta.
const GEMINI_MODEL = "gemini-3.6-flash";

const VEREDICTOS_VALIDOS: ContentVerdict[] = ["verdadera", "sospechosa_de_estafa", "enganosa", "inconclusa"];

// Prompt pensado para vishing en general y, en particular, para suplantación de bancos
// (el pedido explícito del equipo fue detectar estafas tipo las que se hacen contra el
// BCP: falsos ejecutivos, pedidos de códigos de verificación, urgencia artificial).
const SYSTEM_PROMPT = `Sos un sistema de ciberseguridad que analiza llamadas telefónicas para detectar vishing (estafas por voz), incluida la suplantación de bancos u otras entidades (ej. falsos ejecutivos de banco pidiendo códigos de verificación, datos de tarjeta, o generando urgencia artificial).

Instrucciones:
1. Transcribí fielmente lo que dice el hablante en el audio.
2. Evaluá si hay señales de estafa: suplantación de identidad/entidad, pedidos de datos sensibles o códigos, urgencia artificial, premios no solicitados, amenazas.
3. Si el hablante menciona un banco, empresa, número de teléfono o procedimiento específico, usá la búsqueda web para verificar si es real y si el comportamiento descripto coincide con los protocolos oficiales de esa entidad. Nunca inventes ni asumas sin buscar.
4. Nunca inventes ni cites una fuente que no hayas encontrado con la búsqueda.
5. Respondé ÚNICAMENTE con un JSON válido, sin texto antes ni después, con este formato exacto:
{"transcript": "<transcripción fiel del audio>", "veredicto": "verdadera" | "sospechosa_de_estafa" | "enganosa" | "inconclusa", "explicacion": "<explicación breve y clara>", "sources": [{"titulo": "...", "url": "..."}]}
El campo "sources" debe contener únicamente fuentes reales encontradas por búsqueda. Si no hizo falta buscar, "sources" es una lista vacía.`;

// Convex corre las actions en un runtime tipo edge (no Node completo) — no hay `Buffer`
// disponible, así que se codifica a base64 a mano con `btoa`, en trozos para no
// desbordar la pila con spread de arrays muy grandes.
function arrayBufferABase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binario = "";
  const TAMANO_TROZO = 0x8000;
  for (let i = 0; i < bytes.length; i += TAMANO_TROZO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + TAMANO_TROZO));
  }
  return btoa(binario);
}

function parsearRespuesta(texto: string): AudioContentAnalysisResult {
  const match = texto.match(/\{[\s\S]*\}/);
  if (!match) {
    return { ok: false, reason: "Gemini no devolvió un JSON reconocible" };
  }

  try {
    const parsed = JSON.parse(match[0]) as {
      transcript?: string;
      veredicto?: string;
      explicacion?: string;
      sources?: Array<{ titulo: string; url: string }>;
    };

    if (!parsed.veredicto || !VEREDICTOS_VALIDOS.includes(parsed.veredicto as ContentVerdict)) {
      return { ok: false, reason: `veredicto fuera de catálogo: ${parsed.veredicto}` };
    }

    return {
      ok: true,
      veredicto: parsed.veredicto as ContentVerdict,
      explicacion: parsed.explicacion ?? "",
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      transcript: parsed.transcript ?? "",
    };
  } catch {
    return { ok: false, reason: "fallo al parsear JSON de Gemini" };
  }
}

// Adapter de análisis de contenido con audio nativo: Gemini transcribe, razona y busca
// en la web (google_search) en una sola llamada — reemplaza al trío
// Deepgram+MiniMax+Tavily en este rol (ver DECISIONS.md). Implementa AudioContentAnalysisPort.
export class GeminiContentAnalysisAdapter implements AudioContentAnalysisPort {
  async analizar(audioBuffer: ArrayBuffer, mimeType: string): Promise<AudioContentAnalysisResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { ok: false, reason: "GEMINI_API_KEY no configurada" };
    }

    try {
      const client = new GoogleGenAI({ apiKey });
      const base64Audio = arrayBufferABase64(audioBuffer);

      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: "Analizá este audio de llamada:" },
              { inlineData: { mimeType, data: base64Audio } },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ googleSearch: {} }],
        },
      });

      const texto = response.text;
      if (!texto) {
        return { ok: false, reason: "Gemini no devolvió contenido en la respuesta" };
      }

      return parsearRespuesta(texto);
    } catch (error) {
      // Nunca dejamos escapar una excepción cruda hacia el usecase (regla 6 de la skill).
      const reason = error instanceof Error ? error.message : "error desconocido";
      return { ok: false, reason: `fallo de red con Gemini: ${reason}` };
    }
  }
}
