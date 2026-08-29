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
10. **Motor remoto confirmado: TruthScan** (no se evalúan alternativas de pago como Resemble o AI or Not — decisión del equipo por límite de créditos). Reality Defender queda eliminado del flujo por completo (>10min de latencia en pruebas), no se implementa su adapter. `evaluarAudio.ts` **nunca debe esperar indefinidamente a ningún motor remoto**:
    - **Motor local (`LocalWav2Vec2DetectionAdapter`) es la fuente principal y rápida** del semáforo — responde en <1-2s, determina el color inicial que ve el usuario.
    - **TruthScan es una señal secundaria de refuerzo, no bloqueante**: timeout duro y corto.
    - Implementar con `Promise.race` / `AbortController`, nunca un `await` simple sin límite de tiempo:
      ```ts
      async function conTimeout<T>(promesa: Promise<T>, ms: number): Promise<T | { ok: false; reason: "timeout" }> {
        const timeout = new Promise<{ ok: false; reason: "timeout" }>((resolve) =>
          setTimeout(() => resolve({ ok: false, reason: "timeout" }), ms)
        );
        return Promise.race([promesa, timeout]);
      }

      // en evaluarAudio.ts
      const [local, remoto] = await Promise.all([
        conTimeout(detectorLocal.detectar(audio), 3000),   // motor local: 3s de margen
        conTimeout(detectorRemoto.detectar(audio), 4000),  // TruthScan: 4s, si no responde se ignora
      ]);
      ```
    - Si TruthScan llega a tiempo → veredicto por consenso (umbrales de abajo). Si no llega a tiempo (`reason: "timeout"`) → el veredicto se basa **solo en el motor local**, sin esperar más. Si responde tarde, se puede loguear en Convex como dato adicional para el timeline, pero **nunca vuelve a cambiar el semáforo retroactivamente en medio de la demo**.
    - Usar constantes de umbral en `domain/thresholds.ts`:
      ```ts
      export const SCAM_THRESHOLD = {
        HIGH_CONFIDENCE: 70, // ambos motores de acuerdo en "sintética" (cuando TruthScan SÍ respondió a tiempo)
        SUSPICIOUS: 45,      // solo el motor local respondió (caso más común) o solo uno marca
      };
      ```
      Estos números son un punto de partida — se recalibran con pruebas de audio real del equipo; no tratarlos como definitivos.
    - **Regla general que no cambia:** el sistema está diseñado para que la demo funcione con el motor local solo. TruthScan es un bono, nunca un bloqueante.

## Fuera de alcance para este hackathon (NO construir)
- Telefonía real entrante (Vapi con número público) salvo que el humano lo pida explícitamente tras validar la demo de 2 teléfonos.
- Login / autenticación de usuarios (Clerk queda instalable pero desactivado; ver punto 9 arriba).
- Roles de usuario / multi-tenant.
- Entrenar o reentrenar cualquier modelo de detección — solo se usan modelos ya entrenados, nunca se ajustan sus pesos.
- Tests automatizados exhaustivos (solo pruebas manuales rápidas del flujo crítico).
- Cualquier persistencia de audio de terceros sin consentimiento explícito.
