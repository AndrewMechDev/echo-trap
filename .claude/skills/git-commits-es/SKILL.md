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
