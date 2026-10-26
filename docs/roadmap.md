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

## Align stages with substeps and raise headings — 2026-10-22

The user corrected the earlier color/alignment interpretation: the stage rail should be lighter green, and its first link should align with the first substep rather than the stage heading. Move breadcrumb, stage question, and guidance into a shared row above both columns. Move the project title beside the Your projects link, with description directly below. This supersedes the pink rail direction; keep the selected-stage indicator and saved-progress counts.

## Align the right sidebar with project steps — 2026-10-22

The user requested the right panel aligned with the middle step content. On desktop, align its top to the first step/editor row, matching the stage rail below the shared heading. Measure the actual content offset so translated headings, wrapping, and the expanded map stay aligned without fixed spacing guesses. Preserve the phone stack and existing access/data behavior.

## Remove stage helper sentence — 2026-10-22

The user requested removing the “Open a step to see its question and example…” helper sentence from expanded-stage headings. Keep the stage question and breadcrumb. The measured sidebar offset follows the shorter heading automatically.

## Clearer breadcrumbs — 2026-10-22

The user requested improved breadcrumbs. Use a semantic ordered path with a small overview icon, quiet chevron separators, compact hover targets, and a distinct current-location pill. The current stage is plain current-location text on stage pages; in a question editor it links back to the step list and the question becomes current. Wrap long paths on phones and preserve existing routes.

## Monospace interface and heading controls — 2026-10-22

The user requested a monospaced font throughout and smaller map/progress icons on the stage-question heading row. Use the system monospace stack (SF Mono/Menlo on macOS), removing the Google sans-font request and overriding heading/brand font choices. On selected stages and question editors, move the single map toggle and progress wheel beside the stage question; keep counts and progress bar in the right panel. Overview controls remain in the progress panel. Use 32px desktop controls with a preserved 44px touch target for the map button.

## Approved-person invitation dropdown — 2026-10-22

The user clarified that “dropdown” means selecting an invitee from approved people, not collapsing Members. Restore the expanded Members section. Project owners may discover approved email candidates, excluding existing member accounts and the owner's verified emails; this does not grant allowlist administration. Recheck project ownership, approval, and non-membership on invitation submission. Preserve verified-recipient invitation links and manual sharing; do not directly add people or send emails. Approved entries can be selected before they have created an account.

## Wave-fading header mesh — 2026-10-22

The user requested a futuristic dotted gradient mesh that fades in a wave shape on the header. Use a static CSS dot field and a small SVG wave mask, retaining the green/lime palette. The decoration sits behind the interface, does not intercept input, and adds no animation or rendering dependency.

## Softer header mesh fade — 2026-10-22

The user requested a less rigid mesh and authorized pushing the accumulated changes. Feather the wave boundary, fade the pattern earlier, and lower dot contrast so the texture dissolves into the background rather than ending at a sharp contour.

## Yellow-green revisit text — 2026-10-22

The user requested replacing the pink/red revisit text in the stage rail with a greenish-yellow tone. Use muted chartreuse (#d5df8a), retaining the existing saved status and revisit wording.

## Investigation and project outcomes — 2026-10-22

The user accepted Investigation as a third project type, using Frame → Explore → Gather → Synthesize → Deliver. Start with the existing authorized answer/revision/comment model and a final output choice supporting conclusion, actionables, artifact, or combination. Preserve sources, contradictory evidence, and uncertainty through explicit questions. No automatic research or artifact generation is introduced.

The broader accepted direction is that projects have outcomes, can link to one another, and can spawn several follow-up projects that remain linked. Begin with Investigation; cross-project outcome entities, relationships, and spawning controls are subsequent implementation. Each future linked project must keep its own membership checks: a link must never reveal private names/context or grant access. Outcome choices in this slice are saved answers, not a new universal outcome entity.

The user authorized implementation and pushing this change, including the pending yellow-green revisit text. Migration 004 only expands the allowed flow IDs and retains existing project data.

## E-shop, SaaS, Importation, and Consultancy — 2026-10-22

The user requested the listed project types, with a generic or shirt-specific E-shop. Add five selectable flow templates: E-shop, Shirt E-shop, SaaS, Importation, and Consultancy. Each uses five domain-specific stages, explicit outcome/follow-up questions, bilingual guidance, and existing private project services. Reuse the first two capture nodes for metadata across every type rather than extending hard-coded flow-name checks. Migration 005 expands only the allowed flow IDs. Switching existing flows, linked-project spawning, and operating external businesses/services remain outside this slice.

## Project to-do lists and Lock-In interchange — 2026-10-22

The user requested Lock-In functionality inside every Nakama project with a browser-oriented interface, then requested Lock-In import/export compatibility. Add a To-do tab available with or without a guided flow, preserving the guided workspace and its drafts. Port hierarchical tasks, computed display numbers, Ready/In progress/Done statuses, explicit parent-vs-subtree completion, confirmed subtree deletion, and saved expansion state. Add click-based creation, title editing, search/status filters, and expand/collapse-all controls. Tasks do not affect guided answer progress or imply stage reviews.

All current project members may read/write/import/export tasks, using the same admission and membership checks as other project work. Use stable server IDs and a project task-list revision to reject stale edits, deletions, and cascades; retain drafts and require explicit reconciliation. Task events retain actor/action without task bodies. Whole-project deletion cascades through tasks, list revisions, and import receipts.

Import previews a selected project from a Lock-In version 1 file and appends its tree after confirmation; it does not replace project metadata or existing tasks. Remap source IDs, preserve titles/statuses/hierarchy/collapse/timestamps, and block an exact repeated project import. Export the authorized current project's tasks as a standalone Lock-In version 1 state file. This is file interchange, not ongoing synchronization or importing application memberships. Bound files to 512 KB, projects to 2,000 tasks and 32 levels. No automatic reading or mutation of the local Lock-In state file is authorized or performed. Migration 006 adds task tables and activity kinds.

## Concentric project progress — 2026-10-23

The user requested concentric circles that fill the larger circle on project cards. Replace the rim sweep with a centered lime disc whose diameter follows answered-question coverage, filling the interior at 100%. Keep counts, explicit review checks, revisit flags, and accessible status text; coverage still does not imply review.

## Standard widescreen three-column workspace — 2026-10-23

The user requested the three-column private-project workspace on normal widescreen monitors, with contextual discussion/chat on the left. Enable it at 1280px in both densities, using bounded flexible sidebars and the remaining width for project work. Keep compact stage summaries and answer forms stacked inside the narrower center column. Smaller screens retain the existing layout and one contextual composer.

## Unread comment notifications — 2026-10-23

The user requested a notification bell for all unread comments on their projects. Add a per-person in-app inbox across current memberships, excluding own/deleted comments, with durable read receipts, counts, paginated previews, exact-context links and explicit mark-as-read. Opening the inbox does not mark comments read; viewing a comment in discussion for one second in a foreground tab does. Existing comments begin unread, and edits do not reset read status. Keep app admission and current project membership checks on all reads/writes. Refresh on opening/navigation/focus/confirmed read and each visible minute. No email/push delivery is included.

## Header and footer controls — 2026-10-23

The user requested a smaller borderless bell that fits navigation, and moving language plus Compact/Comfortable controls to the footer in place of its right-hand description. Retain saved preferences and accessible focus/touch targets.

## Header project navigation — 2026-10-23

The user requested a chevron to the right of Your projects that opens a fixed-height scrollable list for direct project navigation. Preserve the overview text link and reuse the membership-scoped project list behind app admission; return only project IDs/names and reload each opening. Keep keyboard access, current-project indication and phone viewport bounds.

## Clean centered progress circles — 2026-10-23

The user requested removing exclamation marks and showing only concentric circles on project-list timelines. Remove all interior symbols and review-based border coloring, and explicitly center each progress disc with 50% positioning and translation. Keep review/revisit information in tooltips and accessible labels; counts remain visible.

## Artifact outputs, viewers, and to-dos — 2026-10-23

The user authorized implementing artifacts as named project/optional-phase outputs, with an across-project library and links back to context. They explicitly allowed artifacts in progress with their own to-dos, requested image uploads with full-screen expansion, software GitHub links, Markdown-file uploads and a Markdown reader. In progress may precede the payload; Ready requires the appropriate upload/link. Use image sets (up to six), one replaceable Markdown document, and an immutable artifact type.

Implement the initial bounded private uploads in the existing database rather than provisioning a service, preserving current membership checks for library/detail/file/actions. Artifact checklist tasks are flat and independent of project To-do/Lock-In and guided progress. All current members may edit/delete, using one artifact revision, draft-preserving conflicts and exact-name deletion confirmation. Safe Markdown skips HTML and external image loads; image expansion uses an accessible viewport dialog. Larger files, retained artifact versions, cross-project artifact sharing, repository provisioning, and generation remain outside this request.

## Matching compact footer controls — 2026-10-23

The user requested matching footer preference heights at the smaller control’s scale and reducing the overall size. Use a 30px outer height for language and layout controls, smaller text/padding and a tighter gap.

## Footer administration link — 2026-10-23

The user requested moving Administration to the footer. Keep the same verified-administrator visibility and protected destination/actions, and place the small link alongside footer preferences.

## Single-button guided project setup — 2026-10-23

The user requested replacing the standing New project form with a button, moving name/description into the overall starting process, and making project-type choices much smaller and a grid. Implement a two-step modal (type, then details), shared compact type tiles for new/existing projects, local draft retention across Back/Close, and a single final create action. Keep Choose later so previously accepted flow-free tasks/artifacts remain possible. Atomically create project, owner membership, flow and captured answers; failed setup must leave no partial project.

## Accepted: many-to-many project spawning — 2026-10-23

The user requested that projects spawn other projects, with several source projects and several resulting projects. Implement directed lineage and reuse guided project setup, with the current source preselected and additional sources optional. Also allow linking existing projects and removing links. Each endpoint remains an independent project/access boundary; current membership in both permits a link change, with no membership or content inheritance. Use acyclic ancestry (reject self-links and cycles) so origin remains meaningful. Deleting an endpoint removes its links, never other projects. This supersedes the earlier future-work status for relationships/spawning; universal outcome records remain deferred.

## Accepted refinement: relational storage and schema-derived types — 2026-10-23

The user requested database normalization and a refined TypeScript system that can scale with the repository. Keep reviewed SQL migrations and the existing driver; generate storage types and closed vocabularies from the migrated schema, validate principal query projections, and enable stricter compiler checks. Normalize artifact to-dos while preserving IDs/order/revisions and all project authorization boundaries. Enforce cross-project references, acyclic ancestry, and artifact output invariants in SQL as well as services. Preserve deliberate historical snapshots and source-controlled flow guidance rather than adding competing mutable copies.

Migrations 010–012 are implemented and verified locally. They change the artifact query contract and therefore require a coordinated code/schema release. The shared development/public-release database must not be migrated ahead of its matching code. No hosted service provisioning or push/deployment is part of this refinement.


## Released: normalized schema and strict domain types — 2026-10-23

After explicit user authorization, the schema/type implementation was applied to main and migrations 010–012 were committed to the shared database with a coordinated deployment cutover. A private backup restoration rehearsal and in-transaction preservation checks passed. The exact main implementation SHA and all twelve migration checksums were verified, followed by four authenticated live browser journeys. See the development guide's release evidence. This supersedes the earlier local-only/pending-release status for this refinement.

## Accepted refinement: align project columns — 2026-10-23

The user requested a shared top edge for the three project columns. Align discussion, project-work tabs, and progress/sidebar at the workspace start in both densities. Remove the measured content offset; expanded headings and maps do not move the sidebar. Preserve the existing responsive stacking and sticky discussion behavior.

Local validation: production build passed; a disposable authenticated project verified aligned column tops at 1280/1440/1900px in both densities across overview, stage, question, to-do, and artifact views, plus the expanded map. Responsive stacking and no horizontal overflow were checked at 1024/768/390px. No deployment was performed.

## Accepted refinement: compact linked projects — 2026-10-23

The user requested a much smaller Linked projects panel with smaller fonts. Reduce panel padding, section gaps, heading/body sizes, and desktop controls in both display densities, while retaining touch targets and the existing project-link behavior. Keep these rules scoped so the project setup dialog retains its own layout.

## Accepted refinement: compact members and activity — 2026-10-23

Apply the same compact sidebar treatment to Members, invitation creation/history, and Activity, preserving all actions, disclosure behavior, and touch targets. Scope styles to the private project panel so other member lists and forms retain their layout.

## Accepted refinement: translucent 3D map popup — 2026-10-23

Move the 3D stage map from the inline workspace to a modal popup with a 10% transparent surface (90% opacity), following the user’s correction. Keep graph/controls readable, preserve stage navigation and narrow-screen scrolling, and provide keyboard dismissal and focus restoration. Opening the map must not move the project columns.

## Accepted refinement: complete read validation and remove duplicate task index — 2026-10-23

The user selected two audit findings: finish validating consumed database results, and remove project_tasks_order because task_sibling_order already indexes the same columns. Make raw driver rows unknown, infer read types from explicit decoders, and preserve authorization, locking, revision checks, pagination, and file decoding. Migration 013 removes only the redundant index; the unique constraint and task data remain. The separate ownership-guard proposal is not included. Implementation and migration testing are local; hosted migration and release remain pending.

## Accepted: private operational logging and autonomous diagnosis — 2026-10-23

The user requested a strong backend logging system that supports autonomous diagnosis and explicitly authorized local file storage. Implement structured, correlated operation/database/error events, a private rotating local copy, production stdout/stderr, Next error hooks, and read-only local inspection/import tools. Keep private project content and secrets out of logs through allowlisted schemas and safe propagated errors. Preserve existing feedback, authorization, transaction semantics and framework navigation. No external logging service, public viewer, automatic repair/replay, release, or hosted migration is authorized by this request.


## Accepted: complete typed failure classification — 2026-10-23

The user requested implementing the complete diagnostic pass: distinct type/build, runtime contract, backend/database, external service and compute failure families; required evidence per family; an exhaustive explanation/retry catalog; compiler/build/CI collection; safe service and hosting adapters; matching build/source locations; and a unified local reader. Preserve private-data exclusion, framework navigation, access rules and transaction semantics. Hard termination requires supervisor/platform evidence, and unknown cause must not be presented as timeout or memory exhaustion. This authorizes implementation and local verification, not a deployment, hosted migration, new service, or automatic mutation replay.

## Vercel test-readiness follow-through — 2026-10-23

After the user requested everything needed to test the merged work in Vercel, verify the promoted main deployment, apply pending migration 013 to the documented shared app database, and repair the Vercel log-import default that exceeded the provider's accepted request window. Migration 013 only drops the duplicate index; confirm the unique constraint still owns its index and all migration checksums match. Set the log-import default to 30 minutes and preserve typed diagnostics for explicitly requested rejected windows. A Vercel preview of that small collector adjustment is the review/testing target; do not merge it or change the production code without the user's direction.

## Accepted: feature architecture, shared UI and frontend discipline — 2026-10-23

The user requested a feature-based codebase, frontend performance/UX improvements, an attached reusable component library and Storybook, stronger constraints, and persistent Markdown coding preferences. Keep the existing Next application and domain/access semantics. Make routes compose feature-owned models, services, actions, components and prefixed styles; reserve shared code for browser-safe contracts, pure utilities and reusable UI, and server code for database/diagnostic infrastructure. Keep the library internal and source-shared with Storybook rather than provisioning or publishing a new service/package.

Enforce explicit feature dependencies, acyclic module imports, shared-layer independence, client/server graph separation, and shared native-control usage. Combine those checks with strict types, generated-contract/catalog drift checks, zero-warning lint, formatting, Storybook and behavior/accessibility verification. Record user-expressed preferences separately from chosen engineering defaults in the preferences document. Preserve current project authorization, workflow revisions, task hierarchy/Lock-In interchange, safe artifact readers, drafts and diagnostic privacy.

Remove full templates from the picker/browser graph through a generated summary catalog, isolate language context from preference actions, pass only the selected dictionary, and conditionally load expensive editors/readers/maps. Measure the local production preview before and after; do not equate this with field performance or a deployed release. No hosted migration or service provisioning is needed for this refactor, and no push/deployment is included without further user direction.

## Shared icon library — 2026-10-23

Accepted: use an established icon library for most interface icons while preserving the Nakama wave. Use a typed, explicitly imported Lucide catalog in the shared component library, documented in Storybook. Keep progress geometry and 3D visualizations custom. This implementation is local until pushed and released.

## Project setup source selection — 2026-10-23

Accepted: remove the optional source-project checklist from new-project setup. The contextual Spawn project action still links its source automatically; additional relationships are managed in the Linked projects panel.

## Compact discussion messages — 2026-10-23

Accepted: size discussions like a compact messaging conversation, with author-owned bubbles aligned right, short timestamps and a smaller composer. Move edit/delete into a per-message chevron disclosure. Preserve author editing, owner moderation, explicit delete confirmation, revision conflicts, message links and read tracking.

## Full-width answer editing — 2026-10-23

Accepted: the answer field occupies the full form width, with direction (where applicable) and status stacked underneath at every resolution and density. Remove compact-mode two-column placement and its conflicting breakpoint overrides.

## Project and artifact links in chat — 2026-10-23

Accepted: a composer picker inserts named links to projects and artifacts into chat drafts. Search is bounded and membership-filtered, preserves existing draft text/selection and does not grant destination access. Names are deliberately shared as message text, without automatic metadata previews or new project relationships. No migration or additional service is needed.

## Frontend performance tracking and bundle diagnostics — 2026-10-23

Accepted: expand local frontend performance tracking so bundle composition, client import hotspots, and interactive browser budgets can be inspected and compared before and after optimizations. Combine static `.next` manifest/chunk decomposition across all App Router pages, AST client-import hotspot detection (`es.json`, `zod`, `three`, `react-markdown`), headless browser route/Web Vitals/CDP measurements (`ttfbMs`, `fcpMs`, `lcpMs`, `cls`, `longTasks`, DOM complexity), interactive `/preview` stage/node/lazy-3D-map timing and chunk verification, and Zod-validated baseline comparison and history under `.nakama/performance/`. Keep measurements content-free and local; no external analytics service or deployment is included.

## Animated loading skeletons and compact project timelines — 2026-10-23

Accepted: add structured animated loading skeletons (`stack`, `cards`, `workspace`, `compact`, `map`) across route `loading.tsx` boundaries, `next/dynamic` client chunks (`JourneyMiniview`, `AnswerEditor`, `StageReviewForm`, `MarkdownReader`), and client async popovers (`NotificationBell`, `ProjectNavigation`, `ReferencePicker`), with subtle shimmer and pulse animations disabled under `prefers-reduced-motion: reduce`. Make project-list cards, stage timelines, and project stage-list cards significantly more compact: shrink project card padding and `h3` titles (`15px` comfortable, `13.5px` compact desktop), reduce `.project-timeline .timeline-marker` dots from `24px` to `11px` with vertically centered connectors, and reduce `.stage-card` typography (`h2` `15px` comfortable / `12.5px` compact desktop, `.stage-label` `10px` / `9px`, `small` `9.5px`, `.stage-number` `10px`, `.journey-hint` `10.5px`) while preserving accessible status labels and coarse-pointer touch targets. Frame `.project-working-column` as an enclosed window panel with `.project-work-tabs` as its integrated top header bar so the center workspace matches the left Discussion window and right sidebar panels.


## Tailwind CSS v4 and colocated styling — 2026-10-23

Accepted: replace shared and feature stylesheets with Tailwind v4 utilities on React elements. Keep a single global entrypoint for theme colors, typography, animations, the compact-density variant, and minimal motion resets. Preserve the Nakama appearance, interaction semantics, responsive/density layouts, and test marker classes. Enforce the policy by parsing stylesheets in the architecture check. Next.js and Storybook share PostCSS configuration; existing JavaScript/CSS budgets remain unchanged. This work does not authorize a deployment or database changes.
## Project-card action menu — 2026-10-23

Accepted: move owner Edit/Delete project-card icons into the shared chevron `ActionMenu` used by chat messages, give card titles top padding at a slightly smaller size, and truncate long stage names with an ellipsis (full names remain in tooltips and accessible labels). Permissions, dialogs and deletion confirmation are unchanged.

## Collapsible sidebar panels and activity-scoped discussion — 2026-10-23

Accepted: make each right-column sidebar panel (Progress, Linked projects, Members) an individually collapsible `<details className="panel ...">` disclosure open by default with clean summaries and count badges, retaining the inner Activity disclosure. Switching project workspace tabs to 'To-do' (`tasks`) or 'Artifacts' (`artifacts`) opens a dedicated chat scoped to that activity rather than retaining the previous stage/step discussion, clearing step parameters and establishing isolated activity discussion scopes in `project_comments`.

## Platform engineering and automation flow — 2026-10-24

Accepted: add a dedicated 'Platform' project flow (`id: "platform"`) aimed at internal tooling, automation processes, cloud infrastructure, and Hermes/Nakama service improvements focused on increasing production capacity and operational reliability rather than commercial revenue. It follows the standard Nakama workflow format with 5 versioned stages (`System` → `Blueprint` → `Prototype` → `Integration` → `Production`), topological within-stage dependencies, full Spanish localization, a `Server` icon in the workflow picker, and outputs spanning automation scripts, APIs, IaC, CI workflows, and operational runbooks. Database migration 015 expands PostgreSQL enum `flow_id`.

## System glossary and consistent language — 2026-10-24

Accepted: provide a dense, bilingual `/glossary` reference within Nakama, linked from the footer, with domain definitions, technical identifiers, state contracts, and distinctions between implemented records and conceptual language. Use Flow / Stage / Node / Answer consistently in new code and guidance labels, and qualify project tasks versus artifact tasks. Keep the domain document canonical and use generated storage enum values in the reference. Preserve existing identifiers and interchange compatibility; no schema migration or service provisioning is required.

## Progressive visual system wiki — 2026-10-24

Accepted: expand the glossary into a bilingual system wiki, beginning with concrete examples and visual explanations, then progressively introducing rules, troubleshooting, and the technical glossary. Do not label sections by reader ability. Preserve existing glossary links and anchors; public wiki examples read no private project data. This is educational presentation, with no new service, storage, or AI execution.

## Visual wiki trees and supporting images — 2026-10-24

Accepted: enrich the wiki with expandable, translated tree diagrams and supporting illustrations. Keep relationships and permission rules as semantic text, and label illustrative examples without implying live data or extra capabilities. Images are local optimized assets; no diagram library, service, or private-data read is needed.

## Admission controls only in Administration — 2026-10-24

Accepted: remove the Allow a person panel, allowed-email list, and access-request review from Projects. Keep all three in the existing administrator-protected `/admin` page. Projects no longer fetches these administrative lists; project creation and ordinary membership invitation flows remain separate.

## Restore visible project progress and readable card sizing — 2026-10-24

Accepted: increase project-card stage markers to 26px and enlarge card titles, stage labels, counts, and padding. This supersedes the earlier 11px marker reduction: a partially filled 11px circle could yield an inner fill under 2px. Preserve centered fill, independent review semantics, card actions, and responsive layout.


## Named visual styles: Hacker and Zen — 2026-10-24

Accepted: name the existing default style Hacker and introduce Zen using the supplied woodblock image's cream, sea blue, and rust palette. Select styles in the footer alongside language and density, persist the selection per browser, render it on the server to avoid a wrong-theme flash, and expose both in Storybook. Keep project data, the custom Nakama wave, density, and workflow behavior unchanged. Theme support is delivered independently from the Tailwind migration; no database migration or new service is required.

## Accepted: extend projects into an experiment lab — 2026-10-26

The user approved expanding Nakama into their experiment lab while preserving streamlined project questionnaires, artifacts and existing collaboration. Experiments belong within any project type; they are not a tenth flow. Retain short capture, versioned plans, repeated runs, attributed retained evidence, explicit unknowns, human effort/deviations, scoped reviews and manual external-agent handoff. Execution completion and AI opinion do not establish validity. Assessment and next action are separate. Creative work never requires commercial validation.

Implementation choice: reuse Nakama components/theme rather than install Ant Design. Keep a dedicated lab route and optional milestone labels instead of rebuilding hierarchical tasks into a generic board. Retain evidence text/snapshots rather than relying solely on mutable artifact links. Initial tradeoffs: no generic evidence-file uploader, authenticated agent ingestion/dispatch, automatic answer application, milestone scheduling or individual experiment deletion. Full project context export remains a separate milestone. This work is local/PR development until migrations, deployment and authenticated live verification are explicitly completed.

## Accepted: Daylight Research visual foundation — 2026-10-26

The user's supplied Nakama design-language PDF and design kit replace the earlier hacker/woodblock appearance. Use warm ceramic canvas, opaque porcelain panels, forest actions, a restrained sun-over-horizon identity, Manrope interface typography and IBM Plex Mono instrumentation. Default to Daylight, with Evening available; saved legacy preferences preserve their light/dark intent. Optimize the workspace with aligned columns and compact spacing, while retaining readable text and touch targets. The lab register uses a twelve-column desktop grid and stacks on phones.

Use actual Ant Design components in the interactive experiment field guide, themed to these tokens. Existing native shared form controls retain their server-form semantics; this is not a claim that every control has been migrated to Ant. Ant's interactive guide loads when the user starts it, keeping its cost off project routes. The guide can animate demonstrations, with a pause control and reduced-motion support; routine workspace operation remains calm.

The reference's proposed collaborator identities, persistent bottom workspaces, command palette, extra lifecycle states and autonomous execution are not implemented by this visual change. Preserve current domain states and access rules. The fictional guide illustrates a manually conducted test, not an executing backend. This change is local until separately released and verified.
