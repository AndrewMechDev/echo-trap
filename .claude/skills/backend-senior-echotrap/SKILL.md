---
name: backend-senior-echotrap
description: Usar SIEMPRE que se escriba o modifique código dentro de packages/backend (funciones Convex, adapters de IA, schema). Define la arquitectura, patrones y estándares del backend de EchoTrap.
---

# Backend senior — EchoTrap (Convex + TypeScript)

## Arquitectura elegida: capas ligeras + Ports & Adapters solo para IA externa

packages/backend/convex/
├─ domain/           # tipos puros, sin dependencias externas (DetectionResult, CallEvent, Verdict)
├─ ports/             # interfaces (contratos) que definen QUÉ hace cada proveedor externo, no CÓMO
│  ├─ VoiceDetectionPort.ts     # detectar(audioBuffer) => DetectionResult
│  ├─ VoiceSynthesisPort.ts     # sintetizar(texto, voiceId) => audioBuffer
│  └─ TelephonyPort.ts          # (si se usa Vapi) iniciarLlamada(), enviarRespuesta()
├─ adapters/          # implementaciones concretas de cada port
│  ├─ TruthScanDetectionAdapter.ts          # motor remoto confirmado, señal secundaria no bloqueante
│  ├─ LocalWav2Vec2DetectionAdapter.ts      # llama por HTTP al microservicio Python (sección 8) — mismo contrato VoiceDetectionPort, fuente PRIMARIA del semáforo
│  ├─ DeepgramVoiceAdapter.ts               # síntesis de voz del honeypot (Aura TTS) — reemplaza a MiniMax, ver DECISIONS.md
│  └─ VapiTelephonyAdapter.ts               # pendiente, fuera de alcance hasta que se confirme telefonía real
├─ usecases/          # lógica de negocio pura: orquesta ports, no sabe de Convex
│  ├─ evaluarAudio.ts            # recibe buffer, usa VoiceDetectionPort, devuelve veredicto
│  └─ activarHoneypot.ts         # decide cuándo disparar el agente dilatorio
├─ schema.ts           # tablas Convex (calls, detections, alerts)
├─ detections.ts        # mutations/actions Convex — SOLO llaman a usecases, no tienen lógica propia
├─ honeypot.ts
└─ alerts.ts

## Reglas obligatorias
1. Ninguna función de Convex (`detections.ts`, `honeypot.ts`) contiene lógica de negocio directa — solo llama a un usecase y persiste el resultado.
2. Ningún `usecase` importa un SDK de proveedor externo directamente — siempre a través de un `port`.
3. Cambiar de proveedor de detección debe requerir SOLO cambiar qué adapter se inyecta, no tocar `usecases/` ni `detections.ts`.
4. Todas las API keys se leen server-side (`process.env` / Convex env vars) — NUNCA se exponen al cliente. Si una función necesita una key, se implementa como Convex `action` (no `query`), porque las actions pueden hacer llamadas externas.
5. Validar toda entrada externa (audio, payloads de webhook) con `zod` antes de procesarla.
6. Manejo de errores: cada adapter debe capturar fallos de su proveedor y devolver un resultado tipado (`{ ok: false, reason: string }`), nunca dejar que una excepción cruda llegue al usecase.
7. Nombrar archivos y funciones en inglés (convención de código), pero comentarios y mensajes de commit en español.
8. No agregar autenticación de roles compleja, paneles admin, ni features fuera del MVP definido en el brief del hackathon — si algo no está en el MVP, no se construye (ver sección "Fuera de alcance" abajo).
9. **NO se implementa login/autenticación de usuarios en este hackathon.** Clerk no se activa. Si se necesita guardar un "contacto de confianza" para las alertas, se guarda sin usuario asociado (campo libre en la UI, persistido en Convex).
9.1. **Voz del honeypot: Deepgram (Aura TTS), no MiniMax.** MiniMax queda fuera del código en vivo — solo se usa manualmente/offline para generar el clip de prueba de voz clonada (el ataque simulado), eso no es parte de este repo. `DeepgramVoiceAdapter` implementa `VoiceSynthesisPort` con la key `DEEPGRAM_API_KEY` (una sola key, sin group id ni voice model id).
9.2. **Alertas sin n8n por ahora.** El MVP usa un popup en la UI: `alerts.ts` solo persiste en la tabla `alerts` (mutation `crearAlerta`) y expone una query para que el frontend la lea reactivo. El webhook de n8n es una skill/feature futura, se implementa SOLO si el humano lo pide explícitamente — no asumir que hay que integrarlo todavía.
10. **Motor remoto confirmado: TruthScan** (no se evalúan alternativas de pago como Resemble o AI or Not — decisión del equipo por límite de créditos). Reality Defender queda eliminado del flujo por completo (>10min de latencia en pruebas), no se implementa su adapter. `evaluarAudio.ts` **nunca debe esperar indefinidamente a ningún motor remoto**.
10.1. **CAMBIO DE ARQUITECTURA (2026-08-29, ver DECISIONS.md): TruthScan pasa a definir el VEREDICTO FINAL, no es solo un bono.** Calibración real con audio del equipo mostró que el motor local (wav2vec2) da falsos positivos frecuentes con voces reales, mientras que TruthScan clasificó correctamente todos los casos probados. A cambio, TruthScan es lento en la práctica: su API real es un flujo de 4 pasos (URL pre-firmada → subir audio → `/detect` → sondear `/query`) que en pruebas tardó **~7s de punta a punta**, no los <1s que se podía asumir de una API síncrona simple.
    - **Motor local sigue respondiendo primero (margen 3s)** — define un semáforo **PROVISORIO** que se persiste en Convex apenas llega, para que el usuario vea algo rápido.
    - **TruthScan corre en paralelo desde el arranque, con margen ampliado a 9s** — cuando responde a tiempo, define el semáforo **FINAL** (pisa al provisorio). Si no llega a tiempo, el provisorio del motor local se confirma como final sin más espera.
    - Implementación real en `detections.ts`: arrancar `localPromise` y `remotoPromise` en paralelo (ambas envueltas en `conTimeout` de `usecases/evaluarAudio.ts`), esperar `local` primero y persistir el veredicto provisorio (`insertarDeteccion`, source `"local"`), después esperar `remoto` (ya viene corriendo) y persistir el veredicto final (source `"truthscan"` si llegó a tiempo, `"local-final"` si no). El frontend lee `listarDeteccionesPorLlamada` reactivo — la fila más reciente por `timestamp` es siempre la que corresponde mostrar.
    - Umbrales en `domain/thresholds.ts`, sin cambios tras la calibración inicial:
      ```ts
      export const SCAM_THRESHOLD = {
        HIGH_CONFIDENCE: 70,
        SUSPICIOUS: 45,
      };
      ```
      Confirmados con audio real: voz real del equipo (WAV sin comprimir) → score ~0, voz clonada (MiniMax) → score ~49, ambos casos calzan bien contra `SUSPICIOUS: 45`. **Usar siempre WAV/M4A para grabar pruebas, nunca MP3** — la compresión lossy generaba falsos positivos masivos (99.99% "fake" para cualquier audio, incluso real) en el motor local.

## Fuera de alcance para este hackathon (NO construir)
- Telefonía real entrante (Vapi con número público) salvo que el humano lo pida explícitamente tras validar la demo de 2 teléfonos.
- Login / autenticación de usuarios (Clerk queda instalable pero desactivado; ver punto 9 arriba).
- Roles de usuario / multi-tenant.
- Entrenar o reentrenar cualquier modelo de detección — solo se usan modelos ya entrenados, nunca se ajustan sus pesos.
- Tests automatizados exhaustivos (solo pruebas manuales rápidas del flujo crítico).
- Cualquier persistencia de audio de terceros sin consentimiento explícito.
