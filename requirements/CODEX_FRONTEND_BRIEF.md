# EchoTrap — Brief para Codex (frontend, `apps/web`)

> **Cómo usar este archivo:** pegalo como primer mensaje a Codex, con su mejor modelo disponible, parado en la rama `feature/frontend` del repo `echo-trap`. Pedile explícitamente: *"Leé este brief completo y los archivos que indica en la sección 0 antes de escribir una sola línea. No toques nada fuera de `apps/web/` ni de `packages/shared/` sin preguntar."*

---

## 0. Léase primero — en este orden, antes de tocar código

1. `CLAUDE.md` (raíz) — contexto general del proyecto, decisiones originales del hackathon.
2. `DECISIONS.md` (raíz) — **fuente de verdad actual**, tiene el historial completo de cambios de arquitectura (varios superan lo que dice `CLAUDE.md`). Presta especial atención a:
   - El motor de detección local (Hugging Face) fue descartado por completo — TruthScan es la única fuente.
   - **TruthScan exige mínimo 4 segundos de audio** por chunk — con clips más cortos el resultado no es confiable. Esto es una restricción DURA para la captura de audio del frontend.
   - MiniMax NO se usa para voz (eso lo hace Deepgram) — solo para razonamiento de texto en el análisis de contenido.
3. `.claude/skills/frontend-senior-echotrap/SKILL.md` — **la skill operativa de este trabajo**. Define arquitectura de componentes, reglas de código, qué librerías usar/no usar, y la sección "Sistema de diseño" con los tokens concretos (color semántico, tipografía, spacing, el gradiente "Chrome Inferno" y dónde va exactamente).
4. `.claude/skills/git-commits-es/SKILL.md` y `.claude/skills/gitflow-echotrap/SKILL.md` — formato de commits (español, Conventional Commits) y reglas de rama (trabajar solo en `feature/frontend`, comitear seguido, nunca mergear sin preguntar).
5. `requirements/ux-ui.txt` — documento fuente completo de principios UI/UX (ya destilado en la skill del punto 3, pero consultar acá si hace falta más detalle).
6. `packages/backend/convex/schema.ts` — las 4 tablas reales: `calls`, `detections`, `alerts`, `contentAnalysis`.
7. `packages/shared/src/types.ts` — tipos compartidos: `DetectionResult`, `Verdict` ("verde"|"amarillo"|"rojo"), `ContentVerdict`, `ContentSource`, etc.
8. Las funciones de Convex que el frontend va a consumir (leer las cabeceras/comentarios de cada archivo, no hace falta memorizar la implementación interna):
   - `packages/backend/convex/calls.ts` — `crearLlamada` (mutation), `obtenerLlamada` (query)
   - `packages/backend/convex/detections.ts` — `evaluarAudioAction` (action, se llama por cada chunk de audio ≥4s), `listarDeteccionesPorLlamada` (query reactiva)
   - `packages/backend/convex/contenido.ts` — `obtenerAnalisisContenidoPorLlamada` (query reactiva; el análisis en sí se dispara solo desde el backend, el frontend nunca lo llama directo)
   - `packages/backend/convex/alerts.ts` — `listarAlertasPorLlamada` (query reactiva; la creación de alertas también la encadena el backend solo)
   - `packages/backend/convex/honeypot.ts` — el audio dilatorio viene incluido en la respuesta de `evaluarAudioAction` (campo `honeypotAudio`, `ArrayBuffer`), el frontend NO llama a `activarHoneypotAction` directamente
9. `apps/web/lib/audio/convertToWav.ts` — YA EXISTE, hecho por otro compañero. Convierte cualquier audio que el navegador pueda decodificar a WAV PCM 16-bit sin ffmpeg (usa la Web Audio API nativa). Usarlo tal cual, no reescribirlo.

---

## 1. Qué hay hecho y qué falta

**Backend: 100% completo y probado end-to-end** (incluye detección con TruthScan, honeypot con Deepgram, análisis de contenido con MiniMax+Tavily, alertas). No tocar `packages/backend/` salvo que sea estrictamente necesario y se avise antes.

**Frontend: solo el skeleton de la Fase 0**, sin implementar:
```
apps/web/
├─ app/layout.tsx        # placeholder mínimo
├─ app/manifest.ts        # PWA manifest, stub
├─ app/page.tsx           # placeholder "en construcción"
├─ components/
│  ├─ Semaphore.tsx        # stub vacío
│  ├─ Timeline.tsx         # stub vacío
│  └─ EchoTrapPanel.tsx    # stub vacío
└─ lib/audio/
   ├─ worklet.ts           # stub vacío
   ├─ vad.ts               # stub vacío
   ├─ downsample.ts        # stub vacío
   └─ convertToWav.ts      # REAL, ya implementado — no tocar
```

---

## 2. Qué construir

### 2.1 `ConvexProvider`
Conectar Convex en `app/layout.tsx` usando `NEXT_PUBLIC_CONVEX_URL` (ya está en `apps/web/.env.local`). Todo el estado que viene del backend se lee con `useQuery`/`useMutation`/`useAction` de `convex/react` — reactivo, nunca polling manual.

### 2.2 Captura de audio + envío
- `lib/audio/worklet.ts` / `vad.ts` / `downsample.ts`: captura real de audio del micrófono (`getUserMedia` + `AudioWorklet`), con detección de actividad de voz (VAD) para no mandar silencio.
- **Regla dura de `DECISIONS.md`: cada chunk enviado a evaluar debe durar al menos 4 segundos** (TruthScan rechaza clips más cortos). Acumular audio hasta ese mínimo antes de convertir y enviar.
- Pasar el chunk capturado por `convertToWav()` (ya existe) antes de mandarlo a `evaluarAudioAction`.
- Toda esta lógica vive en `lib/audio/`, separada de los componentes React — los componentes solo consumen un hook (`useAudioDetection()` o similar), nunca manipulan el `AudioContext` directamente (regla 3 de la skill).

### 2.3 Flujo de una llamada
1. Al iniciar: `crearLlamada` (mutation) con `contactoConfianza` opcional (campo de texto libre, sin login — ver `CLAUDE.md` sección 8).
2. Por cada chunk de audio (≥4s): `evaluarAudioAction`.
3. UI reactiva vía `useQuery`:
   - `listarDeteccionesPorLlamada` → semáforo (última fila por timestamp es el estado a mostrar)
   - `listarAlertasPorLlamada` → popup de alerta cuando aparece una fila nueva
   - `obtenerAnalisisContenidoPorLlamada` → panel de contenido/fact-checking cuando aparece
4. Si `evaluarAudioAction` devuelve `honeypotAudio` (viene cuando el veredicto dio rojo), reproducirlo — es la respuesta dilatoria de EchoTrap.

### 2.4 Componentes
- **`Semaphore.tsx`** — 🟢🟡🔴 con ícono (vía `morphicons`, ver skill) + texto, nunca solo color. Es el único elemento con licencia para "alarmar" en toda la app (ver sección "Sistema de diseño" de la skill).
- **`Timeline.tsx`** — historial de detecciones de la llamada (usa `ui-ux-pro-max-skill`).
- **`EchoTrapPanel.tsx`** — panel del honeypot: reproduce el audio dilatorio, muestra transcripción si está disponible.
- **Popup de alertas** — sin n8n, solo UI (ver `DECISIONS.md`).
- **Panel de análisis de contenido** — muestra `veredicto`, `explicacion` y `sources` (con links reales) de `contentAnalysis`, aparte del semáforo acústico (son dos señales independientes, nunca se fusionan).
- **Hero/landing** — pantalla de bienvenida antes de iniciar, con el fondo "Chrome Inferno" (spec completo en la skill, sección "Hero / landing"). El dashboard en vivo NO lleva este gradiente.

### 2.5 PWA
Completar `app/manifest.ts` (nombre "EchoTrap", instalable). Mobile-first real: el semáforo debe verse sin scroll en la pantalla principal en mobile.

---

## 3. Librerías a instalar (ver tabla completa en la skill, no reinventar)
- `morphicons` (`pnpm add morphicons`)
- Plugin `ui-ux-pro-max-skill` — si no está instalado, avisar al humano (requiere `/plugin marketplace add` + `/plugin install`, no se puede scriptear).
- `emilkowalski/skills` sub-skills `animate` y `pick-ui-library` si no están.
- Todo con **pnpm**, nunca npm/yarn.

---

## 4. Reglas no negociables
- Comentarios en español, nombres de código en inglés.
- Todo texto de la UI en español.
- Commits en español, formato Conventional Commits (ver skill de commits), frecuentes — cada pieza chica que funcione, se comitea.
- Trabajar SOLO en `feature/frontend`. Nunca mergear a `main` ni a otra rama sin preguntar explícitamente y mostrar el resumen de commits.
- No implementar login/autenticación (fuera de alcance, ver `CLAUDE.md` sección 8).
- No tocar `packages/backend/` — si encontrás algo que necesitás cambiar ahí, parar y avisar en vez de modificarlo directo.
- No usar n8n, Vapi ni MiniMax-para-voz — están descartados/fuera de alcance (ver `DECISIONS.md`).

---

## 5. Al terminar cada pieza funcional
Comitear siguiendo la skill de commits, y avisar qué quedó funcionando antes de seguir con la próxima — no acumular una sesión entera sin checkpoints.
