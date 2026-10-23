# Access

App admission, verified identities, administrator requests and allowlisting.

Start with [the public contract or composition](model.ts). Keep UI in `components`, authorized orchestration in explicit `use server` actions, and persistence/provider work in `server` when needed. The feature stylesheet owns its prefixed product selectors.

Follow [Architecture](../../../docs/architecture.md#feature-ownership-and-frontend-composition--2026-10-23), [the domain vocabulary](../../../docs/domain.md), and [the component library](../../../docs/component-library.md). Imports must satisfy the explicit dependency policy; shared UI never imports this feature.
