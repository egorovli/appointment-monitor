---
description: Whenever referencing tooling, CLIs, or runtime expectations for this project
alwaysApply: false
title: Use Bun for all runtime and tooling needs
---

# Use Bun for all runtime and tooling needs

- Run scripts with `bun run <script>` and install dependencies with `bun install`.
- Prefer Bun-native CLIs (`bunx playwright test`) over npm, pnpm, or yarn equivalents.
- Access platform APIs via the `Bun` global in code; do not rely on `process`.
- When adding workflows or docs, assume Bun is the default runtime and package manager.
- Formatting can be deferred—run `bun run lint:fix` to normalize style instead of hand-formatting.
