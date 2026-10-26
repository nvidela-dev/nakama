# Requirements and acceptance criteria

These are intended behaviors, not existing features. [Flows](flows.md) define the accepted journeys; implementation proposals are in [the roadmap](roadmap.md).

| ID | Requirement | Acceptance criterion | Milestone |
| --- | --- | --- | --- |
| R1 | Low-effort capture | Save a name and brief description without business-plan fields or inviting anyone; the project survives reload. Flow selection may be deferred during capture. | M1 |
| R2 | Separate project groups | Alice belongs to A and B, Bob only A, Cara only B. Each sees only authorized content; guessing IDs cannot cross boundaries. | M1 |
| R3 | Invitations | An owner invites a person to one project. Pending, accepted, revoked, and expired states are visible; acceptance verifies identity and is safe to repeat. Revoked/expired invitations grant nothing. | M1 |
| R4 | Project flows | Venture, Creative/fun, Investigation, E-shop (generic or Shirt E-shop), SaaS, Importation, and Consultancy contain their five stages and documented steps. Creative projects never require profit, demand, or a market assessment. Investigation records evidence, uncertainty, and a conclusion, actionables, artifact, or combination. | M2 |
| R5 | Accessible guidance | Every question node has a plain-language question, optional example, editable answer, and visible state. Examples are never silently saved as answers. | M2 |
| R6 | Stage/node navigation | Overview shows named stages; expanding opens a downward subdiagram; a node opens its form. Back navigation preserves location and saved content on mobile and desktop. | M2 |
| R7 | Honest progress | Answered, unknown, skipped, and blocked remain distinguishable. Revisiting preserves prior work; negative findings and parking record useful learning. | M2 |
| R8 | Contextual discussion | Members comment on a project, stage, or node with clear target and author. Project A comments never appear in B or bypass access checks. | M3 |
| R9 | Safe shared edits | A stale save cannot silently overwrite a newer answer. Show a conflict for reconciliation and retain authorship/revisions. | M3 |
| R10 | Complete authorized export | Preview/download Markdown meeting [the export contract](context-and-ai.md). Multi-project fixtures prove no foreign data or secrets leak; missing values remain explicit. | M4 |
| R11 | Usable delight | Reading, editing, comments, and export work with keyboard, screen reader, reduced motion, and lightweight 2D/list mode. Progress is not color-only. | M2, M5 |
| R12 | Grounded chat later | Assistant uses currently authorized context, identifies sources/unknowns, and cannot silently change answers. | M6 |
| R13 | Triggered agents later | User selects node/stage scope and reviews output. Execution has scoped access, attribution, cancellation/status, history, and revocation/staleness checks before apply. | M7 |

## Boundaries

Initial scope is small groups incubating ideas, not public discovery, fundraising, marketplaces, billing, enterprise administration, or autonomous business operation. Public links, uploads, live cursors, notifications beyond invitations, and custom flow builders are not initial commitments.

“Share” in a flow means a human decision about showing what was made, not automatic publication or a public Nakama link. “Finished enough” is the group's chosen scope, not a guarantee of commercial success.

## Project tasks and Lock-In interchange — 2026-10-22

Each private project supports a shared hierarchical to-do list without selecting a guided flow. Members can add/edit tasks and nested subtasks, change explicit statuses, filter/search, expand/collapse, confirm subtree completion/deletion, and reload saved work. Unauthorized and removed users cannot read/write/import/export tasks. Stale destructive operations fail without data loss. Import previews and atomically appends a selected Lock-In version 1 project; export produces a compatible single-project file. Neither operation imports memberships nor changes guided progress.

## Project artifacts — 2026-10-23

Members can track in-progress or ready project outputs, optionally tied to a stage, in both a project tab and a membership-scoped global library. Image/design outputs require image uploads, software requires a GitHub repository/release/source link, and Markdown requires an uploaded UTF-8 document before becoming Ready. Images can expand to a viewport-sized viewer; Markdown has a safe reader and original-file download. Each artifact has independent shared to-dos and a stable authorized link. Creation, edits, uploads/downloads, deletion and conflicts preserve project access boundaries and unrelated guided/task data.

Project creation starts with a single button and guided type/details setup. Name and description are entered inside that process; compact project-type tiles use a responsive grid. Back/Close preserve a local draft, and only the final submission persists anything. Creation with a flow is atomic; choosing a flow later remains supported.

## Project spawning and relationships — 2026-10-23

- One source can spawn multiple projects; one spawned project can have multiple sources.
- Create a follow-up from its source, choose additional sources, or connect existing projects in either direction. Remove a link without deleting projects.
- Keep membership and content independent; require current access to both endpoints for writes and hide inaccessible endpoints from lists.
- Reject self-links and cycles; concurrent graph edits must not create circular ancestry. A failed source check must roll back the complete new project.
- Support destination navigation, keyboard forms, phone layouts, and English/Spanish labels.

## Experiment lab first slice — 2026-10-26

Members can capture an experiment inside any project without changing its flow, preserve a plan when starting a run, repeat runs, record attributed evidence/measurements and unknown effort/cost, and review completed execution against a retained evidence snapshot. Assessment and next action are independently recorded. AI-only analysis cannot establish empirical support. Question/plan changes flag stale context and require reconciliation for a claim review. Manual agent proposals preserve original content and human review; acceptance records AI analysis, not empirical validation. Scoped preview/copy handoff and nested membership checks apply; native execution is deferred. Existing task/artifact/questionnaire semantics remain unchanged.
