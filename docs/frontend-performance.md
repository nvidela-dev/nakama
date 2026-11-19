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

## Client import regression checks

Client date consumers import the dictionary-free date helper. The selected dictionary is supplied by the server layout. Lock-In file import was retired when managed task boards replaced that workflow. The source-graph test walks current client entry points and rejects static application imports of Zod or the Spanish catalog. A Server Action ends a browser import path because Next compiles it to a remote reference. Optional dynamic imports are separate from static paths. Production build budgets continue to check emitted route sizes, including third-party dependencies.

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

This local tracking suite combines static build/AST analysis with synthetic loopback browser measurements; it is not a field RUM study across real user networks or devices. The dashboard and global artifact library use timestamp and ID cursors with a 24-card page size. Dashboard progress and activity queries receive only the visible project IDs. Selectors still list all accessible projects using a small ID/name/flow projection. Keep private images on their authenticated noncached route rather than sending them through an unauthenticated optimization service.

For a later production audit, compare the same real task across representative devices/networks, collect consented content-free timings with the matching release, and distinguish server/database time from client rendering and network transfer. Do not claim an improvement from package size alone.

## PR integration budget fixes — 2026-10-26

CI found the project route and shared CSS just above the existing budgets. Date formatting now has a locale-dictionary-free module, preventing client date consumers from importing the full Spanish message catalog. Tailwind scans `src` explicitly (`source("../")` relative to `src/app/globals.css`), so documentation and test strings outside the application do not create production utilities. Colocated component stories remain in that source tree. The stylesheet guard permits only this exact scoped configuration; performance thresholds are unchanged.

## Ant Design workspace — 2026-11-07

The application now uses Ant Design across shared controls and navigation. A production build measured 328,236 compressed JavaScript bytes on the landing page, 334,957 on the preview and 357,139 on the project page. The approved hard limits are 345,000, 350,000 and 375,000 bytes respectively. The project board loads on its first visit. Existing CSS, 3D, layout stability and interaction budgets continue to apply.
