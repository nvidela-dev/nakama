# Contributing to Nakama

Read [README](README.md), [Architecture](docs/architecture.md#feature-ownership-and-frontend-composition--2026-10-23), and [Engineering preferences](docs/engineering-preferences.md). Read the canonical domain/collaboration/flow document for the behavior you change. [The agent harness](docs/agent-harness.md) owns command orchestration.

## One path for a feature change

1. Inspect status and use a `codex/` branch. Preserve unrelated work.
2. Find the owning feature under `src/features`. Put browser-safe domain contracts in its model, input validation beside that model, authorized data operations in `server`, Server Actions in an explicit `use server` module, and product components in `components`. Keep Next route files as composition/adapters.
3. Reuse `src/shared/ui` primitives. Keep shared UI independent of domain data/actions. Add reusable behavior and its stories there, and keep product orchestration in the feature. Follow [the library guide](docs/component-library.md).
4. Start with Server Components. Add `use client` only for interactivity/browser APIs. Use type imports for contracts. Lazy-load expensive optional views from a client component. Never cache private data across users or move authorization into the browser.
5. Validate inputs and returned database/provider values. Preserve per-project membership, transaction/revision/conflict behavior, drafts and framework navigation. SQL migrations remain the schema authority; regenerate storage types/catalogs after changing their sources.
6. Add meaningful tests at the seam you changed: domain/service behavior, component keyboard/accessibility behavior, or an integrated browser journey. Use synthetic fixtures and isolated services. Existing tests must not become vacuous when moving files.
7. Record accepted decisions in `docs/roadmap.md`, update the relevant canonical document, and validate changed links. Report what was measured, tested, and still unverified.

## Constraints and validation

- TypeScript uses strict mode, unchecked-index checks, exact optional properties, consistent returns, unused-code checks, and switch fallthrough checks. Do not bypass them with `any` or broad casts.
- ESLint checks Next, React hook/immutability rules, and explicit type imports. Keep zero warnings. A narrowly justified local suppression can describe a real external-system exception; never disable a rule globally to make a refactor pass.
- Prettier is the formatting authority. Generated files are excluded; change their generators, not their output by hand.
- `npm run architecture:check` enforces the import/primitive rules. `npm run flows:check` and `npm run db:check` reject stale generated contracts. Direct build/typecheck commands run architecture and flow checks first.
- `make check` and `make verify` are the repository workflows; the Makefile lists their current steps. Browser suites have separate prerequisites and do not run against hosted data by default.
- `npm run test:components` runs local Storybook examples. `npm run test:frontend` requires a completed production build and starts a local preview server. `npm run test:e2e` requires the explicitly configured isolated database and Clerk development test setup.

Before diagnosing backend behavior, follow [the logging workflow](docs/development.md#backend-logging--2026-10-23). Keep raw provider logs, credentials, user content and private screenshots out of Git, fixtures and PRs. Do not replay writes automatically. A passing build or story is not proof of a deployed user journey.
