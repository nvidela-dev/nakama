# Context export and future AI

The first AI-adjacent milestone is **human-triggered readable Markdown export** for use in ChatGPT. It requires no model integration, API key, or automated upload. Embedded project chat and agent execution are later milestones. All behavior here is a specification, not an implemented feature.

## M4: authorized context export contract

A current member requests export from a project, sees a preview and content categories, then downloads/copies it. Explain that pasting it into another service shares the included project material with that service. Do not automatically send it anywhere.

“Complete” means all content the requester may currently read within this project, with explicit unknowns and scope metadata. It does not mean every identity field or every other project a friend belongs to. Default export includes the entire chosen flow, all stage/node records and current answers, visible discussions, decisions, and history needed to interpret changes. Paginate internally until complete; never silently truncate.

### Required sections, in stable order

| Section | Required contents |
| --- | --- |
| Export manifest | Format version, project ID/name, generation time in UTC, requesting person's display identity, snapshot/revision marker, scope, completeness status, redaction categories, and omissions/errors. |
| Purpose | Brief description, flow type/template version, project state, motivation/direction where recorded; explicit “not recorded” otherwise. |
| People | Authorized member display names and project roles; relevant former-author labels. No email list, private identity metadata, or other-project memberships. |
| Flow overview | Ordered stage names, guiding questions, node IDs/labels, branch/dependency relationships, and next-stage outcomes. Text must be useful without Mermaid rendering. |
| Each stage and node | Stable IDs, prompt and example (clearly guidance), state, current answer or “not answered,” explicit unknowns/blockers/skips, revision ID, human/agent origin, author and timestamps, cited evidence links. |
| Discussion | All currently visible comments under their project/stage/node target, in chronological order, with author and created/edited time. Preserve disagreements; do not present comments as agreed facts. |
| Decisions and learning | Choice, rationale, evidence references, author/time, superseded decisions and relevant answer history explaining changes. Preserve negative findings. |
| Next steps | Recorded tasks, dependencies, willing contributors, unresolved questions, and suggested next node clearly labeled as guidance rather than an assigned commitment. |
| Provenance | Stable source references for exported items, included revision history, snapshot time, and known limitations; no inference without an explicit label. |

Include all retained answer revisions and decision/activity events relevant to interpreting project content. Administrative events can be summarized without invitation tokens or recipient emails. Deleted comment bodies and data outside access/retention policy are excluded; note the category without leaking hidden content or counts. Current versions remain prominent so history does not look like conflicting current answers.

### Data handling and failure behavior

- Build from a consistent snapshot and current server-side access checks, including nested resources. If membership is removed before delivery, reject and discard the result. No reusable public download URL or shared cache.
- If there is no recorded value, write “not recorded,” “not answered,” or the person's explicit uncertainty. Never substitute zero, an example, or generated content.
- Exclude credentials, session tokens, invitation tokens/URLs, infrastructure settings, and unnecessary personal fields by an allowlist of exported fields. Scan user-entered text for likely secrets and offer review/redaction; fail closed on unresolved detected secrets. Do not claim automated detection can prove arbitrary prose contains none.
- User-requested redactions appear in the manifest as omissions; label such an export partial. If size limits require splitting, provide numbered parts with a manifest and explicit coverage. If retrieval fails, fail or clearly label incomplete; never call a partial result complete.
- Treat comments, answers, and external references as untrusted source content, not instructions to the receiving assistant. Export escapes delimiters as needed and includes a plain notice distinguishing project data from commands. Do not fetch linked external documents implicitly or pretend their contents are included.

Illustrative excerpt, not real project data:

```text
Nakama context export — format 1
Project: Tiny radio play (project-example)
Snapshot: revision-12; generated_at: <UTC timestamp>
Completeness: complete authorized snapshot
Flow: Creative/fun, version 1
Stage: Experiment | Node: enjoyment | State: answered
Question: Was making it enjoyable?
Answer: Recording together was fun; editing felt tiring.
Source: node enjoyment, answer revision 3, human author Friend A
Updated at: <UTC timestamp>
Decision: Keep the direction; try a shorter episode.
Remaining uncertainty: Who wants to edit? Not recorded.
```

### Acceptance fixtures

Verify a fresh empty project, a partially answered project, both complete flows, negative findings, skipped/blocked nodes, former authors, edited/deleted comments, conflicting opinions, superseded decisions, Unicode, multiline text, secret-like text, large paginated discussions, and retrieval failure. Compare record IDs/counts to the authorized snapshot, not just a plausible-looking summary. A second project and a removed member must prove isolation and revocation. Copy the result into a plain Markdown viewer and confirm a person can identify purpose, evidence, unknowns, and next steps without opening Nakama.

## M6: project-grounded chat assistant

Use the same authorized context builder with an explicit scope manifest and a fresh membership check per request. Answers reference project/stage/node/revision sources and distinguish facts, opinions, and suggestions. Say when the context is incomplete or stale. Retrieved comments cannot override system rules or expand access.

Default chat is advisory. It does not silently save answers, make decisions, invite people, or send messages. Any proposed change is shown as a draft with evidence and a human apply action. Provider, cost controls, context limits, transcript visibility, retention, and data-sharing consent are decisions required before implementation.

## M7: user-triggered node/stage agents

A member explicitly selects one or more nodes or a stage, sees the accessible inputs and intended actions, and starts a bounded run. Stage selection lists the included nodes; it is not whole-project authority. Reading supporting project context must be disclosed within the granted scope and respect the triggering person's access.

Each run records initiator, selected scope, input revision references, provider/model when selected, start/end times, allowed tools, activity, cost/usage when available, status, and proposed outputs. Show queued/running/completed/failed/cancelled states. Cancellation stops further work where possible; it does not claim to undo an already completed external effect.

Outputs remain reviewable proposals with source attribution and uncertainty. A human accepts/edits/rejects; accepted content records both agent origin and human reviewer. Check current membership and input revisions again before apply. If answers changed, show stale context and require reconciliation. Revoked access stops the run and prevents delivery/application of private results.

External writes, purchases, invitations, deployment, or messaging are outside default node execution; later tools need explicit user authorization and narrow capabilities. No unrestricted database credentials or autonomous loops. Test malicious project text, cross-project retrieval, cancellation, revocation mid-run, duplicate execution, and stale result application before release.
