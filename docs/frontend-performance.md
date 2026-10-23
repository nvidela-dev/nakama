# Frontend performance and UX

Measure the same route, viewport, environment, and build mode before comparing changes. Component reuse and folder moves improve maintenance; they do not by themselves prove a faster experience.

## Reproducible local measurement

```sh
npm run build
# Instant static route/chunk/import-graph report from .next + src (no server needed):
npm run frontend:report
# Full live browser + interactive journey + static report (starts or reuses localhost:3035):
npm run frontend:measure
# Guarded responsive/browser budget suite (starts its own server):
npm run test:frontend
```

`frontend:report` (`tsx scripts/frontend-metrics.ts --static`) inspects the production `.next/` build manifests, classifies every static JS/CSS chunk in `.next/static/chunks/`, computes exact raw and gzip First-Load JS for every App Router page (including authenticated routes such as `/projects/[projectId]` without needing credentials), and walks the TypeScript AST from `"use client"` entrypoints to detect heavy static client imports.

`frontend:measure` runs that static and AST analysis alongside headless Chromium measurements of the public synthetic `/preview` (at 1440px and 390px) and `/` (at 1440px), plus interactive stage/node navigation and on-demand 3D stage-map lazy chunk loading. If `http://localhost:3035` is not already listening, `frontend:measure` starts a temporary `npm start -- --port 3035` server and stops it when finished. Pass `--save-baseline` to snapshot `.nakama/performance/baseline.json` before an optimization pass, or `--json` for machine-readable output.

It writes:
- `.nakama/performance/latest.json` — array of `/preview` route measurements for compatibility
- `.nakama/performance/report.json` — Zod-validated report combining git provenance, build ID, static per-route breakdown, lazy chunks, client import hotspots, browser timings/Web Vitals (`ttfbMs`, `fcpMs`, `lcpMs`, `cls`, `longTasks`, Chromium CDP layout/script durations and JS heap), interactive transition latencies, budget checks, and baseline deltas
- `.nakama/performance/history.jsonl` — append-only run log for tracking trends across commits

It never signs in, reads private projects, or saves response bodies. External Clerk/network resources are excluded from same-origin byte totals. Navigation timing is observational and not a hard failure threshold.

`test:frontend` verifies at both 1440px and 390px:
- `/preview` initial gzip JS `<= 220,000` bytes, shared CSS gzip `<= 20,000` bytes, `CLS <= 0.05`, DOM nodes `<= 1,500`, and zero horizontal overflow
- `/` initial gzip JS `<= 205,000` bytes, `CLS <= 0.05`, and zero horizontal overflow
- `/preview` stage switching (`?stage=spark`), node selection (`?node=spark-name`), and opening/closing the lazy 3D stage map (`mapLazyJsGzip <= 155,000` bytes) with Escape dismissal, focus restoration, and zero horizontal overflow

`frontend:check-bundle` runs automatically in `postbuild` to verify that `.next/server/**/*.nft.json` deployment traces exclude Storybook, `.stories.*`, and `@axe-core`, and that all static routes and lazy chunks stay within their hard gzip budgets.

## Bundle architecture and measured baseline

The static analyzer decomposes First-Load JS across four layers (measured on build `ce155f149ff5fc14155df8e6c8d562fa` at `6647df0`):

1. **Framework & React runtime (`rootMainFiles`)**: `133,095` B gzip across 7 chunks (`react-dom` + Next.js App Router runtime).
2. **Root layout client shell (`src/app/layout` + `src/app/error`)**: `63,657` B gzip across 4 chunks (`@clerk/nextjs` provider/controls + root navigation, notification bell, density, and language switcher). Together with the framework runtime, this forms the `196,752` B gzip shared baseline loaded on `/` and `/sign-in`.
3. **Route-only initial client JS**:
   - `/preview`: `+6,141` B gzip (`202,893` B total gzip across 12 scripts) for `Journey`, `ProjectWork`, and `Dialog`.
   - `/projects/[projectId]/artifacts/[artifactId]`: `+5,849` B gzip (`202,601` B total gzip).
   - `/projects`: `+4,189` B gzip (`200,941` B total gzip).
   - `/projects/[projectId]`: `+77,557` B gzip (`274,309` B total gzip across 15 scripts) — flagged (`WARN`) above the `220,000` B route warning threshold.
4. **On-demand lazy chunks (`next/dynamic`)**:
   - `three` + `journey-miniview`: `135,751` B gzip (`551,002` B raw), loaded only when opening the 3D stage map (`ssr: false`).
   - `react-markdown` + `remark-gfm` (`markdown-reader`): `43,255` B gzip (`144,427` B raw).
   - `answer-editor`: `2,423` B gzip (`6,176` B raw).
   - `stage-review-form`: `857` B gzip (`1,566` B raw).

## Actionable optimization opportunities detected

`analyzeClientImportHotspots` automatically traces static imports from `"use client"` components to heavy modules and currently highlights two high-impact opportunities responsible for `/projects/[projectId]`'s `+77.6 KB` gzip route-only payload:

- **`[client-es-dictionary]` (`~26.3 KB` gzip in chunk `1x6qh7a7k7epi.js`)**: `src/features/collaboration/components/activity-feed.tsx`, `src/features/collaboration/components/discussion.tsx`, and `src/features/guidance/components/answer-editor.tsx` import `formatDate` from `src/shared/i18n/index.ts`, which statically imports `src/shared/i18n/es.json`. Moving `formatDate` (and `Locale` / `resolveLocale`) into a dictionary-free module keeps `es.json` server-supplied only when `locale === "es"`.
- **`[client-zod-runtime]` (`~40.0 KB` gzip in chunk `44pyx18cenrd9.js`)**: `src/features/tasks/components/task-list.tsx` statically imports `parseLockInFile` from `src/features/tasks/lockin-format.ts` (which imports `zod`), even though Lock-In parsing only runs when a user selects a local JSON file to import. Loading `lockin-format` via dynamic `import()` inside `readFile()` removes `zod` from initial `/projects/[projectId]` hydration.

## Earlier refactor baseline

- Generate a small picker catalog from full flow templates and verify drift in build/typecheck checks. Browser import rules reject accidentally loading the full registry again.
- Keep common feedback independent of invitation actions, and split the locale context from preference-changing actions.
- Supply only the selected locale dictionary through the server layout; English UI no longer imports the Spanish catalog through its translation hook.
- Split flow choice, answer editing, and review forms into dedicated components. Load answer/review editors, Markdown, and the optional map conditionally.
- Keep filters responsive with deferred artifact search. Preserve mounted tab panels, draft/conflict handling, and hierarchy semantics.
- Share modal focus trapping, dismissal and scroll behavior. Label Markdown task checkboxes, retain safe URL/HTML handling, and provide reduced-motion loading states.
- Separate foundational CSS from prefixed feature styles, retaining the visual language. Validate real route layouts and workflows after that cascade change.

The pre-refactor production-build sample at 1440px loaded 786,317 raw bytes / 236,662 gzip bytes across 14 same-origin scripts. The feature-architecture refactor reduced `/preview` to 673,284 raw / 199,255 gzip bytes across 12 scripts (`-37,407` gzip bytes, `-15.8%`), and adding the 31-icon shared Lucide catalog brought `/preview` to 683,113 raw / 202,893 gzip bytes (`-33,769` gzip bytes, `-14.3%` below the pre-refactor baseline).

## Limits and next measurements

This local tracking suite combines static build/AST analysis with synthetic loopback browser measurements; it is not a field RUM study across real user networks or devices. Membership-scoped project/library reads still retain their existing complete-list behavior; large-list cursor pagination requires a separate product/service change. Keep private images on their authenticated noncached route rather than sending them through an unauthenticated optimization service.

For a later production audit, compare the same real task across representative devices/networks, collect consented content-free timings with the matching release, and distinguish server/database time from client rendering and network transfer. Do not claim an improvement from package size alone.
