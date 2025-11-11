# Repository Guidelines

## Agent Protocols
- Activate Serena MCP at the very start of every session. Do not run commands until activation is confirmed in the log.
- Focus on functional edits and let Biome handle whitespace/import cleanup via `bun run lint:fix`; manual formatting is unnecessary.
- Reference `.cursor/rules/*.mdc` for enforced details on import ordering, kebab-case filenames, undefined-over-null usage, and Bun-only tooling.

## Project Structure & Module Organization
TypeScript sources live in `src/`. `src/index.ts` wires Temporal polyfill support and hands off to the Commander-based CLI defined in `src/cmd/`. Feature logic is split by concern inside `src/lib`: `gui/` handles the Ink-powered terminal UI, `monitor/` encapsulates scheduling & polling services, and `poznan.uw.gov.pl/` stores site-specific scraping/adapters for the voivodeship portal. End-to-end Playwright specs live in `tests/`.

## Build, Test, and Development Commands
- `bun install` — install dependencies defined in `package.json` and hydrate `bun.lock`.
- `bun run start` — launch the CLI end-to-end via `src/index.ts`; add `--help` to inspect flags.
- `bun run lint` / `bun run lint:fix` — run Biome for formatting + linting, optionally auto-fixing violations.
- `bunx playwright test` — execute all specs in `tests/*.spec.ts` headlessly; add `--ui` when debugging.

## Coding Style & Naming Conventions
Biome (configured in `biome.json`) enforces tabs, single quotes, trailing commas, and ordered imports. Stick to TypeScript strictness: explicit return types on exports, `camelCase` for variables/functions, `PascalCase` for classes/providers. CLI entry files live under `src/cmd/`; lower-level utilities live in `src/lib/<domain>/<module>.ts`.

## Testing Guidelines
Use Playwright (`@playwright/test`) for acceptance coverage. Name specs `<feature>.spec.ts` and colocate helpers under `tests/helpers/` if needed. Every PR should run `bunx playwright test` plus `bun run lint`; include failing screenshots/video artifacts when relevant (`playwright/test-results`).

## Commit & Pull Request Guidelines
Follow the conventional commits style already in history: `<type>: <short description>` where `type` ∈ {`feat`, `fix`, `refactor`, `chore`, `docs`, `test`}. Scope tags are optional but helpful (`feat(gui): ...`). PRs must describe the user-facing change, list test commands executed, reference related issues/tickets, and avoid bundling unrelated refactors.

## Architecture Notes
Core services live under `src/lib`, so register new modules alongside their related monitors/adapters. React/Ink components stay presentation-only, delegating side effects to monitors or adapters. Keep configuration in env files and never commit secrets.
