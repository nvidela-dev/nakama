# Agent harness

The harness is the repository's working agreement plus repeatable checks. It helps an agent find the right context, make a bounded change, and provide evidence. It does not replace product judgment or prove deployment.

## Ownership and coordination

For the current coordinated refactor, the implementation chat **23 Oct** (`01a167dc-3aa7-7392-8866-0553cc62bc3d`) owns application code, feature organization, reusable UI, Storybook, performance/UX, application tests, package dependencies, lint/format configuration, existing scripts, and implementation documentation already in progress. The harness chat owns `AGENTS.md`, this document, `Makefile`, `scripts/harness-*`, and `.github/workflows/`. It also owns future repository skill and knowledge-convention changes. Architecture/development documentation remains with the implementation chat for this pass; this document links to it rather than competing with it.

This is a task agreement, not a permanent restriction on contributors. Reassign a file explicitly before overlapping edits. Inspect Git status before starting; preserve all unrelated changes. In a shared checkout, keep the current branch, do not stage or commit the other chat's changes, and agree who runs builds or formatters. `.NOTPARALLEL` orders one Make invocation; it cannot prevent another chat or terminal from modifying `.next` concurrently.

Handoffs should name the goal, owned files, shared contracts/commands, checks performed, failures, and next owner. If messaging is unavailable, provide the handoff text and state that it was not delivered. Never infer another agent's acknowledgement from successful message delivery.

## Knowledge map

Start with [AGENTS.md](../AGENTS.md) and the [README document map](../README.md#read-the-foundation). Read only the canonical documents needed for the change.

| Information | Canonical home |
| --- | --- |
| Working rules and entry points | `AGENTS.md` |
| Scope, observable outcomes | [Requirements](requirements.md) |
| Names, relationships, progress semantics | [Domain](domain.md) |
| Access and collaboration | [Collaboration](collaboration.md) |
| Code structure and architectural tradeoffs | [Architecture](architecture.md) |
| Setup, operational commands, verification evidence | [Development](development.md) |
| Accepted product decisions, proposals, open questions | [Roadmap](roadmap.md) |
| Harness ownership and verification policy | This document |

Update the owning document when behavior changes. Link instead of duplicating rules. Mark proposals as proposals; record accepted decisions with the reason and consequence. Treat existing status statements as evidence to recheck, not proof that the current checkout is deployed. Generated files belong to their generators: change migrations or flow templates, regenerate using the documented npm command, then check the diff.

Avoid adding a second context file or a large prompt library for information already captured here. Add a repository skill only when a recurring, distinct workflow needs guidance beyond the commands and canonical docs. A skill should link to those sources, have a narrow trigger, and be exercised on a representative task. No custom skill is required for this initial harness.

## Commands and evidence

Run from the repository root with Node.js 22 or newer, npm and Make. Install pinned dependencies with `npm ci` on a fresh checkout; do not reinstall while another agent is changing dependencies.

| Command | What it establishes |
| --- | --- |
| `make doctor` | Read-only check for runtime, installed dependency marker, harness files, and expected npm script names; it does not validate dependency integrity or credentials |
| `make check` | Schema-derived types and TypeScript, unit/integration suite |
| `make verify` | All of `check`, then a production build and exclusion of operational files from deployment traces |
| `make frontend` | Explicit integration target for lint, formatting, architecture, generated flows and Storybook build; requires the frontend refactor |
| `make dev` / `make storybook` | Start the application or component explorer (Storybook requires the frontend refactor) |
| `make e2e` | Existing browser suite against explicitly configured test services |

`package.json` owns individual command implementations. Make and CI only orchestrate them, failing at the first unsuccessful step. Schema/type validation already runs inside the build wrapper and intentionally remains there for direct `npm run build` callers. CI uploads existing diagnostics and server source maps with the existing retention policy.

Frontend integration: `main` does not yet contain the refactor's lint, format, architecture, flow-catalog or Storybook commands. `make verify` therefore preserves the existing core CI coverage without depending on unmerged application work. `make frontend` explicitly requires these commands and fails with a prerequisite report when they are missing. After the refactor lands, run and integrate this target into CI. The announced `test:components` additionally needs its browser/server requirements verified before inclusion; it is not part of this PR's checks. No missing check is silently skipped.

Browser tests are separate because they require configured Clerk/database resources and can create test records. Follow [development setup](development.md), use isolated test data and an explicit `E2E_BASE_URL`, and start the matching app before running them. The default CI verification does not prove authenticated journeys, accessibility, mobile layout, or deployed behavior. A Storybook build proves compilation, not visual quality.

Choose evidence based on the change:

- Documentation: resolve changed links/anchors, inspect claims, and render any changed diagrams.
- Domain, access, persistence: exercise the relevant tests and failure paths, including cross-project isolation; validate schema changes on an isolated database.
- UI: inspect the affected story or route, keyboard interaction, mobile overflow, and loading/error/empty states. Use the relevant browser journey when behavior changes.
- Performance: compare the same route, build mode, device/viewport, and measurement method before and after; structural cleanup alone is not a measured speedup.
- Delivery: report local checks separately from hosted CI, deployment SHA/status, and live journey verification.

Before handing off, state what changed and why, commands/results, skipped checks with reasons, and known limitations. Do not weaken checks to conceal failures. Keep code changes local unless the user authorizes pushing.

## Design rationale

`AGENTS.md` is a short routing and policy layer; detailed knowledge lives in existing docs; npm scripts provide executable checks; Make gives humans and agents the same entry point; CI repeats it independently. This follows the principle of extending existing repository conventions rather than adding every possible harness artifact ([official OpenAI workflow guidance](https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex)).
