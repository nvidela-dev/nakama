# Roadmap and decision register

M1 has a first code implementation: capture, access, and invitation links. The core M1/M2 journey is now verified against dedicated Clerk/Neon development resources; launch checks and remaining lifecycle operations are still outstanding. M2 now has an implementation of both flows, answers, honest progress, conflict detection, and revisiting. Authenticated capture, invitations, answers, edit conflicts, and removal are verified on development services; M3 now includes contextual comments and an activity feed. M4 export and M6/M7 AI remain unimplemented. M5 has an optional Three.js mini-view; broader accessibility/performance acceptance remains outstanding. Exit criteria describe future evidence required, not promises of a timeline. Requirement IDs refer to [requirements](requirements.md).

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

## Main-screen management — 2026-10-22

The user requested easy access to project editing/deletion and whitelist management from the main screen. Add direct owner-card controls opening a dialog and an administrator-only sidebar whitelist panel. Reuse existing server actions, permission checks, conflict handling, and deletion confirmation. Include flow content revisions in the existing membership-scoped project-list query for reliable edit snapshots without per-card reads. Keep private project access and app administration separate.

## Access requests alongside the whitelist — 2026-10-22

After learning that rejected authentication logs are not exposed as a list through Clerk's public APIs, the user explicitly chose access requests collected in Nakama. Add an email-first signup gate and request form on the access-required page, plus administrator-only Allow/Dismiss controls on Administration and the main screen. Use the existing provider's pending waitlist-entry API without changing signup mode or sending emails. Preserve whitelist admission, email verification, and project membership as separate checks. This starts new request collection; it does not backfill historical Clerk rejections or assert ownership of submitted addresses.

## Contextual comments and project activity — 2026-10-22

The user selected contextual comments and an activity feed as the next implementation. Adopt flat plain-text discussions targeting exactly one project, stage, or node; allow author edits, author deletion, and owner moderation. Comment deletion permanently blanks the body and retains an attribution/timestamp tombstone, while whole-project deletion removes comments and activity. Do not retain deleted bodies in feed events. Edits and removals check the displayed revision, retaining the local draft on conflict.

The feed combines existing answer revisions and stage-review history with newly recorded project/flow, invitation lifecycle, membership, and comment events. Historical invitation/member events are not invented or backfilled. Events omit comment bodies, invitation recipients, tokens, and invitation URLs. New events commit with their source writes. Use a 25-item keyset page with timestamp precision preserved. No automatic publication, notifications, AI, or real-time subscription is added. This resolves the comment retention/moderation proposal for this implementation; export and account-retention policy remain separate work.

## Project control placement — 2026-10-22

Place owner edit/delete controls beneath the right sidebar panel. Replace the large mini-view text button with an accessible cube icon immediately left of the progress wheel; keep the ordinary journey visible and the optional map initially hidden.

## Installable web app and metadata — 2026-10-22

The user requested a favicon, metadata, and PWA support. Add a dark/lime Nakama monogram, browser and Apple icons, localized page/social metadata, and a public web manifest with standalone display and a stable root identity. Installation uses browser-provided controls. Keep the app online-only: no service worker, offline project storage, push notifications, or cached private responses are introduced. Installed launches still use the existing admission and membership checks.

## Wave brand mark — 2026-10-22

The user replaced the asterisk/initial icon direction with a wave, retaining the existing dark green, lime, and pink palette. Use the same wave silhouette for interface brand motifs, the favicon, Apple touch icon, and PWA install icons. The creative-flow choice symbol remains a separate flow indicator.

## Progress above the right panel — 2026-10-22

The user requested the question-progress bar, answered/skipped/blocked counts, project state, and progress controls stacked above the right sidebar, and removal of the flow-name/“Your path” banner. Keep saved-question progress semantics and the mini-view toggle intact. On phones the sidebar retains its single-column position after the journey. Keep this improvement local until the user explicitly requests pushing the accumulated changes.

## Compact question steps — 2026-10-22

The user requested much more compact step cards. Put the title and explicit state on one row, with dependency context and node kind beneath; reduce padding and connector gaps while retaining a 44px minimum target. Preserve branch rows, dependency labels, revisit states, and existing navigation. Keep local with the pending sidebar improvement.

## Ultrawide discussion column — 2026-10-22

The user requested a three-column ultrawide workspace with discussion history and composer always on the left. At 2000px and above, use discussion / project work / progress-and-members columns in both desktop densities, including projects before flow selection. Keep the left discussion panel sticky with scrollable history and the composer in the same panel. Preserve one mounted discussion instance across viewport changes and existing contextual project/stage/node scopes; this does not combine scopes or introduce live chat. Smaller layouts retain discussion below project work. Keep local until explicitly asked to push.

## Vertical overall-stage rail — 2026-10-22

The user requested overall stages as a vertical left-hand navigation rail rather than horizontal tabs. On desktop (1024px and above), place the ordered stage links to the left of the current stage/question content in both densities, retaining the active-stage highlight and stable links. In ultrawide mode this rail sits inside the center work column, with discussion farther left and progress/members on the right. Phones retain the breadcrumb and All stages overview. No navigation or progress semantics change; keep local pending push authorization.

## Return to the stage after saving a step — 2026-10-22

The user requested returning to the step list after saving. After a confirmed successful step save (including drafts and reconciled conflicts), navigate to the current stage without a node selected. Validation failures and unresolved conflicts keep the editor and local draft open. Existing save authorization, revision checking, and revalidation remain unchanged. Keep local with the other pending improvements.

## Remove the redundant Idea captured step — 2026-10-22

The user requested removing “Idea captured” from the Venture flow. The Idea stage now consists only of Name and Brief description; capture already supplies these answers. Retire the outcome node from the template without renumbering stable IDs or changing the stored template version, so existing projects remain usable. No stored answers, history, comments, or activity are deleted. Question counts remain unchanged because the removed node was an outcome, not a question. Keep local with the pending improvements.

## Collapsible members and invitations — 2026-10-22

The user requested the Members section as a dropdown. Use a native disclosure closed by default, with the member count visible in its summary and membership/invitation controls inside. Keep Activity independently expandable. Existing owner-only controls and server authorization remain unchanged. Keep local with the other pending improvements.

## Distinct stage rail and synchronized progress — 2026-10-22

The user requested visual synchronization of stages with their steps and a different color for the left rail. Use the existing pink accent for stage links and a stronger pink selected state, keeping question cards green. Each stage shows its saved answered-question count and explicit review/in-progress state, including revisit flags. Answering all questions does not automatically mark a stage reviewed. Counts update from the same authorized guidance as the step list after saving. No additional persistence or inferred completion is introduced.

## Full-width map above stage navigation — 2026-10-22

The user requested the opened 3D map to push down both the overall-stage rail and substeps. Place the map above the entire stage/editor layout within the project-working column, spanning its full width. Keep the discussion and progress/members columns independent and the ordinary editor mounted when toggling the map. No change to map content or authorization.
