# EchoTrap (alias VozGuard)

PWA que detecta en tiempo real si una voz es clonada por IA y activa una capa honeypot que dilata al estafador y alerta al usuario. Proyecto del hackathon The Next Craft (Crafter Station), Track 02 — Out of the Box.

Contexto completo del proyecto, arquitectura y decisiones: ver [`CLAUDE.md`](./CLAUDE.md) y [`DECISIONS.md`](./DECISIONS.md) (esta última tiene el historial de cambios respecto al brief original, incluido el paso a motor único TruthScan).

## Requisitos

- **pnpm 11.24.0** (obligatorio, no usar npm/yarn)
- **Node.js** (via `fnm` o similar)

## Estructura

```
apps/web/                  Frontend — Next.js 15 + React 19 (PWA)
packages/backend/          Backend — Convex (funciones, adapters, schema)
packages/shared/           Tipos y schemas zod compartidos
```

Detección de voz clonada: **TruthScan** (motor único, vía API — ver `DECISIONS.md`). Ya no hay microservicio Python local.

## Setup inicial

```bash
pnpm install
```

Copiar los `.env.example` a `.env`/`.env.local` en `apps/web` y `packages/backend`, completando las keys que ya se tengan (ver `CLAUDE.md` sección 8, y `DECISIONS.md` para las variables que cambiaron desde entonces).

## Levantar el proyecto

Backend (Convex, debe quedar corriendo en modo watch todo el hackathon):

```bash
pnpm dev:backend
```

Frontend (Next.js):

```bash
pnpm dev:web
```

Ambos juntos:

```bash
pnpm dev
```

## Probar el flujo sin frontend armado

```bash
pnpm --filter @echo-trap/backend test:flow <ruta-al-audio> [contactoConfianza]
```

Corre el flujo completo (crear llamada → evaluar audio con TruthScan → persistir detección → honeypot/alerta si da rojo) contra el deployment real de Convex, imprime los resultados y tiempos en la terminal. También se puede ver todo en vivo desde el [dashboard de Convex](https://dashboard.convex.dev) (pestañas Data y Functions).

## Ramas

- `main` — única rama de deploy, siempre demostrable.
- `feature/backend` — Convex, adapters de IA, schema, detección/honeypot.
- `feature/frontend` — Next.js, PWA, UI, captura de audio.

Sin Pull Requests, sin borrado de ramas, merges solo con confirmación humana explícita (ver skill `gitflow-echotrap`).
