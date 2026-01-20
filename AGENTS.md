# Repository Guidelines

## Project Structure & Module Organization
This is a Bun + Turborepo monorepo. App code lives under `apps/`:
- `apps/api/`: (api) elysia + drizzle-orm + bullmq, source in `apps/api/src/`.
- `apps/dashboard/`: (dashboard) vite + react + tanstack + shadcn/ui + tailwindcss, source in `apps/dashboard/src/`, static assets in `apps/dashboard/public/`.
- `docker/`: Dockerfile plus nginx/redis configs and s6 service definitions.
- Root tooling: `turbo.json`, `lerna.json`, `biome.json`, `lefthook.yaml`.

## Build, Test, and Development Commands
- `bun install`: Install workspace dependencies (uses Bun per `packageManager`).
- `bun run dev`: Run all apps with Turborepo (`turbo dev`).
- `bun run build`: Build all apps (`turbo build`).
- `bun run typecheck`: Typecheck all apps (`turbo typecheck`).
- `bun run --filter './apps/api' dev`: Run API locally with hot reload.
- `bun run --filter './apps/api' db:generate`: Generate Drizzle migrations.
- `bun run --filter './apps/api' db:studio`: Open Drizzle Studio.
- `bun run --filter './apps/dashboard' dev`: Run the dashboard dev server.

## Coding Style & Naming Conventions
- Formatting and linting are enforced by Biome (`biome.json`): 2-space indentation, single quotes, line width 120.
- Prefer conventional TypeScript/React naming; keep file and folder names kebab-case (e.g., `task-form.tsx`).
- Run `bunx --bun biome check --write` to format/lint (also enforced via Git hooks).

## Testing Guidelines
- No test framework is configured yet. If you add tests, document the runner and add a `test` script at the root and in affected apps.
- Use clear file naming (e.g., `*.test.ts` or `*.spec.ts`) and keep tests near the module they cover.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits;.
- Commit linting is enforced via `commitlint` in `lefthook.yaml`.
- PRs should include a brief description, list of changes, and any relevant screenshots for UI changes.

## Security & Configuration Tips
- Turborepo treats `**/.env` as a global dependency; keep local secrets in `.env` files and avoid committing them.
- Review `docker/` configs when changing API ports, Redis settings, or reverse proxy headers.
