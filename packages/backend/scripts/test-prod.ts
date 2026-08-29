// Prueba puntual y descartable: valida el flujo completo contra el deployment de
// PRODUCCION de Convex (cheerful-civet-647), no el de desarrollo — para confirmar que
// funciona de verdad antes de que el frontend se deploye a Vercel apuntando acá.
import { readFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = "https://cheerful-civet-647.convex.cloud";

async function main() {
  const client = new ConvexHttpClient(CONVEX_URL);

  console.log("📞 Creando llamada en PRODUCCIÓN...");
  const callId = await client.mutation(api.calls.crearLlamada, { contactoConfianza: "test-prod" });
  console.log(`   callId: ${callId}`);

  const audioBuffer = readFileSync("../../test-audio/clonada/voz-10-clonada.wav");
  console.log(`\n🎙️  Evaluando audio (${audioBuffer.length} bytes)...`);

  const t0 = Date.now();
  const resultado = await client.action(api.detections.evaluarAudioAction, {
    callId,
    audioBuffer: audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength),
    mimeType: "audio/wav",
    duracionMs: 1,
  });
  console.log(`\n✅ Resultado (${Date.now() - t0}ms):`, JSON.stringify(resultado, null, 2));
}

main().catch((error) => {
  console.error("ERROR:", error);
  process.exit(1);
});
