# EchoTrap — Brief para Claude Code

> ⚠️ **ESTADO ACTUAL DEL PROYECTO: ver `DECISIONS.md` primero.** Este brief es el documento ORIGINAL (Fase 0) y quedó desactualizado en varios puntos — el más importante: **ya no existe el microservicio Python local** (secciones 6, 6.1, 7, 9 de abajo lo describen, pero fue descartado por completo el 2026-08-29 en favor de TruthScan como motor único). `DECISIONS.md` es la fuente de verdad actual; ante cualquier contradicción con lo que sigue en este archivo, gana `DECISIONS.md`.

> **Cómo usar este archivo:** ya están dentro de la carpeta `echo-trap/` (repo remoto ya creado, falta inicializar git local — ver Fase 0, paso 0). Guarda este archivo como `CLAUDE.md` en la raíz para que Claude Code lo lea automáticamente en cada sesión, y pégalo también como primer mensaje. Pide explícitamente: *"Lee este brief completo y ejecútalo en el orden indicado en la Fase 0. No avances de fase sin confirmar conmigo."*

---

## 0. Contexto del proyecto (para que Claude Code no pierda el hilo)

- **Nombre:** EchoTrap (alias VozGuard).
- **Qué es:** PWA que detecta en tiempo real si una voz es clonada por IA (deepfake de audio) y, si lo es, activa una capa honeypot que dilata al estafador y alerta al usuario.
- **Hackathon:** The Next Craft (Crafter Station), Track 02 — Out of the Box. 6–10 horas efectivas de desarrollo.
- **Equipo:** 2 personas trabajando en paralelo — **una persona en backend, otra en frontend** — en ramas separadas, integrando varias veces al día.
- **Gestor de paquetes:** **pnpm 11.24.0**, obligatorio en todo el repo (no usar npm/yarn en ningún script ni ejemplo).
- **Modelos/herramientas IA disponibles:**
  - **MiniMax M3** (`MiniMax-M3`, modelo de razonamiento/código/agentes, contexto de 1M tokens) — para tareas de generación de código asistida, no confundir con la voz.
  - **MiniMax Speech 2.8** (familia de voz/clonación de MiniMax) — para generar los clips de voz clonada de prueba.
  - Vapi, ElevenLabs, Convex, Clerk, Tavily, Exa, Apify, n8n Cloud Pro, Cursor, Replit — créditos de sponsor del hackathon.
- **Nota importante:** "MiniMax 3" y "MiniMax Speech 2.8" son productos distintos de la misma empresa. No los mezcles en el código ni en la documentación: **M3 = LLM de código/razonamiento**; **Speech 2.8 = voz/clonación**.
- **Asistentes de código disponibles (el equipo los tiene, úsalos según convenga):** Claude Code (este mismo, guía todo el repo vía este brief), MiniMax M3 (vía su API/chat, útil como segunda opinión o para tareas de código puntuales) y Codex. Claude Code es la herramienta principal que ejecuta este brief de punta a punta; MiniMax M3 y Codex se usan solo si el humano lo pide explícitamente para una tarea puntual (p. ej. depurar el microservicio Python de la sección 6) — no dividir el trabajo entre herramientas sin que el humano lo indique, para evitar estilos de código inconsistentes.
- **Login:** NO se implementa para el MVP del hackathon (ver decisión y justificación en la sección 8). Clerk queda mencionado solo como "camino a producción" en el pitch, no se activa en el flujo de la demo.
- **Variables de entorno:** obligatorias desde el primer commit (independientemente del login) porque se llama a APIs de pago (MiniMax, ElevenLabs, detección). Ver plantillas exactas en la sección 8.
- **Python/GPU:** el microservicio de detección local (sección 6) corre en **Python 3.11, CPU-only, sin GPU** — decisión deliberada para evitar problemas de drivers CUDA en 6–10h. Laptop de referencia del equipo: Lenovo LOQ 15IRX9 (i7-13650HX, 24GB RAM, Windows 11), con GPU dedicada NVIDIA RTX serie 30/40 — **la GPU existe pero NO se usa a propósito** para este servicio (ver justificación completa en la sección 6). Entorno de desarrollo principal: **Windows 11**, todos los comandos de terminal en este brief deben darse en su variante de PowerShell/cmd cuando el paso lo requiera (marcado explícitamente donde aplica).

---

## FASE 0 — Orden de ejecución (Claude Code debe seguir este orden y pedir confirmación entre fases)

0. **Conectar el local con el remoto** (el repo ya existe en GitHub/GitLab, falta inicializarlo localmente): `git init`, `git branch -M main`, `git remote add origin <URL-del-repo-que-ya-crearon>`, confirmar con `git remote -v`. **No hacer push todavía** — el primer push viene después del primer commit (paso 5).
1. Generar las **skills** descritas en las secciones 2 a 5 (carpetas `.claude/skills/`), y el subagente de la sección 5.1.
2. Generar el **skeleton del monorepo**, incluyendo el microservicio Python de la sección 6 (ver árbol completo en la sección 9).
3. Ejecutar el **setup de Convex** (sección 7): `npx convex dev`, copiar `NEXT_PUBLIC_CONVEX_URL`, dejar las `npx convex env set` documentadas aunque falten valores reales.
4. Crear los archivos `.env.example` y el `.gitignore`/`.gitattributes` con las reglas de la sección 8, **ANTES del primer commit**.
5. Configurar la skill de gitflow (sección 3), hacer el **primer commit**, y recién ahí `git push -u origin main`.
6. Crear las **dos ramas de trabajo** (`feature/backend` y `feature/frontend`) — **preguntar antes de crearlas** — y pushearlas también (`git push -u origin feature/backend`, `git push -u origin feature/frontend`) para que ambas queden visibles en el remoto desde el día uno.
7. Dejar un `README.md` de arranque para que cada persona sepa qué comando correr (incluyendo cómo levantar el microservicio Python).

**Regla transversal (repetir en cada fase):** después de cada cambio funcional (aunque sea pequeño), Claude Code debe **comitear** siguiendo la skill de commits, y **antes de fusionar cualquier rama, debe preguntar explícitamente "¿confirmas que hago el merge de `<rama>` a `<rama destino>`?" y esperar respuesta.** Nunca fusionar ni eliminar una rama sin confirmación humana explícita.

---

## 1. Skills a generar — resumen

Crear la carpeta `.claude/skills/` en la raíz del monorepo con estas 4 skills propias (cada una con su `SKILL.md`), más las skills externas evaluadas dentro de la sección 5 (frontend) que se instalan (no se escriben a mano).

```
.claude/skills/
├─ git-commits-es/SKILL.md
├─ gitflow-echotrap/SKILL.md
├─ backend-senior-echotrap/SKILL.md
└─ frontend-senior-echotrap/SKILL.md
```

---

## 2. Skill: `git-commits-es` (buenas prácticas de commits, en español)

**Contenido para `SKILL.md`:**

```markdown
---
name: git-commits-es
description: Usar SIEMPRE que se vaya a hacer un `git commit` en este repo. Define el formato obligatorio de mensajes de commit en español, estilo Conventional Commits adaptado.
---

# Convención de commits — EchoTrap

Todo commit sigue este formato:

  <tipo>(<alcance>): <descripción corta en español, imperativo, minúscula, sin punto final>

  [cuerpo opcional — el qué y el por qué, en español, líneas de máx. 72 caracteres]

  [pie opcional — referencias, breaking changes]

## Tipos permitidos
- feat: nueva funcionalidad visible para el usuario o el equipo
- fix: corrección de un bug
- refactor: cambio de código que no altera comportamiento
- style: formato, espacios, nombres — sin cambio de lógica
- docs: documentación (README, comentarios, este mismo brief)
- chore: configuración, dependencias, scripts, CI
- test: pruebas
- perf: mejora de rendimiento

## Alcances sugeridos (usar el que aplique)
backend, frontend, deteccion, honeypot, audio, ui, convex, pwa, deploy, skills

## Reglas obligatorias
1. Un commit = un cambio lógico. No mezclar backend y frontend en el mismo commit.
2. Descripción corta en modo imperativo: "agrega", "corrige", "conecta" — nunca "agregado" ni "agregando".
3. Si el cambio toca una API externa (MiniMax, ElevenLabs, Vapi, Resemble, etc.), mencionarla en el alcance o el cuerpo.
4. Commitear con frecuencia: cada vez que una pieza pequeña quede funcionando, se comitea. No acumular cambios grandes sin comitear.
5. Nunca usar `git commit -m` genérico tipo "cambios" o "wip" — siempre el formato de arriba.

## Ejemplos correctos
- feat(deteccion): agrega VAD con silero antes de clasificar audio
- fix(convex): corrige proxy de api key de resemble que se enviaba vacía
- refactor(backend): mueve el cliente de minimax al adapter de voz
- chore(pnpm): agrega workspace @echo-trap/shared
- docs(readme): documenta variables de entorno del backend

## Ejemplos incorrectos (no usar)
- "fix bug"
- "cambios varios"
- "wip"
- "Fixed the thing that was broken"  (en inglés, sin tipo, sin imperativo)
```

---

## 3. Skill: `gitflow-echotrap` (flujo de ramas — SIN PRs, SIN borrar ramas, con confirmación humana)

**Contenido para `SKILL.md`:**

```markdown
---
name: gitflow-echotrap
description: Usar SIEMPRE que se trabaje con ramas, merges o el estado del repositorio git de EchoTrap. Define el flujo de dos personas trabajando en paralelo sin pull requests.
---

# Flujo de ramas — EchoTrap (hackathon, 2 personas, sin PRs)

## Ramas fijas
- `main` — única rama de la que se hace deploy. Siempre debe estar en estado funcional/demostrable.
- `feature/backend` — todo el trabajo de Convex, adapters de IA, schema, lógica de detección/honeypot.
- `feature/frontend` — todo el trabajo de Next.js, PWA, UI, captura de audio, componentes.

No se crean ramas adicionales salvo que el humano lo pida explícitamente. No se usan Pull Requests (es un hackathon de 2 personas, se integra directo). NO se borran ramas en ningún momento del hackathon, ni siquiera después de fusionarlas.

## Reglas de trabajo
1. Cada persona trabaja exclusivamente en su rama (`feature/backend` o `feature/frontend`).
2. Cada cambio funcional se comitea de inmediato en esa rama, siguiendo la skill `git-commits-es`. No se espera a "terminar todo" para comitear.
3. **Antes de hacer merge de una rama a otra (o a `main`), Claude Code SIEMPRE debe preguntar explícitamente al humano y esperar una confirmación clara ("sí", "dale", "procede") antes de ejecutar el merge.** Nunca asumir que se puede fusionar automáticamente, ni siquiera si los tests o el build pasan.
4. Al pedir confirmación, mostrar: qué rama se fusiona, a cuál, y un resumen corto (con `git log --oneline`) de los commits que entrarían.
5. Si hay conflictos de merge, mostrarlos al humano y pedir instrucciones — no resolverlos por criterio propio sin avisar.
6. Sincronizar seguido: cada 1–2 horas, sugerir (sin ejecutar solo) traer los cambios de la otra rama para evitar divergencias grandes al final del hackathon.
7. `main` solo recibe merges cuando el humano confirma que ese estado es demostrable (antes del code freeze, y en checkpoints intermedios si el humano lo pide).

## Ejemplo de interacción esperada
> Claude Code: "Tengo listos 3 commits en `feature/backend` (ver abajo). ¿Confirmas que hago merge de `feature/backend` a `main`?"
> [lista de commits]
> Humano: "sí, procede"
> Claude Code: [ejecuta el merge, confirma resultado, NO borra `feature/backend`]

## Comandos de referencia (para ejecutar solo tras confirmación humana en el paso de merge)
git checkout main
git merge feature/backend --no-ff -m "merge(backend): integra detección + honeypot a main"
```

---

## 4. Skill: `backend-senior-echotrap` (arquitectura y buenas prácticas backend)

**Decisión de arquitectura (justificada, no genérica):** ni Clean Architecture completa ni Hexagonal completa — sería sobre-ingeniería para 6–10h. Se usa una **arquitectura combinada y ligera**: capas simples (dominio → aplicación → infraestructura) **más un patrón Ports & Adapters SOLO para los proveedores de IA externos** (detección de voz clonada, voz/TTS, telefonía), porque ahí sí hay un beneficio real: durante el hackathon es probable que cambien de proveedor de detección (ya pasó: Reality Defender se descartó por latencia, ahora se prueba TruthScan) o de voz (MiniMax ↔ ElevenLabs) por límites de créditos o fallos en vivo, y con adapters ese cambio es de una línea, no una reescritura.

**Contenido para `SKILL.md`:**

```markdown
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
│  ├─ TruthScanDetectionAdapter.ts          # motor remoto en pruebas actualmente — ver sección 4, regla 10
│  ├─ ResembleDetectionAdapter.ts           # alternativa no priorizada, mismo contrato — probar solo si TruthScan también falla el test cronometrado
│  ├─ LocalWav2Vec2DetectionAdapter.ts      # llama por HTTP al microservicio Python (sección 8) — mismo contrato VoiceDetectionPort, fuente PRIMARIA del semáforo
│  ├─ MiniMaxVoiceAdapter.ts
│  ├─ ElevenLabsVoiceAdapter.ts
│  └─ VapiTelephonyAdapter.ts
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
3. Cambiar de proveedor de detección (p. ej. de TruthScan a otro) debe requerir SOLO cambiar qué adapter se inyecta, no tocar `usecases/` ni `detections.ts`.
4. Todas las API keys se leen server-side (`process.env` / Convex env vars) — NUNCA se exponen al cliente. Si una función necesita una key, se implementa como Convex `action` (no `query`), porque las actions pueden hacer llamadas externas.
5. Validar toda entrada externa (audio, payloads de webhook) con `zod` antes de procesarla.
6. Manejo de errores: cada adapter debe capturar fallos de su proveedor y devolver un resultado tipado (`{ ok: false, reason: string }`), nunca dejar que una excepción cruda llegue al usecase.
7. Nombrar archivos y funciones en inglés (convención de código), pero comentarios y mensajes de commit en español.
8. No agregar autenticación de roles compleja, paneles admin, ni features fuera del MVP definido en el brief del hackathon — si algo no está en el MVP, no se construye (ver sección "Fuera de alcance" abajo).
9. **NO se implementa login/autenticación de usuarios en este hackathon.** Clerk no se activa. Si se necesita guardar un "contacto de confianza" para las alertas, se guarda sin usuario asociado (campo libre en la UI, persistido en Convex).
10. **Corrección importante (hallazgo real del equipo, 29-ago):** en pruebas propias, **Reality Defender tardó más de 10 minutos en responder** en varios audios — completamente inservible para un veredicto que debe llegar en <5s en vivo. **Se elimina del flujo por completo, no se implementa su adapter.** `evaluarAudio.ts` **nunca debe esperar indefinidamente a ningún motor remoto.** Reglas:
    - **Motor local (`LocalWav2Vec2DetectionAdapter`) es la fuente principal y rápida** del semáforo — corre en la misma red/máquina, responde en <1-2s, y es el que determina el color inicial que ve el usuario.
    - **Motor remoto actual en pruebas: TruthScan** (`truthscan.com/es/ai-voice-detector`) — es una señal secundaria de refuerzo, no bloqueante: se le da un timeout duro y corto, igual que a cualquier otro motor remoto.
    - **Nota de credibilidad sobre TruthScan (para que no se sobre-confíe, tras lo que pasó con Reality Defender):** su cifra de "99%+ accuracy" es **auto-reportada por el proveedor**, no hay benchmark independiente público que la confirme — mismo patrón que el resto de detectores comerciales evaluados en este proyecto. Además, TruthScan está construido por el mismo equipo detrás de **"Undetectable AI"**, una herramienta que ayuda a que texto generado por IA evada detectores — no descalifica a TruthScan como detector de voz, pero es un dato a tener presente al confiar ciegamente en sus resultados. **Antes de darlo por bueno, correrle exactamente el mismo test cronometrado (mismos audios, cronómetro) que ya le hicieron a Reality Defender.** El free trial de TruthScan (20,000 créditos, sin tarjeta) alcanza para ~13 minutos de audio — de sobra para ese test y para todo el hackathon.
    - **Alternativa adicional a considerar si TruthScan también falla:** AI or Not (`detection.aiornot.com`) — tiene verificación sin cuenta para pruebas rápidas y API disponible; igual de válido probarlo con el mismo cronómetro antes de integrarlo.
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
        conTimeout(detectorRemoto.detectar(audio), 4000),  // motor remoto (TruthScan): 4s, si no responde se ignora
      ]);
      ```
    - Si el motor remoto llega a tiempo → veredicto por consenso (umbrales de abajo). Si el motor remoto no llega a tiempo (`reason: "timeout"`) → el veredicto se basa **solo en el motor local**, y el semáforo lo muestra igual, sin esperar más. Si el motor remoto responde después (tarde), se puede loguear en Convex como dato adicional para el timeline, pero **nunca vuelve a cambiar el semáforo retroactivamente en medio de la demo**.
    - Usar constantes de umbral en `domain/thresholds.ts`:
      ```ts
      export const SCAM_THRESHOLD = {
        HIGH_CONFIDENCE: 70, // ambos motores de acuerdo en "sintética" (cuando el remoto SÍ respondió a tiempo)
        SUSPICIOUS: 45,      // solo el motor local respondió (caso más común según lo observado) o solo uno marca
      };
      ```
      Estos números son un punto de partida — el humano los recalibra con pruebas de audio real del equipo (proceso de simulación ya acordado); no tratarlos como definitivos.
    - **Regla general que ya no cambia pase lo que pase con el motor remoto:** el sistema está diseñado para que la demo funcione con el motor local solo. No hay que seguir buscando indefinidamente "el detector remoto perfecto" — cualquiera que pase el test cronometrado sirve como bono, y si ninguno pasa, la demo sigue siendo válida solo con el motor local.

## Fuera de alcance para este hackathon (NO construir)
- Telefonía real entrante (Vapi con número público) salvo que el humano lo pida explícitamente tras validar la demo de 2 teléfonos.
- Login / autenticación de usuarios (Clerk queda instalable pero desactivado; ver punto 9 arriba).
- Roles de usuario / multi-tenant.
- Entrenar o reentrenar cualquier modelo de detección — solo se usan modelos ya entrenados (por API o el modelo local de la sección 8), nunca se ajustan sus pesos.
- Tests automatizados exhaustivos (solo pruebas manuales rápidas del flujo crítico).
- Cualquier persistencia de audio de terceros sin consentimiento explícito (ver consideraciones éticas del proyecto).
```

---

## 5. Skill: `frontend-senior-echotrap` (buenas prácticas frontend + evaluación de repos externos)

**Contenido para `SKILL.md`:**

```markdown
---
name: frontend-senior-echotrap
description: Usar SIEMPRE que se escriba o modifique código dentro de apps/web (Next.js, componentes, PWA, captura de audio). Define estándares de código y qué skills/librerías de diseño externas usar y cuáles evitar.
---

# Frontend senior — EchoTrap (Next.js 15 + React 19 + PWA)

## Principios
1. Componentes pequeños y con una sola responsabilidad. El semáforo (🟢🟡🔴), el timeline de scores y el panel de honeypot son componentes separados, no un solo archivo gigante.
2. Todo estado que viene del backend se lee con `useQuery` de Convex (reactivo) — no hacer polling manual ni `setInterval` para refrescar datos.
3. El procesamiento de audio (AudioWorklet, VAD) vive en `lib/audio/`, separado de los componentes React — los componentes solo consumen hooks (`useAudioDetection()`), no manipulan el AudioContext directamente.
4. Mobile-first: se prueba y diseña primero para el celular que se usará en la demo, no para desktop.
5. Accesibilidad mínima: contraste correcto en el semáforo (no depender solo del color — agregar ícono/texto), textos en español.
6. Todo texto de la interfaz en español (el hackathon y el jurado son hispanohablantes).

## Librerías/skills externas evaluadas — QUÉ USAR Y QUÉ NO

Instalar solo lo de la columna "Usar". No instalar nada de la columna "No usar" para no gastar tiempo ni generar conflictos de estilo entre skills.

| Herramienta | Veredicto | Por qué | Cómo instalar |
|---|---|---|---|
| `nextlevelbuilder/ui-ux-pro-max-skill` | **Usar** | Es la única con soporte real para paneles con datos, charts y dashboards (25 tipos de gráfico) — justo lo que necesita el timeline de scores y el semáforo. Tiene plugin nativo para Claude Code. | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` luego `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill` dentro de Claude Code |
| `guillermolg00/morphicons` | **Usar** | Encaja perfecto con el semáforo: el ícono puede *morphear* de "escuchando" → "alerta" → "seguro" con física de resorte, en vez de solo cambiar de color. Cero dependencias, ~7 KB. Compatible con React 19 y con los íconos de Lucide que ya vas a usar. | `pnpm add morphicons` (importar `morphicons/react`) |
| `Nutlope/hallmark` | **Usar, pero SOLO si se construye una landing/página de pitch aparte** | Es anti-slop para páginas de marketing/landing (57 gates de calidad), no para dashboards de datos — no usarlo dentro de la app principal, sí para una página pública de presentación del proyecto si sobra tiempo. | Copiar `SKILL.md` + `references/` al repo, o clonar y usar en Claude Code/Cursor/Codex |
| `emilkowalski/skills` (selectivo: `animate`, `pick-ui-library`) | **Usar, solo esas dos sub-skills** | `animate` da criterio correcto de curvas/duración para la animación del semáforo (evitar animaciones "genéricas de IA"). `pick-ui-library` evita instalar componentes abandonados o reinventar un toast. No instalar `animate-expo` (es para React Native, no aplica) ni `write-swift`. | `npx skills@latest add emilkowalski/skills --skill animate` y `--skill pick-ui-library` |
| `pbakaus/impeccable` | **Usar al final, como auditoría, no durante la construcción** | Es un detector de "AI slop" (gradientes morados genéricos, Inter en todo, cards anidadas) — correrlo en la hora de pulido (fase 5 del plan), no antes, para no perder tiempo iterando prematuramente. | `npx impeccable audit` sobre `apps/web` en la fase de pulido |
| `Leonxlnx/taste-skill` | **No usar en el dashboard principal — evaluar solo si hay landing aparte** | Su propio changelog dice explícitamente que NO está pensado para dashboards, tablas de datos ni UIs realtime — que es exactamente lo que es EchoTrap. Usarlo generaría fricción con `ui-ux-pro-max`. Si se hace una landing de pitch separada, ahí sí podría aportar (pero prioriza `hallmark` para eso, que sí tiene 57 checks de calidad). | No instalar por defecto |
| `reicon.dev` (librería de íconos) | **No usar** | Ya se cubre con `lucide-react` (que además es la base que consume `morphicons`) — sumar una segunda librería de íconos solo genera inconsistencia visual sin necesidad real. | No instalar |
| `gooey.jakubantalik.com` (Liquid Gooey) | **No usar en el MVP — opcional solo si sobra tiempo en la última hora** | Es un efecto visual bonito (deformación líquida) pero no aporta a la claridad del mensaje del semáforo; puede distraer del "wow" real (la detección funcionando). Considerarlo únicamente como micro-detalle en el botón de activar EchoTrap, nunca como bloqueo de tiempo. | `pnpm add liquid-gooey` — solo si hay tiempo extra |
| `auragradients.vercel.app` (generador de gradientes) | **Usar, pero como herramienta puntual, no como dependencia** | Es una web que genera CSS de gradiente — se usa una vez para elegir el fondo del semáforo/hero y se copia el CSS resultante. No se instala nada. | Copiar el CSS generado directamente, sin agregar el paquete al proyecto |
| `microsoft/playwright-cli` | **No priorizar — solo si sobra la última hora** | Playwright es una herramienta real y madura de Microsoft para pruebas E2E de navegador, pero para 6–10h de hackathon el tiempo rinde más en pulir la demo real que en automatizar tests. Dejarlo solo como opción de QA rápida (probar que `getUserMedia` y el flujo de detección no rompan) si el equipo termina antes de tiempo. | `pnpm add -D @playwright/test` — opcional, fase de pulido únicamente |

## Reglas de instalación
- Todo se instala con **pnpm**, nunca `npx create-*` con npm ni yarn.
- Antes de instalar cualquier skill externa nueva, revisar si ya existe una carpeta `.claude/skills/<nombre>` para no duplicar.
- Si dos skills dan indicaciones contradictorias sobre el mismo componente (por ejemplo, paleta de color), prevalece `ui-ux-pro-max-skill` por ser la más completa para este tipo de producto (dashboard con datos en vivo), y se debe avisar al humano de la contradicción detectada.
```

---

## 5.1 ¿Más skills o subagentes? — Uno solo, justificado; el resto sería sobre-ingeniería

Evalué si conviene sumar más skills o subagentes de Claude Code (que sí es una función real y documentada: archivos markdown en `.claude/agents/` con frontmatter `name`/`description`/`tools`/`model`, que Claude Code delega automáticamente según la descripción). Para 2 personas en 6-10h, más de un puñado de piezas nuevas es ruido, no ayuda. **Se agrega solo uno:**

`.claude/agents/qa-pre-merge.md`:
```markdown
---
name: qa-pre-merge
description: Usar SIEMPRE antes de un merge a main (ver skill gitflow-echotrap), para revisar en un contexto aislado que no se cuelen problemas de seguridad, alcance o scope creep.
tools: Read, Grep, Glob
model: haiku
---

Eres un revisor de QA rápido y estricto para el proyecto EchoTrap. Antes de que se apruebe un merge a `main`, revisa el diff de la rama contra `main` y verifica, en una lista corta:

1. Ninguna API key aparece hardcodeada en el código (deben venir de `process.env` / Convex env vars).
2. Ninguna función Convex de tipo `query` hace llamadas HTTP externas (deben ser `action`).
3. No se agregó login/autenticación de usuario (está fuera de alcance, ver brief).
4. No se agregó código para entrenar o reentrenar ningún modelo (fuera de alcance).
5. Los mensajes de commit del rango siguen el formato de `git-commits-es`.

Devuelve una lista corta de hallazgos (o "sin hallazgos") — no corrijas nada tú mismo, solo repórtalo al agente principal para que lo muestre al humano antes del merge.
```

Por qué solo este y no más: usa `model: haiku` para que sea barato y rápido (no necesita razonamiento profundo, solo un checklist), corre en un contexto aislado para no ensuciar la conversación principal con el diff completo, y se activa justo en el punto de mayor riesgo (el merge) que ya definimos en la skill de gitflow. No se agregan subagentes para frontend/backend por separado — dividir el trabajo en subagentes ahí no aporta nada que las skills `backend-senior-echotrap`/`frontend-senior-echotrap` no cubran ya, y sumaría complejidad de coordinación innecesaria para 2 personas trabajando directamente en sus ramas.

---

## 5.2 Memoria persistente ("Engram") — evaluación honesta

**"Engram" no es un producto único — es un nombre que usan varios servidores MCP distintos y no relacionados entre sí** (verificado: al menos `rawcontext/engram-claude-plugin`, `bencrooks-dev/engram`, `engram.fyi`, `engram-mcp.com` y el servicio hosteado de `lumetra.io` comparten el nombre pero son proyectos separados, con setups distintos). Antes de instalar cualquiera, hay que confirmar en su propio sitio cuál es exactamente, porque los comandos de instalación no son intercambiables entre ellos.

**Qué problema resuelve realmente:** que Claude Code "olvide" decisiones y hallazgos tomados en una sesión anterior (por ejemplo, el hallazgo de hoy de que Reality Defender tarda >10 min y se eliminó del flujo) cuando se abre una sesión nueva o el otro compañero retoma el proyecto.

**Decisión para el hackathon: opcional, y de baja prioridad frente al resto.** El `CLAUDE.md` (que ya es este brief guardado en la raíz) ya cubre la mayor parte del contexto persistente porque Claude Code lo relee automáticamente en cada sesión. Lo único que un sistema tipo Engram añadiría es capturar automáticamente los **hallazgos nuevos que surgen durante el desarrollo** (como el de Reality Defender) sin que alguien tenga que escribirlos a mano.

**Alternativa de cero-fricción (recomendada primero, sin dependencias externas ni cuentas):** un archivo `DECISIONS.md` en la raíz, donde después de cada hallazgo o decisión importante se agrega una línea con fecha:
```markdown
## 2026-08-29
- Reality Defender tarda >10min en responder en pruebas propias — descartado por completo para el flujo en vivo, no se implementa su adapter. Motor local pasa a ser la fuente primaria del semáforo.
- Se prueba TruthScan como motor remoto secundario (free trial, 20,000 créditos sin tarjeta). Pendiente correrle el mismo test cronometrado que a Reality Defender antes de confiar en sus resultados.
```
Esto logra el 90% del beneficio de una memoria persistente, sin firmar en ningún servicio nuevo ni gastar minutos de setup en medio del hackathon. **Pedirle a Claude Code que actualice `DECISIONS.md` cada vez que se tome una decisión de arquitectura o se descubra algo como lo de Reality Defender hoy.**

**Si de todas formas quieren probar un Engram real** (por ejemplo el local-first de `engram-mcp.com`, que no requiere cuenta), la regla es: **si el setup toma más de 10 minutos o pide crear una cuenta con demora de verificación, se abandona y se sigue con `DECISIONS.md`** — no vale la pena arriesgar tiempo de hackathon en una herramienta de memoria cuando el propio problema que resuelve (continuidad entre sesiones) ya está cubierto en un 90% por este mismo brief.

---

## 6. Servicio Python del modelo open source (motor de detección local, sin entrenamiento)

**No hay que entrenar nada.** El modelo `MelodyMachine/Deepfake-audio-detection-V2` en Hugging Face (verificado: licencia **Apache-2.0**, arquitectura **wav2vec2-base** afinado por `motheecreator/Deepfake-audio-detection`, 94.6M parámetros, pesos en `safetensors`, accuracy **99.73% auto-reportada en su propio set de evaluación** — tratar esa cifra como orientativa, no como garantía en audio degradado por altavoz) **ya está entrenado**. El trabajo del equipo es solo cargarlo y usarlo para inferencia.

**Dato técnico clave que cambia el plan anterior:** este modelo se distribuye en formato **PyTorch/Transformers (Python)**, no hay pesos ONNX oficiales publicados por el autor. Convertirlo a ONNX para correrlo en el navegador es un paso extra y riesgoso para 6–10h. **La ruta segura es correrlo como un microservicio Python aparte**, separado del monorepo de pnpm (pnpm no gestiona Python), y que el backend de Convex lo llame por HTTP como un adapter más — exactamente igual que llama a TruthScan, gracias al patrón Ports & Adapters ya definido.

### Versión de Python y CPU/GPU — decisión explícita (confirmado con las specs reales del equipo)
- **Python 3.11 confirmado disponible** en la laptop principal (Lenovo LOQ 15IRX9, Windows 11) vía el launcher `py` (`py -3.11`). Es exactamente la versión recomendada — compatible con `transformers==4.46.*`. Usar siempre `py -3.11`, nunca `python` a secas (en Windows con varias versiones instaladas —3.11, 3.12, 3.13, 3.14, como es el caso aquí— `python` puede resolver a la 3.14 y romper compatibilidad con dependencias de ML que todavía no la soportan bien).
- **CPU, no GPU — aunque la laptop SÍ tiene una NVIDIA RTX dedicada (serie 30/40 según la config exacta del LOQ 15IRX9).** La decisión de usar CPU es intencional, no una limitación: el modelo (94.6M parámetros) corre en menos de 1s por clip de 5s en CPU — de sobra para el objetivo de veredicto en <5s — y usar la GPU metería el riesgo real de que el driver NVIDIA ya instalado para juegos no combine exacto con la versión de CUDA que `torch` espera, lo cual no vale la pena arriesgar en 6–10h. Instalar SIEMPRE la rueda de PyTorch CPU-only:
  ```powershell
  pip install torch --index-url https://download.pytorch.org/whl/cpu
  ```
  Y forzar el dispositivo en el código (`model.py`, ver abajo) con `device="cpu"` explícito.

### Dos problemas típicos de Windows a anticipar (para que "no exista problema")
1. **Política de ejecución de PowerShell puede bloquear la activación del entorno virtual.** Si al correr `.venv\Scripts\Activate.ps1` aparece un error de "la ejecución de scripts está deshabilitada", ejecutar una sola vez en esa terminal:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```
2. **Finales de línea (CRLF vs LF)** si el compañero de frontend/backend usa otro sistema operativo. Agregar un `.gitattributes` en la raíz desde el primer commit para que git lo normalice solo:
   ```
   * text=auto eol=lf
   ```

### Estructura del servicio

```
services/
└─ detection-py/
   ├─ requirements.txt
   ├─ .env.example              # INTERNAL_API_KEY (ver sección 7)
   ├─ main.py                   # FastAPI: expone POST /detect y GET /health
   ├─ model.py                  # carga del modelo una sola vez al iniciar (no por request), device="cpu"
   └─ Dockerfile                # imagen slim, para desplegar en HF Spaces o Render
```

`requirements.txt`:
```
fastapi==0.115.*
uvicorn[standard]==0.32.*
transformers==4.46.*
python-multipart==0.0.*
```
(`torch` se instala aparte, con el comando CPU-only de arriba — no ponerlo en `requirements.txt` con versión pineada normal, porque `pip` podría resolver la rueda con CUDA por defecto según el sistema.)

`model.py` — carga tal cual la documenta la model card oficial, forzando CPU (no modificar hiperparámetros ni pesos):
```python
from transformers import pipeline

_pipe = pipeline(
    "audio-classification",
    model="MelodyMachine/Deepfake-audio-detection-V2",
    device="cpu",   # explícito: nunca busca GPU, evita cualquier problema de drivers
)

def clasificar(audio_path: str) -> dict:
    resultados = _pipe(audio_path)
    return {"resultados": resultados}
```

`main.py` — expone el endpoint que consumirá el adapter de TypeScript, protegido con una key compartida (no es un usuario/login, es el "candado" que evita que cualquiera en internet golpee este servicio):
```python
from fastapi import FastAPI, UploadFile, Header, HTTPException
import tempfile, os
from model import clasificar

app = FastAPI()
INTERNAL_API_KEY = os.environ["INTERNAL_API_KEY"]

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/detect")
async def detect(audio: UploadFile, x_api_key: str = Header(...)):
    if x_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="no autorizado")
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        tmp.write(await audio.read())
        tmp.flush()
        return clasificar(tmp.name)
```
`GET /health` es para que el equipo (o un script) pueda verificar en segundos, antes de subir al escenario, que el servicio está despierto y respondiendo — importante porque los tiers gratis (HF Spaces, Render free) "duermen" el contenedor tras un rato sin tráfico, y la primera request después de dormir tarda varios segundos extra (cold start). **Regla operativa: 10-15 minutos antes de la demo, hacer un `curl` a `/health` para despertarlo.**

### Cómo se prueba y despliega (sin pnpm, con su propio flujo)

**Windows (entorno principal del equipo, PowerShell):**
```powershell
cd services/detection-py
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
$env:INTERNAL_API_KEY = "valor-compartido-con-convex"
uvicorn main:app --reload --port 8000
```

**macOS/Linux (si el compañero de equipo usa otro sistema):**
```bash
cd services/detection-py
python3.11 -m venv .venv
source .venv/bin/activate
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
export INTERNAL_API_KEY="valor-compartido-con-convex"
uvicorn main:app --reload --port 8000
```

Para exponerlo con HTTPS temporal durante pruebas (igual que se hace con el frontend): `cloudflared tunnel --url http://localhost:8000`.

**Deploy final recomendado: Hugging Face Spaces** (con SDK Docker, imagen base `python:3.11-slim` para instalar rápido) — es gratis, está pensado exactamente para alojar modelos de Hugging Face, y el modelo (94.6M parámetros) corre bien en CPU sin necesitar GPU. Configurar `INTERNAL_API_KEY` como "Secret" del Space, nunca como variable pública. Alternativa: Render o Fly.io con el mismo `Dockerfile`. **No usar Vercel/Cloudflare para este servicio** — son plataformas para JavaScript/edge, no para procesos Python con PyTorch.

**Nota de honestidad:** ya existen varios Hugging Face Spaces públicos que envuelven este mismo modelo como API (por ejemplo, espacios listados en la propia página del modelo bajo "Spaces using this model"). Se pueden revisar como referencia de cómo otros ya lo sirvieron, pero el equipo debe construir su propio `main.py` a partir del snippet oficial de la model card — no depender de un Space de terceros para la demo, porque no está bajo su control ni tiene garantía de estar disponible el día del evento.

### Regla de integración con el resto del sistema
`LocalWav2Vec2DetectionAdapter.ts` (en `packages/backend/convex/adapters/`) hace un `fetch` a la URL de este servicio (guardada como variable de entorno `DETECTION_PY_URL`), envía el header `x-api-key: <INTERNAL_API_KEY>`, y traduce su respuesta al mismo tipo `DetectionResult` que usan los demás adapters — así `evaluarAudio.ts` no sabe ni le importa si la detección vino de una API de pago o de este servicio local.

---

## 6.1 ¿API Gateway? — No se levanta uno: Convex ya cumple ese rol

No hace falta infraestructura de gateway aparte (AWS API Gateway, Kong, etc.) — sería tiempo perdido en un hackathon. **Convex ya es el único punto de entrada hacia todo lo externo:**

```
Frontend (PWA)
     │  SOLO llama funciones de Convex (useQuery / useMutation / useAction)
     ▼
Convex actions  ←── este es el "gateway": el único lado del sistema que sale a internet
     ├──→ services/detection-py   (con header x-api-key)
     ├──→ TruthScan (en pruebas — ver sección 4, regla 10)
     ├──→ MiniMax (voz/clonación)
     ├──→ ElevenLabs (voz/TTS)
     └──→ Vapi (si se activa telefonía)
```

Reglas:
1. El frontend **nunca** hace `fetch` directo a MiniMax, ElevenLabs, Resemble ni a `services/detection-py`. Siempre pasa por una función de Convex.
2. `services/detection-py` está protegido con `INTERNAL_API_KEY` (sección 6) precisamente porque su URL de Hugging Face Spaces es pública — sin ese candado, cualquiera en internet podría consumir el servicio.
3. Como el frontend nunca llama directo a `services/detection-py`, **no hace falta configurar CORS en el servicio Python** — todo el tráfico hacia él es servidor-a-servidor (Convex → Python), no navegador-a-Python.

---

## 7. Setup de Convex (obligatorio, es el corazón del backend)

Convex no se "instala" como una dependencia más — necesita su propio proyecto en la nube desde el primer día:

```bash
cd packages/backend
npx convex dev          # primera vez: pide login (GitHub) y crea el proyecto; queda corriendo en modo watch
```
Esto genera automáticamente `NEXT_PUBLIC_CONVEX_URL` — cópienla a `apps/web/.env.local`. A partir de aquí, cualquier archivo dentro de `convex/` se sincroniza solo mientras `npx convex dev` sigue corriendo (por eso vive en el script `pnpm dev:backend` del `package.json` raíz — debe estar corriendo todo el hackathon, no es un comando de una sola vez).

Variables de entorno del lado de Convex (nunca en un archivo, siempre con su CLI):
```bash
npx convex env set TRUTHSCAN_API_KEY "..."
npx convex env set DETECTION_PY_URL "https://tu-space.hf.space"
npx convex env set INTERNAL_API_KEY "mismo valor que en services/detection-py"
npx convex env set MINIMAX_API_KEY "..."
npx convex env set MINIMAX_GROUP_ID "..."
npx convex env set MINIMAX_VOICE_MODEL_ID "..."   # el model ID exacto de voz que ya les funciona (no "M3")
npx convex env set ELEVENLABS_API_KEY "..."
npx convex env set N8N_WEBHOOK_URL "..."
```

## 8. Login y variables de entorno — decisión

### Login
**No se implementa para este hackathon.** La demo es de dos teléfonos frente al jurado, no un producto multiusuario — implementar Clerk completo (páginas de sign-in, rutas protegidas, sesión) consume tiempo que rinde más en la detección y el honeypot. Si se necesita guardar "a quién avisar" ante un 🔴, se resuelve con un campo de texto simple en la UI, sin cuenta de usuario. Clerk queda solo mencionado en el pitch como "camino a producción", sin activarse en el código de la demo.

### Variables de entorno (obligatorias desde el primer commit, independientes del login)

`apps/web/.env.example`:
```bash
NEXT_PUBLIC_CONVEX_URL=
```

`packages/backend/.env.example` (para desarrollo local con `convex dev`; en producción se configuran con `npx convex env set`, nunca en un archivo):
```bash
TRUTHSCAN_API_KEY=
AIORNOT_API_KEY=
RESEMBLE_API_KEY=          # opcional — solo si TruthScan también falla el test cronometrado
DETECTION_PY_URL=
INTERNAL_API_KEY=
MINIMAX_API_KEY=
MINIMAX_GROUP_ID=
MINIMAX_VOICE_MODEL_ID=
ELEVENLABS_API_KEY=
VAPI_API_KEY=
N8N_WEBHOOK_URL=
```
```

`services/detection-py/.env.example`:
```bash
INTERNAL_API_KEY=
HF_TOKEN=
```

`.gitignore` en la raíz (crear ANTES del primer commit):
```
.env
.env.local
.env*.local
**/.venv/
**/__pycache__/
node_modules/
.next/
```

---

## 9. Skeleton del monorepo a generar

```
echo-trap/
├─ .claude/
│  ├─ skills/                    (las 4 skills de arriba + las externas instaladas)
│  └─ agents/
│     └─ qa-pre-merge.md         (subagente de la sección 5.1)
├─ pnpm-workspace.yaml
├─ package.json
├─ .npmrc
├─ .gitignore
├─ .gitattributes                (normaliza CRLF/LF entre Windows y otros SO del equipo)
├─ README.md
├─ CLAUDE.md                     (copia de este brief, o resumen operativo)
├─ DECISIONS.md                  (log de hallazgos/decisiones — sección 5.2)
│
├─ apps/
│  └─ web/                       (FRONTEND — rama feature/frontend)
│     ├─ package.json
│     ├─ next.config.ts
│     ├─ app/
│     │  ├─ layout.tsx
│     │  ├─ page.tsx
│     │  └─ manifest.ts
│     ├─ components/
│     │  ├─ Semaphore.tsx
│     │  ├─ Timeline.tsx
│     │  └─ EchoTrapPanel.tsx
│     ├─ lib/
│     │  └─ audio/
│     │     ├─ worklet.ts
│     │     ├─ vad.ts
│     │     └─ downsample.ts
│     └─ public/
│
├─ packages/
│  ├─ backend/                   (BACKEND — rama feature/backend)
│  │  ├─ package.json
│  │  ├─ convex.json
│  │  └─ convex/
│  │     ├─ domain/
│  │     ├─ ports/
│  │     ├─ adapters/
│  │     ├─ usecases/
│  │     ├─ schema.ts
│  │     ├─ detections.ts
│  │     ├─ honeypot.ts
│  │     └─ alerts.ts
│  │
│  └─ shared/                    (tipos/zod compartidos — cualquiera puede tocarlo, avisando)
│     ├─ package.json
│     └─ src/
│        ├─ types.ts
│        └─ schemas.ts
│
└─ services/
   └─ detection-py/              (motor de detección local — Python, FUERA de pnpm, ver sección 6)
      ├─ requirements.txt
      ├─ .env.example
      ├─ main.py
      ├─ model.py
      └─ Dockerfile
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`package.json` raíz (scripts mínimos — nota: `dev:detector` es solo documentación del comando, pnpm no gestiona el entorno virtual de Python, cada quien lo corre manualmente desde `services/detection-py`):
```json
{
  "name": "echo-trap",
  "private": true,
  "packageManager": "pnpm@11.24.0",
  "scripts": {
    "dev": "concurrently -n backend,web -c blue,green \"pnpm --filter @echo-trap/backend dev\" \"pnpm --filter @echo-trap/web dev\"",
    "dev:backend": "pnpm --filter @echo-trap/backend dev",
    "dev:web": "pnpm --filter @echo-trap/web dev",
    "dev:detector": "echo 'Correr manualmente: cd services/detection-py && source .venv/bin/activate && uvicorn main:app --reload --port 8000'"
  },
  "devDependencies": {
    "concurrently": "^9.1.0",
    "typescript": "^5.7.0"
  }
}
```

---

## 10. Checklist final para Claude Code (marcar antes de dar por terminada la Fase 0)

- [ ] `git remote add origin <URL>` conectado y verificado con `git remote -v` (paso 0 de la Fase 0)
- [ ] `.claude/skills/git-commits-es/SKILL.md` creado
- [ ] `.claude/skills/gitflow-echotrap/SKILL.md` creado
- [ ] `.claude/skills/backend-senior-echotrap/SKILL.md` creado
- [ ] `.claude/skills/frontend-senior-echotrap/SKILL.md` creado
- [ ] `.claude/agents/qa-pre-merge.md` creado (sección 5.1)
- [ ] `ui-ux-pro-max-skill` instalado (plugin de Claude Code)
- [ ] `morphicons` agregado como dependencia en `apps/web`
- [ ] `DECISIONS.md` creado en la raíz, con los dos hallazgos de detección ya anotados como primera entrada (sección 5.2): Reality Defender descartado, TruthScan en pruebas
- [ ] Skeleton de carpetas de la sección 9 creado, incluyendo `services/detection-py/`
- [ ] `services/detection-py`: venv con Python 3.11 (`py -3.11` en Windows), `torch` instalado con el índice CPU-only, `requirements.txt` instalado, `uvicorn main:app` corre localmente, `GET /health` responde `{"status":"ok"}`, `POST /detect` con un audio de prueba y el header `x-api-key` correcto devuelve resultado
- [ ] `npx convex dev` corrido al menos una vez, proyecto creado, `NEXT_PUBLIC_CONVEX_URL` copiada a `apps/web/.env.local`
- [ ] Todas las `npx convex env set` de la sección 7 ejecutadas (o documentadas como pendientes si aún no hay las keys)
- [ ] `.env.example` creados en `apps/web`, `packages/backend` y `services/detection-py` (sección 8) — **antes del primer commit**
- [ ] `.gitignore` en la raíz con las reglas de la sección 8 — **antes del primer commit**
- [ ] `.gitattributes` en la raíz (`* text=auto eol=lf`) — **antes del primer commit**
- [ ] `pnpm install` corrido sin errores desde la raíz
- [ ] Primer commit con mensaje `chore(repo): estructura inicial del monorepo, skills y .gitignore` (siguiendo `git-commits-es`), seguido de `git push -u origin main`
- [ ] Ramas `feature/backend` y `feature/frontend` creadas y pusheadas — **con confirmación previa del humano**
- [ ] README.md de arranque escrito con los comandos `pnpm dev`, `pnpm dev:backend`, `pnpm dev:web`, y los pasos para levantar `services/detection-py`

**Al llegar aquí, Claude Code debe detenerse y preguntar al humano en qué rama y con qué tarea empezar, en vez de continuar generando código de producto por su cuenta.**

---

## 11. Plan de fases del hackathon (después de la Fase 0 — construcción real, 6-10h)

> **Nota:** el usuario mencionó un documento con el detalle del proyecto a desarrollar, pero no llegó ningún archivo adjunto en el mensaje — solo la imagen de las specs de la laptop. Si hay un documento con requerimientos adicionales, súbanlo y este plan de fases se ajusta con ese detalle. Mientras tanto, este plan de fases parte de todo lo ya definido en las secciones 1 a 10 de este mismo brief.

División de trabajo: **Persona A (backend)** trabaja en `feature/backend`, **Persona B (frontend)** en `feature/frontend`, en paralelo desde la Fase 1. Sincronizan (merge a `main`, con confirmación humana) al final de cada fase, no solo al final del día.

| Fase | Duración aprox. | Persona A (backend) | Persona B (frontend) |
|---|---|---|---|
| **1 — Núcleo de detección** | 2h | `services/detection-py` funcionando + adapter local conectado a Convex vía `evaluarAudio.ts` con el timeout de la sección 4, regla 10 | Captura de audio (`AudioWorklet` + VAD) + UI base del semáforo (estado dummy, sin conectar aún) |
| **2 — Integración detección ↔ UI** | 1.5h | Correrle a TruthScan el mismo test cronometrado que a Reality Defender; conectar como segunda señal con timeout si pasa la prueba | Conectar el semáforo a `useQuery` de Convex — primer flujo end-to-end real |
| **3 — Calibración (Nivel 0 a 2 del proceso de pruebas ya acordado)** | 1h | Ajustar `SCAM_THRESHOLD` con los clips reales (MiniMax clonado + voz real del equipo) | Probar en los dos teléfonos, medir degradación por altavoz |
| **4 — Honeypot / EchoTrap** | 1.5-2h | `activarHoneypot.ts` + adapter de ElevenLabs/Vapi para el diálogo dilatorio | Panel de EchoTrap en la UI (transcripción en vivo, contador de "tiempo del estafador") |
| **5 — Alerta + pulido** | 1h | `alerts.ts` + webhook de n8n | Aplicar `ui-ux-pro-max-skill`, `morphicons` en el semáforo, pasar `impeccable audit` |
| **6 — Ensayo general** | 1h | Deploy final: `services/detection-py` a HF Spaces, `npx convex deploy` | Deploy de `apps/web` a Vercel, ensayo completo con los dos teléfonos (Nivel 4 del proceso de pruebas) |

Reglas de esta fase:
- Al cierre de cada fase, comitear (skill `git-commits-es`), actualizar `DECISIONS.md` si hubo un hallazgo como el de hoy, y preguntar si se hace merge a `main` (skill `gitflow-echotrap` + subagente `qa-pre-merge`).
- Si una fase se atrasa, recortar por la lista de "Fuera de alcance" ya definida (sección 4) antes que estirar el tiempo de las fases siguientes — la Fase 6 (ensayo) nunca se sacrifica.
- 15 minutos antes de la demo real: `curl` al `/health` del servicio Python en HF Spaces para despertarlo del cold start (sección 6).
