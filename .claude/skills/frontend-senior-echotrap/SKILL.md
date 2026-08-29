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
| `nextlevelbuilder/ui-ux-pro-max-skill` | **Usar** | Única con soporte real para paneles con datos, charts y dashboards (25 tipos de gráfico) — justo lo que necesita el timeline de scores y el semáforo. Plugin nativo para Claude Code. | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` luego `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill` |
| `guillermolg00/morphicons` | **Usar** | Encaja con el semáforo: el ícono puede *morphear* de "escuchando" → "alerta" → "seguro". Cero dependencias, ~7 KB. Compatible con React 19. | `pnpm add morphicons` |
| `Nutlope/hallmark` | **Usar, solo si hay landing/pitch aparte** | Anti-slop para páginas de marketing, no para dashboards de datos. | Copiar `SKILL.md` + `references/` al repo |
| `emilkowalski/skills` (`animate`, `pick-ui-library`) | **Usar, solo esas dos sub-skills** | `animate` da criterio de curvas/duración para la animación del semáforo. `pick-ui-library` evita instalar componentes abandonados. | `npx skills@latest add emilkowalski/skills --skill animate` y `--skill pick-ui-library` |
| `pbakaus/impeccable` | **Usar al final, como auditoría** | Detector de "AI slop" — correrlo en la fase de pulido, no antes. | `npx impeccable audit` sobre `apps/web` |
| `Leonxlnx/taste-skill` | **No usar en el dashboard principal** | Su changelog dice explícitamente que no está pensado para dashboards ni UIs realtime. | No instalar por defecto |
| `reicon.dev` | **No usar** | Ya se cubre con `lucide-react`. | No instalar |
| `gooey.jakubantalik.com` | **No usar en el MVP** | Efecto visual bonito pero no aporta a la claridad del semáforo. | Opcional solo si sobra tiempo |
| `auragradients.vercel.app` ("Chrome Inferno") | **Usar, SOLO en el hero/landing (pantalla de bienvenida antes de iniciar la detección)** | Gradiente rojo/naranja fuego con blend modes — potente para el hero, pero si se usa en TODO el dashboard le resta fuerza semántica al semáforo (🔴 real ya no destaca si el fondo siempre fue rojo). Ver sección "Sistema de diseño" abajo para el CSS exacto y por qué se restringe el alcance. | Copiar el componente `AuraBackground` directo, no se instala nada como dependencia |
| `microsoft/playwright-cli` | **No priorizar** | Solo si sobra la última hora, para QA rápida. | `pnpm add -D @playwright/test` — opcional |

## Sistema de diseño (destilado de `requirements/ux-ui.txt`, filosofía Apple HIG aplicada a EchoTrap)

Principios de fondo (no se copian las 675 líneas del documento fuente — esto es su traducción a reglas concretas de este proyecto): claridad, jerarquía, consistencia, simplicidad, feedback inmediato, accesibilidad, detalle visual. Cada elemento visual necesita una función, nada decorativo sin propósito. Ante cualquier duda de diseño, volver a `requirements/ux-ui.txt` (queda como referencia completa, no se resume más acá).

### Color semántico
- **El semáforo es la única fuente de "alarma" de la app.** Nada más compite con 🟢🟡🔴 por atención — por eso el gradiente "Chrome Inferno" NO va en el dashboard en vivo, solo en el hero (ver tabla de arriba).
- Dashboard en vivo: fondo neutro oscuro simple (superficie tipo `#0a0a0a`–`#111111`, texto claro), sin gradientes compitiendo.
- Estados: `success` = verde del semáforo, `warning` = amarillo, `error`/`danger` = rojo del semáforo — reutilizar EXACTAMENTE esos tonos para cualquier otro indicador de estado en la UI (badges, bordes de alerta), nunca inventar un rojo/verde distinto para otra cosa.
- Nunca depender solo del color: cada estado del semáforo lleva también ícono (vía `morphicons`) y texto ("Voz verificada", "Sospechoso", "Alerta: posible estafa").

### Hero / landing — "Chrome Inferno"
Componente `AuraBackground` (3 capas + grain, blend modes `screen`/`multiply` sobre `#100e0b`) — usar tal cual el spec ya validado, SOLO en la pantalla de bienvenida antes de iniciar la detección. Reglas de implementación (no negociables, rompen el efecto si se saltean):
- `background-color: #100e0b` va en el `<body>`/wrapper de página, NUNCA en el contenedor del gradiente (los blend modes componen contra lo que está detrás).
- Contenedor del gradiente: `position: relative; overflow: hidden; min-height: 100vh` — sin `background-color` propio.
- Capas decorativas: `position: absolute; inset: 0; pointer-events: none; aria-hidden="true"`.
- Contenido real de la página va en un wrapper `position: relative; z-index: 1` por encima de las capas.
- No generar texto/headings de muestra dentro del componente — el fondo va limpio, el contenido real se inyecta aparte.

### Tipografía
Jerarquía mínima necesaria para este producto (no hace falta más para un dashboard de 3-4 vistas):
- **Display** — el score/veredicto grande del semáforo.
- **Heading** — títulos de sección (Timeline, Panel de honeypot).
- **Body** — texto general, transcripción del honeypot.
- **Caption/Label** — timestamps, metadata, labels de campos.
Peso y tamaño para jerarquía, nunca solo color. Legibilidad por sobre ornamento — es una app de seguridad, no una landing de marketing.

### Spacing y layout
- Sistema de espaciado consistente (escala tipo 4/8/12/16/24/32px, la que traiga `ui-ux-pro-max-skill` si define una — no inventar una paralela).
- Mobile-first real: layout de una sola columna en mobile, el semáforo siempre visible sin scroll en la pantalla principal (es lo primero que mira el jurado).

### Botones
- Acción primaria (ej. "Iniciar detección", "Activar EchoTrap") siempre visualmente dominante — una sola por pantalla.
- Textos de acción específicos ("Iniciar detección", "Ver transcripción"), nunca genéricos ("Continuar", "OK").
- Estados obligatorios: default, hover, pressed, focused, disabled, loading — mínimo indispensable, no lujo.

### Estados de interfaz (obligatorios donde aplique)
`loading` (mientras se espera el veredicto de TruthScan, hasta 12s — usar skeleton o spinner con mensaje explícito, "Analizando audio...", nunca pantalla congelada), `empty` (sin llamada activa todavía), `error` (TruthScan no respondió — explicar qué pasó y qué hacer, nunca "ha ocurrido un error" genérico), `success`/`warning`/`error` del propio semáforo.

### Feedback y microinteracciones
- Toda espera de TruthScan (hasta 12s reales) DEBE comunicar que está procesando — ver skill `emilkowalski/skills --skill animate` para curvas/duración correctas de esa animación de espera.
- Animaciones rápidas, discretas, con causa→efecto claro (el morphing del ícono al cambiar de veredicto es la única animación "grande" de la app).

## Reglas de instalación
- Todo se instala con **pnpm**, nunca `npx create-*` con npm ni yarn.
- Antes de instalar cualquier skill externa nueva, revisar si ya existe una carpeta `.claude/skills/<nombre>` para no duplicar.
- Si dos skills dan indicaciones contradictorias sobre el mismo componente (por ejemplo, paleta de color), prevalece `ui-ux-pro-max-skill` por ser la más completa para este tipo de producto, y se debe avisar al humano de la contradicción detectada.
