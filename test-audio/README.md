# Audio de prueba para calibración (Fase 3)

Esta carpeta es **local, no se sube al repo** (los `.wav`/`.mp3`/`.m4a` están en `.gitignore` — son voces reales del equipo y clips clonados, no van a un repo público de hackathon).

## Qué poner acá

- **`clonada/`** — clips de voz clonada (generados con MiniMax Speech 2.8 u otra herramienta), simulando el "ataque" que debería disparar el semáforo en 🔴 o 🟡.
- **`real/`** — clips de voz real del equipo, hablando normal, que deberían dar 🟢.

Formatos soportados por TruthScan: wav, mp3, m4a funcionan bien. Clips cortos (5-15s) alcanzan (analiza hasta 10s por clip).

## Cómo se usan

1. Probar cada clip contra la detección real corriendo el flujo completo (`evaluarAudioAction` en Convex, con `TRUTHSCAN_API_KEY` seteada), o directo contra `TruthScanDetectionAdapter` en un script aislado.
2. Anotar los scores que devuelve para clips clonados vs. reales.
3. Ajustar `SCAM_THRESHOLD` en `packages/backend/convex/domain/thresholds.ts` según esos números reales (hoy son un punto de partida: `HIGH_CONFIDENCE: 70`, `SUSPICIOUS: 45`).
4. Documentar el resultado de la calibración en `DECISIONS.md`.
