# Requirements and acceptance criteria

These are intended behaviors, not existing features. [Flows](flows.md) define the accepted journeys; implementation proposals are in [the roadmap](roadmap.md).

| ID | Requirement | Acceptance criterion | Milestone |
| --- | --- | --- | --- |
| R1 | Low-effort capture | Save a name and brief description without business-plan fields or inviting anyone; the project survives reload. Flow selection may be deferred during capture. | M1 |
| R2 | Separate project groups | Alice belongs to A and B, Bob only A, Cara only B. Each sees only authorized content; guessing IDs cannot cross boundaries. | M1 |
| R3 | Invitations | An owner invites a person to one project. Pending, accepted, revoked, and expired states are visible; acceptance verifies identity and is safe to repeat. Revoked/expired invitations grant nothing. | M1 |
| R4 | Both flows | Venture and Creative/fun contain all five stages and branches in the canonical diagrams. Creative projects never require profit, demand, or a market assessment. | M2 |
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
