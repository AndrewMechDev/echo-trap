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
| `auragradients.vercel.app` | **Usar como herramienta puntual, no dependencia** | Se copia el CSS generado una vez, no se instala nada. | Copiar CSS directamente |
| `microsoft/playwright-cli` | **No priorizar** | Solo si sobra la última hora, para QA rápida. | `pnpm add -D @playwright/test` — opcional |

## Reglas de instalación
- Todo se instala con **pnpm**, nunca `npx create-*` con npm ni yarn.
- Antes de instalar cualquier skill externa nueva, revisar si ya existe una carpeta `.claude/skills/<nombre>` para no duplicar.
- Si dos skills dan indicaciones contradictorias sobre el mismo componente (por ejemplo, paleta de color), prevalece `ui-ux-pro-max-skill` por ser la más completa para este tipo de producto, y se debe avisar al humano de la contradicción detectada.
