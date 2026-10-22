# Roadmap and decision register

M1 has a first code implementation: capture, access, and invitation links. The core M1/M2 journey is now verified against dedicated Clerk/Neon development resources; launch checks and remaining lifecycle operations are still outstanding. M2 now has an implementation of both flows, answers, honest progress, conflict detection, and revisiting. Authenticated capture, invitations, answers, edit conflicts, and removal are verified on development services; M3 onward remains unimplemented. Exit criteria describe future evidence required, not promises of a timeline. Requirement IDs refer to [requirements](requirements.md).

| Milestone | Deliverable | Exit evidence / dependency |
| --- | --- | --- |
| M0 — Foundation | This documentation and initial PR | Links, flow coverage, diagram rendering, and docs-only diff reviewed. |
| M1 — Private capture | App shell, Clerk sign-in, project capture, membership/invitations | Resolve membership authority/roles/invitation policy first. R1–R3 verified with multiple identities/projects; isolated persistence and reload. |
| M2 — Guided work | Both versioned flows, forms, progress, revisiting, accessible 2D navigation | R4–R7 and the functional part of R11; no 3D dependency. Preserve answers across navigation/reload and upstream changes. |
| M3 — Work together | Project/stage/node comments, decisions, activity, edit conflicts | R8–R9; settle retention/deletion policy. Verify authorship, conflict reconciliation, and access failures. |
| M4 — Context portability | Preview/copy/download Markdown | R10 and the full export fixtures. This is the first AI-adjacent release; no model integration required. |
| M5 — Spatial delight | Refined 3D stage exploration and art direction | Remaining R11; compare against the usable 2D baseline on mobile, keyboard, screen reader, and reduced motion. |
| M6 — Grounded chat | Project assistant with sources and explicit unknowns | R12; resolve provider, consent, cost, and retention. Verify current access and advisory-only behavior. |
| M7 — Selected work by agents | User-triggered node/stage runs and reviewable output | R13; scope, history, revocation, stale results, and cancellation tests before enabling tools. |

Lightweight visual prototypes may inform M2 without delaying functional access/export milestones. Public launch additionally needs operational checks in [architecture](architecture.md), recovery verification, and real user-journey testing. Completing a milestone locally is not deployment verification.

## Confirmed decisions

| ID | Decision | Why / consequence |
| --- | --- | --- |
| D1 | Simple Vercel app, Clerk identity, Neon Postgres | Keeps an agreed platform direction without selecting every library now. |
| D2 | Project-specific members and invitations | A friendship group is not a single global workspace; people can join different ideas. |
| D3 | Venture and Creative/fun flows as written | Supports purposeful validation and making things just for enjoyment. Keep the current creative version for now. |
| D4 | Named stages → downward subdiagram → guided node form | Makes a large process approachable one question at a time. |
| D5 | Revisit freely; negative findings count as learning | Progress should not reward unsupported certainty. |
| D6 | Export before embedded AI; chat before scoped agent execution | Provides portable context first and gives later AI a clear access/review boundary. |
| D7 | 3D/chill/piratey/hackery with accessible fallback | Visual delight must coexist with readable forms and usable mobile interaction. |
| D8 | Documentation-only foundation | No application implementation or service provisioning in this work. |

## Proposals and open questions

| Topic | Proposed direction / question | Resolve before |
| --- | --- | --- |
| Membership authority | Compare one Clerk organization per project with Postgres membership; choose one authority. | M1 persistence/access |
| Roles and ownership | Owner/member policy in collaboration; transfer and last-owner protection. Is a viewer role needed later? | M1 |
| Capture/flow choice | Save name/description first, then select flow. Defer changing an existing project's flow. | M1/M2 |
| Invitations | Verified-recipient, expiring single-use invitations. Choose expiry and delivery provider. | M1 invitations |
| Technical stack | Next.js/TypeScript is proposed; choose versions, ORM, driver, and hosting region with current documentation. | App scaffold |
| Progress semantics | Explicit node/stage/project states and human-reviewed outcomes in domain. | M2 |
| Comments and retention | Flat discussions; own edits; owner moderation; tombstones. Set retention, account/project deletion, and historical identity rules. | M3 storage |
| Art direction | Prototype ship workshop or floating islands; palette/assets and 3D library undecided. | M5 |
| AI choices | Provider/model, budgets, consent, transcript access, retention, tools, execution host. | M6/M7 |

When a proposal is accepted, record its date, reason, and consequence here and update the canonical document. Add a dedicated decision record only when the tradeoff warrants more space. Do not treat the existence of this document as approval of every proposed implementation detail.

## Implementation choices — 2026-10-21

Made under the request to begin building; these are engineering choices, not newly invented product requirements.

- Next.js/TypeScript with parameterized node-postgres queries and explicit SQL migrations.
- Clerk identity with Postgres as the sole project membership authority; owner/member roles.
- Name and description capture before flow selection.
- Seven-day verified-recipient invitation links, manually shared; no email provider provisioned.
- Dedicated development services were authorized and connected on 2026-10-22; deployment remains unconfigured. See [development](development.md) for evidence and limits.

These resolve the membership, initial roles, capture order, initial invitation duration/delivery, and scaffold questions above. Ownership transfer, provider hosting region, and later policy questions remain open.

The M2 implementation adopts the domain status proposal, template version 1, and explicit human stage reviews. A read-only public sample illustrates the interface without exposing real project data.

## Language support — 2026-10-22

The user requested English and Spanish with switching in both directions. The header exposes both language names, remembers the choice in a one-year browser cookie, and defaults to English when no supported preference exists. Spanish uses familiar Rioplatense wording. The interface, both guided flows, feedback, and embedded Clerk components follow the choice. User content and canonical stored choices remain unchanged; switching preserves in-progress forms. No schema migration or automatic translation of project data is involved.

## Desktop workspace — 2026-10-22

The user requested much denser desktop forms and overviews, with useful ultrawide support and the existing phone design preserved. Compact is the default desktop density; Comfortable remains selectable. This is responsive workspace layout and a saved presentation preference, not a change to the flow template, data, or progress semantics.

## Direct interface and signed-in home — 2026-10-22

The user requested a professional, direct interface and projects as the signed-in home. Public visual styling remains; working-screen copy is concise and neutral. Labels may change while stable flow/node IDs, persisted choices, and user-authored content remain intact.

## Optional 3D project mini-view — 2026-10-22

The user requested a project-page toggle for a Three.js mini-view while preserving the tree. The mini-view uses the existing authorized guidance: ordered stages, each stage's dependency branches, saved node states, and explicit reviews. Upcoming stages remain visible for context. It represents saved work, not a chronological history of stage visits; no visit tracking or inferred completion is introduced. The ordinary tree and editors remain mounted below it. Three.js is loaded only when the mini-view is opened. No service provisioning or deployment is part of this change.

The supplied visual reference was accepted for this mini-view's art direction: wireframe volumes in a dark spatial grid using Nakama’s existing brand palette, with readable semantic labels and unchanged progress/access semantics. This narrows the visual proposal for the map without applying the treatment to answer forms.

## Title-only project cards — 2026-10-22

The user requested project cards containing only the title. Remove descriptions and role/privacy labels from this overview to make the project list easier to scan. No project data or access policy changes.

## Project-card stage timelines — 2026-10-22

The user requested a small horizontal timeline beneath each title instead of a tree in the project list. Use saved question progress and explicit stage reviews, preserve revisit/block/skip semantics, and keep title-only cards free of descriptions and role labels. Summaries are fetched in one membership-scoped metadata query without loading answer text or review rationale. No schema migration or new tracking is needed.

## Aligned project-card rows — 2026-10-22

The user flagged empty gaps below shorter cards. Compact desktop cards now stretch within each grid row, maintaining aligned card bottoms and consistent spacing when only some projects have timelines.

## Placeholder card timelines — 2026-10-22

Projects without a selected flow display a static muted placeholder timeline instead of a visible choose-flow message. Empty rings and label bars preserve card structure without asserting stage names or saved progress.

## Owner project editing and deletion — 2026-10-22

The user requested the ability to edit and delete projects. Owners can edit name/description and permanently delete a project with exact-name confirmation. Guided metadata edits preserve revision history and review invalidation; stale project snapshots fail without overwriting work. Deletion removes all dependent project records in one transaction, with no in-app recovery. No schema migration, service provisioning, or deletion of existing user projects is performed during implementation. This resolves whole-project retention for this operation; account deletion and ownership transfer remain deferred.

## Administrator-controlled signup whitelist — 2026-10-22

The user designated their verified account as the sole application administrator and requested control over who can sign up. Use the existing Clerk email allowlist for signup and app admission, with owner-managed project membership remaining separate. Add a bilingual Administration screen for exact-email additions/removals. Do not auto-approve existing accounts or grant the administrator global project access. Store the designated admin email in server-only environment configuration, keep the administrator's entry protected, and send no notification emails. Clerk's existing development instance and hosting environments are configured under this request; no new service or database schema is provisioned.
