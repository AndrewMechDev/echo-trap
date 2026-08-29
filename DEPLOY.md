# Deploy — EchoTrap

## Backend (Convex) — YA HECHO

- Deployment de producción: `andrew-alca:echo-trap:production`
- URL: `https://cheerful-civet-647.convex.cloud`
- Las 5 API keys (`TRUTHSCAN_API_KEY`, `DEEPGRAM_API_KEY`, `MINIMAX_API_KEY`, `TAVILY_API_KEY`, `GEMINI_API_KEY`) ya están seteadas ahí con `npx convex env set --prod`.
- Si se vuelve a tocar código de `packages/backend/convex/`, correr `npx convex deploy` de nuevo desde `packages/backend` para actualizar producción (deployment de dev y de prod son independientes, `convex dev` NO actualiza producción).

## Frontend (Vercel) — pendiente

1. Importar el repo en Vercel, rama **`main`**.
2. Framework preset: **Next.js**.
3. **Root Directory: `apps/web`** (es un monorepo pnpm — importante, si no Vercel no encuentra el proyecto).
4. Install/Build command: dejar los que auto-detecta Vercel para pnpm workspaces (no hace falta tocarlos si detecta `pnpm-workspace.yaml` en la raíz del repo).
5. **Variable de entorno obligatoria:**
   ```
   NEXT_PUBLIC_CONVEX_URL=https://cheerful-civet-647.convex.cloud
   ```
   Ojo: es la URL de **producción** (`cheerful-civet-647`), no la de desarrollo (`brilliant-ocelot-618`) que está en `apps/web/.env.local`.
6. Deploy.
7. Una vez arriba, probar el flujo completo (crear llamada → escuchar → semáforo → honeypot si da rojo) contra la URL pública, no solo en local.

## Cold start a tener en cuenta

TruthScan y Gemini son APIs externas, no tienen cold start propio nuestro. No hay ningún servicio propio "dormido" que despertar (a diferencia del viejo plan con Hugging Face Spaces, descartado — ver `DECISIONS.md`).
