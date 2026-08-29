// Script de prueba manual: ejecuta el flujo completo (crear llamada -> evaluar audio ->
// leer detecciones) contra el deployment real de Convex, sin necesidad de frontend.
// Uso: pnpm --filter @echo-trap/backend test:flow <ruta-al-audio.wav> [contactoConfianza]
import { readFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const CONVEX_URL = "https://brilliant-ocelot-618.convex.cloud";

async function main() {
  const audioPath = process.argv[2];
  const contactoConfianza = process.argv[3];

  if (!audioPath) {
    console.error("Uso: pnpm --filter @echo-trap/backend test:flow <ruta-al-audio.wav> [contactoConfianza]");
    process.exit(1);
  }

  const client = new ConvexHttpClient(CONVEX_URL);

  console.log(`\n📞 Creando llamada...`);
  const callId: Id<"calls"> = await client.mutation(api.calls.crearLlamada, {
    contactoConfianza,
  });
  console.log(`   callId: ${callId}`);

  const audioBuffer = readFileSync(audioPath);
  console.log(`\n🎙️  Evaluando audio: ${audioPath} (${audioBuffer.length} bytes)`);

  const t0 = Date.now();
  const resultado = await client.action(api.detections.evaluarAudioAction, {
    callId,
    audioBuffer: audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength),
    mimeType: "audio/wav",
    duracionMs: 1,
  });
  const t1 = Date.now();

  console.log(`\n✅ Resultado (${t1 - t0}ms total):`);
  console.log(JSON.stringify(resultado, null, 2));

  console.log(`\n📋 Detecciones persistidas para esta llamada:`);
  const detecciones = await client.query(api.detections.listarDeteccionesPorLlamada, { callId });
  console.table(detecciones);

  // evaluarAudioAction ya encadena honeypot + alerta + análisis de contenido
  // internamente cuando corresponde — no hace falta (ni conviene) dispararlos de nuevo.
  if (resultado.ok && resultado.veredicto === "rojo") {
    console.log(`\n🍯 Honeypot encadenado por el backend:`);
    console.log(
      resultado.honeypotAudio
        ? `   audio dilatorio generado (${resultado.honeypotAudio.byteLength} bytes)`
        : `   no se generó audio (revisar reason en el resultado de arriba)`
    );

    console.log(`\n🚨 Alertas persistidas para esta llamada:`);
    const alertas = await client.query(api.alerts.listarAlertasPorLlamada, { callId });
    console.table(alertas);
  }

  if (resultado.ok && resultado.contentAnalysisTriggered) {
    console.log(`\n🕵️  Análisis de contenido disparado (corre en background, puede tardar hasta 30s)...`);
    console.log(`   Consultá manualmente con: api.contenido.obtenerAnalisisContenidoPorLlamada({ callId: "${callId}" })`);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
