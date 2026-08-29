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

  if (resultado.ok && resultado.veredicto === "rojo") {
    console.log(`\n🍯 Veredicto rojo — probando honeypot...`);
    const honeypot = await client.action(api.honeypot.activarHoneypotAction, {
      callId,
      veredicto: resultado.veredicto,
    });
    console.log(honeypot.ok ? `   audio dilatorio generado (${honeypot.audioBytes.length} bytes)` : `   ${honeypot.reason}`);

    console.log(`\n🚨 Creando alerta...`);
    await client.mutation(api.alerts.crearAlerta, { callId, tipo: "veredicto_rojo" });
    const alertas = await client.query(api.alerts.listarAlertasPorLlamada, { callId });
    console.table(alertas);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
