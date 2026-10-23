# Frontend performance and UX

Measure the same route, viewport, environment, and build mode before comparing changes. Component reuse and folder moves improve maintenance; they do not by themselves prove a faster experience.

## Reproducible local measurement

```sh
npm run build
npm start -- --port 3035
# Separate terminal, same build:
npm run frontend:measure
# Or run the guarded responsive/browser budget suite (starts its own server):
npm run test:frontend
```

`frontend:measure` visits only the public synthetic `/preview` on a loopback production server at desktop and phone widths. It records same-origin JavaScript response bytes and deterministic gzip sizes, script count, overflow, and an observational navigation duration in ignored `.nakama/performance/latest.json`. It never signs in, reads private projects, or saves response bodies. External Clerk/network resources are excluded from the byte totals. Navigation timing is noisy and is not a regression threshold.

`test:frontend` rejects initial same-origin gzip JavaScript above 220,000 bytes at 1440px and 390px, checks horizontal overflow, and opens/closes the lazy 3D dialog with keyboard focus restoration. It requires a built app and an installed browser. Use `PLAYWRIGHT_CHANNEL=chromium` with a managed Playwright browser, or the default installed Chrome. Component browser checks are separate and need no identity/database services.

## Changes in this pass

- Generate a small picker catalog from full flow templates and verify drift in build/typecheck checks. Browser import rules reject accidentally loading the full registry again.
- Keep common feedback independent of invitation actions, and split the locale context from preference-changing actions.
- Supply only the selected locale dictionary through the server layout; English UI no longer imports the Spanish catalog through its translation hook.
- Split flow choice, answer editing, and review forms into dedicated components. Load answer/review editors, Markdown, and the optional map conditionally.
- Keep filters responsive with deferred artifact search. Preserve mounted tab panels, draft/conflict handling, and hierarchy semantics.
- Share modal focus trapping, dismissal and scroll behavior. Label Markdown task checkboxes, retain safe URL/HTML handling, and provide reduced-motion loading states.
- Separate foundational CSS from prefixed feature styles, retaining the visual language. Validate real route layouts and workflows after that cascade change.

The pre-refactor production-build sample at 1440px loaded 786,317 raw bytes / 236,662 gzip bytes across 14 same-origin scripts, with no horizontal overflow. The refactored build loaded 673,284 raw bytes / 199,255 gzip bytes across 12 scripts at both 1440px and 390px, without horizontal overflow. That is 37,407 fewer gzip bytes (15.8%) on this route. The budget leaves approximately 10% headroom over that measured result. Final integration verification is recorded in the development guide. This baseline includes the local Clerk development configuration; a CI build without that configuration can load fewer scripts.

## Limits and next measurements

This public-route budget is a local regression guard, not a Lighthouse score or a production Web Vitals study. It does not measure the full authenticated project payload, field LCP/INP/CLS, slow phones, or private image decoding/network costs. Membership-scoped project/library reads still retain their existing complete-list behavior; large-list cursor pagination requires a separate product/service change. Keep private images on their authenticated noncached route rather than sending them through an unauthenticated optimization service.

For a later production audit, compare the same real task across representative devices/networks, collect consented content-free timings with the matching release, and distinguish server/database time from client rendering and network transfer. Do not claim an improvement from package size alone.
