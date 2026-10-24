# Engineering preferences

This document records preferences stated in this Nakama conversation. The exact implementation rules live in [Architecture](architecture.md), [the component library](component-library.md), and [Contributing](../CONTRIBUTING.md). Product behavior still belongs to the existing requirements, domain, interaction, collaboration, and flow documents.

## Preferences expressed by the user

- Help build the product and explain the important choices, consequences, and evidence in plain language. The user wants to understand the solutions.
- Organize code by feature. Establish one obvious place and pattern for new work instead of adding another general components or utilities folder.
- Use the shared icon catalog for interface icons; preserve the custom Nakama wave.
- Reuse components throughout the application. Maintain an attached component library and Storybook, with examples and documentation.
- Improve frontend performance and UX. Measure improvements and preserve the workflow semantics already accepted.
- Keep TypeScript strict and useful. Align types with the normalized database and validate values crossing runtime seams. Distinguish type/build, contract, backend/database, external service, and compute failures in the diagnostic catalog.
- Make diagnosis practical and autonomous through private local structured files, safe hosted/CI imports, trace/query IDs, and matching release evidence.
- Favor compact interfaces, small readable type, consistent control heights, aligned columns, and progressive disclosure. At ordinary widescreen widths, keep discussion on the left, project work in the center, and supporting information on the right.
- Keep project progress as centered concentric circles. Use a small borderless notification bell, a fixed-height scrollable project dropdown, and footer language, density, and administration controls.
- Start projects through a compact grid of types and a guided details step. Support typed artifacts, Markdown reading, full-screen images, and independent task progress. Preserve project lineage and authorization semantics.
- Preserve drafts, explicit confirmation for permanent deletion, conflict review, and the existing nested task/Lock-In behavior.
- Distinguish implemented, locally verified, deployed, and live verified. Follow the current request's authorization for commits, pushes, merges, hosted migrations, and provisioning.

## Implementation defaults chosen for this request

These are concrete engineering choices implementing the preferences above; they are not quotations from the user.

1. Keep one Next.js application. `src/app` owns routing and composition; `src/features/<domain>` owns product behavior; `src/shared` owns browser-safe contracts and reusable UI; `src/server` owns database and diagnostic infrastructure.
2. Keep the component library in this repository at `src/shared/ui`. Import the actual components into both the application and Storybook. Do not publish a separate package or provision a documentation service for this request.
3. Use native HTML semantics and React 19 native props/refs. Shared dialogs and tabs own repeated keyboard/focus behavior. Keep business actions out of reusable UI.
4. Prefer Server Components for data access and composition. Use Client Components for state, events, and browser APIs. Pass prepared data or server-rendered slots to those interactive parts.
5. Import explicit module paths. Keep models browser safe and actions explicitly marked `use server`. Avoid mixed client/server barrels and compatibility forwarding folders.
6. Enforce architecture, generated catalogs/types, ESLint, Prettier, and production build checks. Add useful behavior/accessibility tests for shared interactions; avoid tests that merely repeat trivial wrappers.
7. Use shared design tokens and controls with Tailwind CSS v4 utilities colocated on components. `src/app/globals.css` is the only stylesheet and contains Tailwind configuration, theme tokens/keyframes, and minimal motion resets. Do not add custom CSS selectors, feature stylesheets, or a central selector registry. Use explicit component variants, desktop `lg:compact:` density variants, and responsive utilities. Keep test hooks stable and verify computed layout, accessibility, reduced motion, and bundle budgets.
8. Keep expensive optional UI conditional and lazy. Do not ship every workflow template for a summary picker, an inactive Markdown renderer, or the 3D map before it opens.

New accepted decisions go in [the decision register](roadmap.md). Change the canonical rule and its automated guard together when deliberately adopting a new pattern.
