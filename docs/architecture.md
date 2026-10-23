# Architecture direction

**Confirmed:** a simple app on Vercel, Clerk for identity, and Neon Postgres for persistent application data. The first implementation uses Next.js/TypeScript, Clerk identity, and application-owned Postgres memberships. The deployed app and local development currently use the configured Clerk and Neon development resources. The schema/type refinement has been released with migrations 010–012; the development guide records verification. Remaining choices below retain their proposal status.

```mermaid
flowchart TD
  UI["Browser: stages, trees, forms"] --> APP["Vercel application server"]
  UI --> AUTH["Clerk sign-in"]
  APP --> AUTH
  APP --> POLICY["Current project access policy"]
  POLICY --> DB["Neon Postgres: project content"]
  APP --> EXPORT["Authorized Markdown export"]
```

## Proposed implementation shape

The first slice uses a single full-stack Next.js application with TypeScript. Keep UI, authenticated server operations, policy checks, flow definitions, and persistence in clear modules within one repository. Installed versions are pinned in package-lock.json. The initial persistence layer uses parameterized SQL with node-postgres and an explicit migration runner; it does not add an ORM. Avoid a separate API service until a concrete workload requires it.

Browser code renders guidance and sends edits; the server validates identity, membership, target ownership, inputs, and revisions before accessing Postgres. Never ship database credentials or Clerk secrets to the browser. Save answers and their activity events atomically. Prefer plain structured data for flow templates so the 3D and accessible views share the same content and behavior.

Clerk establishes identity. [Clerk Organizations](https://clerk.com/docs/guides/organizations/overview) supports grouping users with roles and memberships. The implementation chooses Postgres membership for direct transaction-scoped access checks. The considered alternatives were:

| Option | Advantage | Cost / decision needed |
| --- | --- | --- |
| One Clerk organization per project | Reuse organization membership/invitation capabilities | Validate UX, current pricing/limits, role mapping, and revocation freshness; do not make organization selection an accidental capture barrier. |
| Clerk identity + membership in Postgres | Direct project-specific semantics and one transaction boundary for content/access | Nakama must implement invitations, roles, lifecycle, and their security checks. |

Postgres is the membership authority. Clerk Organizations is not enabled. Do not keep two competing membership sources. If using Organizations, application data still needs project-scoped authorization. Do not enable Organizations merely because it is available.

## Data and environments

Postgres stores the [domain model](domain.md), with project-scoped queries, constraints, revision history, and indexes shaped by actual access patterns. Specify deletion/retention before storing historical personal data. The initial schema lives in migrations/001_private_projects.sql; later historical-content policy remains open.

[Neon pooling](https://neon.com/docs/connect/connection-pooling) uses PgBouncer and provides pooled connection endpoints. Proposal: pooled application connections, with a separately configured direct connection for migration/admin work that needs session behavior. Select a driver based on the chosen Vercel runtime; do not assume every transport supports the same transaction behavior.

[Vercel environments](https://vercel.com/docs/deployments/environments) distinguish local development, preview, and production. Proposed policy: separate development/preview credentials and isolated test data; preview builds never run against production by accident. Keep migrations as reviewed files and an explicit deployment step, not an unexamined side effect of every build. Test migrations and restore procedures before production changes.

## Security and operational direction

Centralize the [access rules](collaboration.md). Use safe text rendering and validation for user content, including any later Markdown renderer. Log operation IDs, failures, and timings without answer bodies, tokens, or secrets. Add basic error recovery and a visible save status before visual polish. Backups, restore verification, data retention, and service cost limits become launch criteria, not claims of current readiness.

M4 export runs through the same policy and data layer. Later AI gets a scoped context builder and proposals rather than unrestricted database access; [the future AI contract](context-and-ai.md) owns those rules. No provider, vector database, background execution platform, or model choice is committed now.

Official references above were consulted on 2026-10-21. Recheck technical details when implementation begins; they establish platform capabilities, not a working Nakama integration.

## Application admission — 2026-10-22

Clerk owns the signup email allowlist in addition to identity. The server verifies admission on every private request using verified account emails and the current list; it does not cache admission across requests. This adds an identity-provider request for ordinary members and deliberately fails closed on errors. The configured administrator bypasses the list lookup for admission so list maintenance cannot lock the admin out. Project access remains governed by Postgres memberships, with no application-admin bypass. The same Clerk development instance currently backs development, previews, and the public release, so its signup restriction/list changes apply to all three.

## Access-request storage — 2026-10-22

Use Clerk's existing waitlist-entry Backend API as a small pending request queue, independently of signup mode. Do not switch the instance to Waitlist/Invite-only mode: the current exact-email allowlist remains enabled. All create operations specify `notify: false`; approval adds an allowlist identifier instead of issuing a Clerk invitation. Admin reads use paginated pending entries and omit emails already allowed. Public submissions validate exact emails and have a bounded per-runtime/IP-hash cooldown in addition to provider API limits. The in-memory cooldown is not a distributed quota; no raw IP, password, or authentication token is stored by the request queue. Approval and request cleanup are separate provider calls, ordered to avoid losing unapproved requests.

## Project tasks and Lock-In interchange — 2026-10-22

`task-model.ts` owns browser-safe tree numbering/types; `lockin-format.ts` owns version 1 file validation/conversion; `tasks.ts` owns project-authorized transactional writes, list revisions, import receipts, and export snapshots. Server Actions resolve current app admission before invoking services. Project-row locks serialize task writers and protect consistent reads/exports. A composite parent foreign key prevents cross-project trees. Import validates one selected project, remaps IDs, and inserts its ordered tree in one statement inside the event/receipt transaction. File previews/downloads use the browser; the server does not read the user's local Lock-In store.

## Bounded private artifact storage — 2026-10-23

Migration 008 adds project artifacts and private file bytes in the existing Postgres database, plus artifact activity kinds. This bounded initial implementation provisions no service. There are at most 200 artifacts per project, six images per image artifact, 2 MiB per image (40 million decoded pixels across frames), and 512,000 bytes per Markdown document. Uploads are sequential single-file Server Actions, bounded to 3 MB request bodies; Markdown replacement is atomic. Images are validated with Sharp, using detected format for response MIME and normalizing a mismatched image filename extension.

Library queries return metadata and a cover file ID, never file bytes. Image bytes load through a private, noncached file route that checks current membership and all three nested IDs. Markdown detail reads only its single bounded text payload. The global library uses membership joins and exposes no unrelated project metadata. A future larger-file workload should move blobs behind an equivalent private object-storage gateway; no such service is configured now.

React Markdown with GFM provides headings, lists, task boxes, tables, and code blocks. Raw HTML is skipped, default safe URL handling remains enabled, and external image tags render as links. No MDX, arbitrary HTML, code execution, or syntax-highlighting runtime is enabled. The image lightbox is a viewport-sized native dialog with keyboard close/previous/next and focus restoration.

## Project lineage persistence — 2026-10-23

Migration 009 adds directed `project_links` with a composite primary key, self-link constraint, cascading endpoint references, and reverse lookup index. The lineage service checks membership in both endpoints in a stable order before writes. Graph mutations serialize through transaction advisory lock 734922; a recursive descendant query rejects cycles, including races between opposite edges. Lists join the opposite endpoint's current memberships. Atomic project setup reuses one transaction for project, flow, and source links. Relationship edits do not duplicate endpoint names or IDs into activity, preventing later visibility changes from leaving related project metadata in another project's history.

## Schema and TypeScript contracts — 2026-10-23

SQL migrations own storage shape and the closed domain vocabularies. Migrations 010–012 normalize artifact to-dos into `artifact_tasks`, derive file size from its bytes, introduce shared Postgres enum types, and enforce additional state/revision/reference/graph/output integrity. Artifact tasks retain their stable IDs, explicit order, and the artifact-wide optimistic revision; they remain distinct from hierarchical project tasks. The `(project_id,artifact_id)` foreign key prevents cross-project task attachment. Position uniqueness is deferred so an atomic reorder can temporarily reuse positions. File metadata continues to be read independently of payload bytes. Library cards fetch task/done counts rather than task IDs or titles. Task replacement/reordering uses a batched upsert, keeping database round trips bounded independently of the 100-task limit.

`npm run db:types` constructs an empty, disposable PGlite database from every migration, introspects columns/nullability/enums, and generates `src/lib/database.generated.ts`. It needs no credentials or hosted connection. Storage models and shared Zod validators reuse those generated types and enum values. `npm run db:check`, also run by typecheck and the test suite, rejects stale generated output. Unknown SQL types fail generation instead of silently becoming `any`. Timestamps use the normal node-postgres `Date` representation; `bigint`/`numeric` retain the driver's default strings. Generated storage rows are not insert/update payload types: defaults and generated columns still belong to SQL and explicit service inputs.

`row-schemas.ts` describes named query projections, checked against storage types with `satisfies`; `queryRows` validates actual driver results before returning domain objects and emits a body-free error on mismatch. Principal membership, project, guidance, task, artifact, relationship, progress, comment, and activity reads use these decoders. Parameterized SQL and transaction-scoped membership checks remain in place. A generic `query<T>` annotation alone is not proof that SQL selects T; smaller internal queries still require deliberate review. This is not a compile-time SQL parser or a new ORM.

The compiler now checks unchecked index access, exact optional properties, consistent returns, switch fallthrough, unused locals, and unused parameters in addition to strict mode. Expected row/template lookups use a checked `required` helper. Task editor states require the selected task for edit/delete/complete operations. Task and artifact action results distinguish successful saves, conflicts, creation, deletion, and failures. Node discussion targets require a stage. Flow registry keys must agree with each flow's ID, and template collections are read-only through their public types.

Intentional historical snapshots remain: membership-time comment/activity author names, answer revisions, and recorded project-capture answers preserve authorship and prior meaning. Project name/description remain the current header projection synchronized by the existing atomic guidance service. This refinement does not replace history with joins to mutable current records or introduce a second identity authority.

Database triggers protect direct/future writers as well as the application: project/task ancestry is acyclic, artifact kind is immutable, and final artifact output must match its kind, readiness, and file limits. Deferred output checks permit atomic Markdown replacement and changing readiness with file operations. Per-artifact file locks prevent concurrent uploads from exceeding cardinality limits. Binary image validity and template-specific question/stage membership still require the application validators; SQL constraints do not parse image formats or duplicate the source-controlled guidance templates.

The existing membership/project selectors and global library still need cursor pagination for large numbers of projects; this refinement preserves their current complete-list behavior. Per-project task/artifact limits and smaller card projections reduce payloads but do not establish a measured production capacity limit.
