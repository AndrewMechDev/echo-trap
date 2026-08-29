# Decisiones y hallazgos — EchoTrap

## 2026-08-29
- Reality Defender tarda >10min en responder en pruebas propias — descartado por completo para el flujo en vivo, no se implementa su adapter. Motor local (`LocalWav2Vec2DetectionAdapter`) pasa a ser la fuente primaria del semáforo.
- Se confirma TruthScan como motor remoto secundario definitivo (no bloqueante, con timeout duro) — alternativas de pago (Resemble, AI or Not) descartadas porque piden créditos y TruthScan tiene free trial suficiente para el hackathon.
- Se arranca el desarrollo por backend (Convex + detección) antes que frontend/UI, con `feature/backend` y `feature/frontend` trabajando en paralelo desde ramas separadas.
