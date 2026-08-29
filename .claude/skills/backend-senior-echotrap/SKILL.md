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
│  ├─ TelephonyPort.ts          # (si se usa Vapi) iniciarLlamada(), enviarRespuesta()
│  ├─ TranscriptionPort.ts      # transcribir(audioBuffer, mimeType) => TranscriptionResult
│  ├─ ContentAnalysisPort.ts    # analizar(transcript) => ContentAnalysisResult
│  └─ WebSearchPort.ts          # buscar(query) => WebSearchResult — usado vía function-calling desde ContentAnalysisPort
├─ adapters/          # implementaciones concretas de cada port
│  ├─ TruthScanDetectionAdapter.ts          # ÚNICA fuente de detección ACÚSTICA de voz clonada (ver regla 10 — motor local descartado)
│  ├─ DeepgramVoiceAdapter.ts               # síntesis de voz del honeypot (Aura TTS) — reemplaza a MiniMax, ver DECISIONS.md
│  ├─ DeepgramTranscriptionAdapter.ts       # voz a texto (STT, /v1/listen) — paso previo al análisis de contenido
│  ├─ MiniMaxContentAnalysisAdapter.ts      # razona sobre el TEXTO transcripto (M3 no acepta audio directo) + loop de tool-calling con WebSearchPort para fact-checking real
│  ├─ TavilyWebSearchAdapter.ts             # búsqueda real (créditos sponsor) — Gemini quedó descartado para esto (grounding no disponible en plan gratis, ver DECISIONS.md)
│  └─ VapiTelephonyAdapter.ts               # pendiente, fuera de alcance hasta que se confirme telefonía real
├─ usecases/          # lógica de negocio pura: orquesta ports, no sabe de Convex
│  ├─ evaluarAudio.ts            # recibe buffer, usa VoiceDetectionPort, devuelve veredicto ACÚSTICO (semáforo) + requiereAnalisisContenido(veredicto)
│  ├─ activarHoneypot.ts         # decide cuándo disparar el agente dilatorio (debeActivarHoneypot)
│  └─ analizarContenido.ts       # transcribir → analizar (con búsqueda), devuelve veredicto de CONTENIDO (campo separado, ver DECISIONS.md)
├─ schema.ts           # tablas Convex (calls, detections, alerts, contentAnalysis)
├─ detections.ts        # evaluarAudioAction: evalúa y persiste; si da amarillo/rojo, encadena honeypot + alerta + análisis de contenido (ver regla 10 y 11)
├─ contenido.ts          # análisis de contenido (transcripción + MiniMax + Tavily) — mismo patrón que detections.ts, tabla separada, no toca el semáforo acústico
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
9.1. **Voz del honeypot: Deepgram (Aura TTS), no MiniMax.** `DeepgramVoiceAdapter` implementa `VoiceSynthesisPort` con la key `DEEPGRAM_API_KEY` (una sola key, sin group id ni voice model id). **MiniMax sí volvió al código en vivo (ver regla 11), pero SOLO como razonamiento de texto (M3) para el análisis de contenido — nunca para voz/clonación.** No confundir los dos usos: para generar el clip de prueba de voz clonada (el ataque simulado) se sigue usando MiniMax Speech manualmente/offline, fuera de este repo.
9.2. **Alertas sin n8n por ahora.** El MVP usa un popup en la UI: `alerts.ts` solo persiste en la tabla `alerts` (mutation `crearAlerta`) y expone una query para que el frontend la lea reactivo. El webhook de n8n es una skill/feature futura, se implementa SOLO si el humano lo pide explícitamente — no asumir que hay que integrarlo todavía.
10. **CAMBIO DE ARQUITECTURA (2026-08-29, ver DECISIONS.md): TruthScan es el ÚNICO motor de detección.** Se descartó por completo el motor local de Hugging Face (`wav2vec2`, corría como microservicio Python aparte) — daba falsos positivos frecuentes con voces reales del equipo en pruebas reales (99.99% "fake" en voz real limpia, sin explicación de bug de código). TruthScan clasificó correctamente todos los casos probados. Ya no hay `services/detection-py/`, ni `ffmpeg`, ni túnel de `cloudflared` — todo eso se elimina del proyecto. Reality Defender también queda eliminado del flujo (>10min de latencia en pruebas de antes), no se implementa su adapter.
    - `evaluarAudio.ts` **nunca debe esperar indefinidamente** a TruthScan — se envuelve con `conTimeout` (`usecases/evaluarAudio.ts`) con margen de **12s** (su flujo real de 4 pasos — presigned URL → subir audio → `/detect` → sondear `/query` — tardó ~7s de punta a punta en pruebas; el propio adapter ya sondea internamente hasta ~4.2s de eso, el margen externo es la red de seguridad).
    - Si TruthScan no responde a tiempo o falla, **no hay veredicto** — `evaluarAudio` devuelve `{ ok: false, reason }`, se informa el error (la UI debe manejar ese caso — reintentar o mostrar "no se pudo evaluar"), nunca se inventa un resultado ni se cae a un motor de respaldo (ya no existe uno).
    - `detections.ts` hace una sola llamada, una sola persistencia (`insertarDeteccion`, source `"truthscan"`). El frontend lee `listarDeteccionesPorLlamada` reactivo.
    - **Si el veredicto da rojo, `evaluarAudioAction` encadena automáticamente** `crearAlerta` (mutation) y `activarHoneypotAction` (usa `debeActivarHoneypot` del usecase `activarHoneypot.ts`) — el caller no tiene que orquestar esas tres llamadas por separado, alcanza con invocar `evaluarAudioAction`.
    - Umbrales en `domain/thresholds.ts`, calibrados con audio real:
      ```ts
      export const SCAM_THRESHOLD = {
        HIGH_CONFIDENCE: 70, // score de TruthScan que da rojo directo
        SUSPICIOUS: 45,      // score de TruthScan que ya amerita amarillo
      };
      ```
      TruthScan acepta WAV, MP3, M4A, FLAC, OGG, MP4 directamente (no hace falta preocuparse por compresión como con el motor local descartado).
    - **Nota de credibilidad (ver DECISIONS.md):** el "99%+ accuracy" de TruthScan es auto-reportado, y TruthScan es del mismo equipo detrás de "Undetectable AI". No sobre-confiar ciegamente; monitorear resultados reales durante el hackathon.
11. **Análisis de CONTENIDO (transcripción + razonamiento + fact-checking web) — señal separada del semáforo acústico.** Mide QUÉ se dice en la llamada (patrones de estafa, datos verificables), no si la voz es sintética — son dos veredictos independientes que se muestran juntos en la UI, nunca se fusionan ni se pisan entre sí.
    - Se dispara SOLO cuando `requiereAnalisisContenido(veredicto)` da `true` (veredicto acústico amarillo o rojo) — nunca en verde, para no gastar tiempo ni créditos de 3 APIs en cada llamada normal.
    - `detections.ts` lo dispara con `ctx.scheduler.runAfter(0, api.contenido.analizarContenidoAction, ...)`, NUNCA con `await` directo — puede tardar hasta 30s (transcripción + razonamiento + búsqueda), y no debe demorar la respuesta del semáforo acústico que ya se resolvió.
    - Pipeline: `DeepgramTranscriptionAdapter` (STT) → `MiniMaxContentAnalysisAdapter` (razona sobre el texto, M3 no acepta audio directo) → tool-calling hacia `TavilyWebSearchAdapter` cuando necesita verificar un dato real (nunca alucina fuentes, cita URLs reales o no cita nada).
    - Persiste en tabla separada `contentAnalysis` (no en `detections`), con query propia `obtenerAnalisisContenidoPorLlamada` para que el frontend la lea aparte del semáforo.
    - Keys nuevas: `MINIMAX_API_KEY` (ya existía, ahora sí se usa — solo para M3/razonamiento, ver regla 9.1) y `TAVILY_API_KEY` (nueva).

## Descartado (no reintroducir sin que el humano lo pida explícitamente)
- Motor local de detección (Hugging Face `wav2vec2`, microservicio Python, `ffmpeg`, túnel `cloudflared`) — ver regla 10.
- MiniMax como proveedor de voz del honeypot — ver regla 9.1 (Deepgram lo reemplazó). MiniMax SÍ se usa para razonamiento de texto (regla 11), esto no es una reintroducción del uso descartado.
- Gemini como motor de búsqueda web para el fact-checking — grounding no disponible en su plan gratis, se usa Tavily en su lugar (ver regla 11).

## Fuera de alcance para este hackathon (NO construir)
- Telefonía real entrante (Vapi con número público) salvo que el humano lo pida explícitamente tras validar la demo de 2 teléfonos.
- Login / autenticación de usuarios (Clerk queda instalable pero desactivado; ver punto 9 arriba).
- Roles de usuario / multi-tenant.
- Entrenar o reentrenar cualquier modelo de detección — solo se usan modelos ya entrenados, nunca se ajustan sus pesos.
- Tests automatizados exhaustivos (solo pruebas manuales rápidas del flujo crítico).
- Cualquier persistencia de audio de terceros sin consentimiento explícito.
