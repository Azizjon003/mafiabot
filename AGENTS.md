# Repository Guidelines

## Project Structure & Module Organization

This repository is a TypeScript Telegram Mafia bot built with grammY, Prisma, and PostgreSQL. Application code lives in `src/`: `handlers/` contains commands, callbacks, and middleware; `game/` owns rules and phase orchestration; `services/` contains business logic; and `database/repositories/` isolates persistence. Shared types, keyboards, locales, and utilities have matching top-level folders. Prisma schema and migrations are under `prisma/`, static configuration is in `assets/`, and compiled output goes to `dist/`. Tests live in `tests/`; `tests/report.md` is generated and tracked.

Read `PRD.md` before changing game rules. Keep Telegram concerns in handlers/controllers and rule logic in the engine. User-facing text belongs in `src/services/text-defaults.ts`, not inline literals.

## Build, Test, and Development Commands

- `npm run dev` starts the bot with `tsx` watch mode; requires a configured `.env`.
- `npm run build` compiles strict TypeScript into `dist/`.
- `npx tsc --noEmit` performs a fast type check without writing output.
- `npm test` runs the scenario suite and rewrites `tests/report.md`.
- `npx tsx tests/<name>.smoke.ts` runs an individual smoke test.
- `npm run db:generate` regenerates the Prisma client after schema edits.
- `npm run db:migrate` creates and applies a development migration.
- `docker compose up -d` starts the bot and PostgreSQL stack.

## Coding Style & Naming Conventions

Use two-space indentation, double quotes, semicolons, and strict TypeScript types. Follow existing naming: `camelCase` for values/functions, `PascalCase` for classes and interfaces, and kebab-case filenames such as `night-action.ts`. Repository classes use the `*.repository.ts` suffix; focused checks use `*.smoke.ts`. Preserve Uzbek for user-visible text, comments, and scenario names. No formatter or linter is configured, so match adjacent code and run the type checker.

## Testing Guidelines

Add declarative game scenarios to `tests/scenarios.ts` or assignment cases to `tests/assignment-scenarios.ts`; include the role name so report categorization works. The main suite has documented pre-existing failures, so compare pass/fail counts before and after changes. Some smoke tests require a live database. Preserve middleware ordering and update serialization when adding persistent `PlayerState` fields.

## Commit & Pull Request Guidelines

History uses Conventional Commit subjects, primarily `feat: ...`; use concise imperative prefixes such as `feat:`, `fix:`, `test:`, or `docs:`. Keep commits scoped to one behavior. Pull requests should explain the change, affected game rules, database/configuration impact, and verification commands. Link relevant issues and include screenshots for Telegram UI or keyboard changes. Never commit `.env`, tokens, credentials, or production data; update `.env.example` for new settings.
