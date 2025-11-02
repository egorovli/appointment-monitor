# Repository Guide

## Structure
- Root-level project (not a monorepo)
- Source code in `src/`
- Tests in `tests/`
- Config files at root level

## Code Style
- Save tokens: ignore formatting; run `bun run lint:fix` (or `bunx --bun biome check . --write --unsafe`)
- Biome: single quotes, tabs (vw=2), 100 cols, named exports (no default), kebab-case filenames
- TS strict; prefer explicit return types for shared utils
- Prefer `undefined` over `null` throughout the codebase
- Avoid `Boolean(value)` casts; prefer explicit checks like `typeof value === 'string' && value.length > 0`

## Import Ordering (Required)
Follow eslint-plugin-import order rules. Group imports in this order, separated by blank lines:
1. **Type imports** (`import type { ... } from ...`) - ALL type-only imports first
2. **Node/Bun built-ins** - Built-in modules (e.g., `fs`, `path`)
3. **External modules** - Dependencies from `node_modules` (e.g., `playwright`)
4. **Local imports** - Relative imports from the project (e.g., `../utils/...`)

**Rules:**
- Always use `import type { ... }` syntax, NOT `import { type ... }`
- Never mix value and type imports in the same statement
- Separate groups with blank lines
- Alphabetize within each group
- Value imports use the class/function, type imports use only types/interfaces

**Example:**
```ts
import type { Browser, Page } from 'playwright'

import { chromium } from 'playwright'

import { checkAvailableSlots } from '../src/index.js'
```

## Testing & Validation
- **Always run after making changes**: `bun run lint:fix`
- Lint fixes formatting and catches common issues
- Type check with `bun run --bun tsc --noEmit`

## Testing
- Playwright E2E tests: `bun test`
- Tests located in `tests/` directory
- Use Playwright's testing utilities

