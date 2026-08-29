# EchoTrap (alias VozGuard)

PWA que detecta en tiempo real si una voz es clonada por IA y activa una capa honeypot que dilata al estafador y alerta al usuario. Proyecto del hackathon The Next Craft (Crafter Station), Track 02 — Out of the Box.

Contexto completo del proyecto, arquitectura y decisiones: ver [`CLAUDE.md`](./CLAUDE.md) y [`DECISIONS.md`](./DECISIONS.md).

## Requisitos

- **pnpm 11.24.0** (obligatorio, no usar npm/yarn)
- **Node.js** (via `fnm` o similar)
- **Python 3.11** (`py -3.11` en Windows) — solo para `services/detection-py`

## Estructura

```
apps/web/                  Frontend — Next.js 15 + React 19 (PWA)
packages/backend/          Backend — Convex (funciones, adapters, schema)
packages/shared/           Tipos y schemas zod compartidos
services/detection-py/     Microservicio Python — detección local (wav2vec2, CPU)
```

## Setup inicial

```bash
pnpm install
```

Copiar los `.env.example` a `.env`/`.env.local` en `apps/web`, `packages/backend` y `services/detection-py`, completando las keys que ya se tengan (ver `CLAUDE.md` sección 8).

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

## Levantar el microservicio de detección (Python, fuera de pnpm)

**Windows (PowerShell):**

```powershell
cd services/detection-py
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
$env:INTERNAL_API_KEY = "valor-compartido-con-convex"
uvicorn main:app --reload --port 8000
```

**macOS/Linux:**

```bash
cd services/detection-py
python3.11 -m venv .venv
source .venv/bin/activate
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
export INTERNAL_API_KEY="valor-compartido-con-convex"
uvicorn main:app --reload --port 8000
```

Verificar que está despierto: `GET http://localhost:8000/health` debe responder `{"status": "ok"}`.

## Ramas

- `main` — única rama de deploy, siempre demostrable.
- `feature/backend` — Convex, adapters de IA, schema, detección/honeypot.
- `feature/frontend` — Next.js, PWA, UI, captura de audio.

Sin Pull Requests, sin borrado de ramas, merges solo con confirmación humana explícita (ver skill `gitflow-echotrap`).
