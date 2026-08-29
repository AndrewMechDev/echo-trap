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
