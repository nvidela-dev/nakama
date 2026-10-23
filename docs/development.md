# Development and verification

The first application slice implements Clerk integration, project capture, per-project owner/member access, and recipient-specific invitations. It is connected locally to dedicated Clerk and Neon development resources, but not deployed. Both guided flows, saved answers, progress, and revision history are also implemented. Comments and export remain subsequent work.

## Run locally

Use Node 22 or newer and npm. From the repository root:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Without keys, the public harbor page works and private pages redirect home. This is not a guest authentication mode. Add the Clerk publishable/secret keys to the local environment file, and configure the listed sign-in/sign-up paths. Never commit keys or paste them into an issue. Use a dedicated Clerk development application; the implementation does not enable Organizations.

Set `DATABASE_URL` to an isolated Neon development database's pooled connection and `DATABASE_URL_UNPOOLED` to its direct connection. Then explicitly run:

```sh
npm run db:migrate
```

The migration runner uses a transaction, advisory lock, and migration checksums. It fails if an applied file changes. Application builds never run migrations. Verify the target database independently before running; preview/production credentials must be separate. There is no cloud setup, migration, or deployment performed merely by installing dependencies.

## What to verify

```sh
npm test
npm run typecheck
npm run build
```

Service tests execute actual SQL and transactions in PGlite, a local Postgres-compatible engine. They cover overlapping project memberships, owner-only operations, verified-email invitations, token hashing, repeat acceptance, replacement/revocation/expiry, removed members, and atomic creation rollback. This is useful SQL/access evidence, not a substitute for Neon network/runtime and concurrent-session verification.

Before enabling a real environment, test the whole browser journey with two Clerk users: capture/reload, invite the second verified email, open the link while signed out, sign in, accept, reload, revoke a pending invitation, and remove an existing member. Check direct project URLs as a third user. Confirm no private content is rendered or cached for a non-member. The initial PR used local SQL tests; the follow-up development-verification PR adds a passing real Clerk/Neon browser journey.

The public landing page was checked in Chrome at 1440px and 390px, with no JavaScript page errors or mobile overflow. Protected pages fail closed without configured identity. The core authenticated journey has now been checked against development services; broader production-readiness checks remain.

## Invitation implementation

Owner creates a 7-day link for one email, shares it manually, and can revoke it. A replacement revokes the old unused link. Only a verified matching Clerk email can accept. No email service is configured or automatic email sent.

Tokens are random 256-bit values; only their SHA-256 hashes are stored. Links carry the secret in the URL fragment, so it is not sent as an HTTP path/query or referrer. Acceptance uses a POST Server Action. The sign-in modal keeps the fragment in place; after sign-in the form reads and removes it from browser history. If the page is reloaded after that, reopen the original link. Never log action bodies or capture invitation screens in public artifacts.

Display names are membership-time snapshots from Clerk; they do not grant permission. Changing a Clerk profile does not yet synchronize these labels. Ownership transfer, self-service account deletion, broader audit history, production abuse controls, and invitation email delivery are not implemented. Owner-only project editing and confirmed whole-project deletion are implemented; see below. The owner cannot be removed through the current member-removal operation.

## Guided-flow slice

Apply migration 002 explicitly after 001. Projects choose one versioned flow; switching is deliberately rejected rather than losing answers. Capture data becomes the first two answers with its original author/time. An answered edit to the name/description updates the project header; drafts do not rename it.

Question nodes count toward answered progress; activity/outcome nodes do not. Skipped and blocked states require a reason, and an honest unknown or a negative finding can be answered. Saving a direction can park/resume a project; the creative finishing choice can mark it finished enough. The last explicitly answered direction remains in effect when its draft is later edited.

Writes serialize per project and compare the node revision. A conflict returns the authorized current answer and retains the local draft until the member explicitly reconciles. Earlier edits flag dependent nodes/later stages for review without clearing answers. Stage reviews compare a project content revision to reject stale reviews and retain immutable rationale history. Answer history records human attribution; no AI writes exist.

The read-only `/preview` route uses fixed illustrative data only and has no save operation or access to project records. It lets anyone inspect stages and question guidance without authentication, while private services retain their normal checks. Chrome checks cover five stages, branching questions, question/back navigation, and a 390px layout with reduced motion. Eleven service/template tests pass. Authenticated UI persistence and two-person conflicts have also been verified against real Clerk/Neon development services. Unsaved forms warn on links and full-page exit; browser history navigation is not a draft-storage feature. Save a draft before navigating away.

## Dedicated development environment — 2026-10-22

Created with explicit user authorization:

- Clerk application: **Nakama Development**, development instance only, linked to this repository through the Clerk CLI.
- Neon project: **nakama-development**, São Paulo region; branch **codex-guided-flows** contains migrations 001 and 002. The default **development** branch remains an empty baseline. Compute is limited to 0.25 CU; account-managed suspension defaults are retained.
- Local credentials are in ignored `.env.local` with owner-only file permissions. No GitHub Actions secrets, production instance, or Vercel deployment has been configured.
- Three dedicated test identities (owner, friend, outsider) and clearly marked `E2E radio play` projects exercise access boundaries. They contain synthetic data only. Tests intentionally leave these development fixtures for inspection.

Run the app on port 3011 and the opt-in browser check in a second terminal:

```sh
npm run dev -- --port 3011
npm run test:e2e
```

The E2E test requires the dedicated test users, development keys, and local Chrome. Override `E2E_BASE_URL` or `E2E_OWNER_EMAIL`, `E2E_FRIEND_EMAIL`, and `E2E_OUTSIDER_EMAIL` when deliberately targeting another test environment. It refuses production Clerk keys. It does not run in ordinary CI, because CI has no service credentials.

The test uses Clerk's official testing helper to establish real development sessions. It verifies signed-out redirects and invitation landing UI, but bypasses the provider's email/password/MFA ceremony; it is not evidence of every sign-up provider flow. It then uses actual browser forms and Server Actions for capture/reload, choosing a flow, creating/accepting invitations, saving/reloading answers, two-person conflict reconciliation, outsider denial, removal, and denial of older unused invitations after removal.

Live verification found and fixed a development Strict Mode effect that read the invitation fragment twice. It also disables Next.js Server Function argument logging because arguments can contain private answers or invitation tokens. Do not enable request-body logging or persist browser session tokens in public test reports. Membership removal revokes pending links for addresses previously used by that member to join; an owner can intentionally create a fresh invitation afterward.

## English and Spanish

The language switch uses a validated Server Action to set an HTTP-only, same-site preference cookie. Next.js refreshes server-rendered text while keeping client forms mounted. The document language and metadata follow the preference. English source strings are translation keys; `src/lib/i18n/es.json` owns Spanish copy. Only display text is translated. In particular, select option values, node IDs, saved names, answers, review rationales, and member names are not rewritten. Revision timestamps use an explicit UTC zone with localized formatting so server/client output agrees.

`tests/i18n.test.ts` checks all flow questions/examples/choices and UI lookup keys for Spanish coverage. `e2e/language.spec.ts` checks switching both ways, reload/navigation persistence, Clerk's embedded sign-in, mobile overflow, preservation of capture/answer drafts and selected decisions, saved content, and translated validation feedback. It uses the same opt-in development-service setup described above.

The first app version was deployed from main on 2026-10-22 at https://nakama-brown-eight.vercel.app. Vercel Production currently uses the same Clerk development instance and Neon branch as development/preview, explicitly requested for the initial launch. This is a public development-backed release, not an isolated production identity/data setup. Production Clerk still needs a custom domain.

## 3D mini-view verification — 2026-10-22

The optional Three.js mini-view is implemented in the shared project journey and public synthetic preview. Local checks passed: 14 existing tests, type checking, and production build. Chrome preview checks cover opening/closing, all 27 creative stage/node links, stage navigation, rotation/reset, reduced-motion layout, and a 390px viewport without document overflow. Spanish and WebGL failure checks use the same synthetic preview. This change does not add persistence or alter authorization queries. Private authenticated draft preservation and real-device GPU/performance measurements remain unverified for this slice. No deployment was performed.

## Project settings — 2026-10-22

Project pages expose Edit project and Delete project to owners. Editing uses saved project metadata and content revision as an optimistic snapshot; changed name/description answers, their history, downstream review flags, and header values commit together. Permanent deletion requires the current exact name and removes all project-dependent records in one transaction. Neither operation needs a migration. SQL tests cover owner/member/outsider permissions, stale edits, projects with and without flows, retained history, complete deletion, old links, unrelated project isolation, and simulated mid-operation failures with rollback. `e2e/project-settings.spec.ts` checks the disposable development-project browser journey.

Validation passed: all 17 local tests, type checking, production build, and the owner-settings Chrome journey against dedicated development services. The browser check covers editing before/after flow selection, persisted guided description, phone overflow, exact-name delete gating, list removal, and denial of the deleted URL. Its disposable projects were deleted, including fixtures left by failed test attempts. This is local/development evidence; live deployment remains unverified.

## Administrator and whitelist — 2026-10-22

Set `NAKAMA_ADMIN_EMAIL` to the designated administrator's exact verified email before using private routes. Do not expose it with a `NEXT_PUBLIC_` prefix or commit personal addresses. Missing configuration denies private admission. Seed the administrator's exact email in the existing Clerk allowlist, with notifications disabled, before enabling the instance `allowlist` restriction. The current administrator and restriction have been configured on the dedicated development instance and the server-only admin setting exists in Vercel's Production, Preview, and Development environments. No new service or migration is required.

`/admin` lists permitted emails and allows exact-email additions/removals. The administrator entry is protected. App admission uses verified emails, precedes all project reads/writes, and is separate from membership. Existing non-whitelisted accounts are denied even if their sessions or project memberships already exist. Removed emails lose future private access without deleting accounts or project history.

All 20 local tests and the production build pass. The opt-in `e2e/admin-whitelist.spec.ts` passed against the dedicated development services: administrator access, an existing non-whitelisted account being denied, adding/removing a disposable test email, non-admin denial of the admin page, no automatic access to an administrator-owned synthetic project, mobile overflow, and Spanish administration. Test additions were removed and the successful test's synthetic project deleted. Other authenticated E2E suites now require their fixture emails to be deliberately allowed first; tests never silently approve existing accounts.

## Main-screen management — 2026-10-22

Project cards offer owner edit/delete dialogs, and the administrator's main sidebar offers exact-email whitelist additions and an expandable removal list. Existing actions handle writes and authorization; whitelist updates revalidate both `/admin` and `/projects`. The membership-scoped project list includes each selected flow's content revision, defaulting to zero without a flow. No schema migration is needed; project-service tests now initialize the same two migrations as the application.

`e2e/main-management.spec.ts` passed against development services: edit metadata for a project with a flow without leaving `/projects`, reopen saved values, close with Escape, manage a disposable whitelist email from the sidebar, hide administration from a non-admin, deny automatic access to the synthetic project, and delete from the card dialog on a phone viewport without overflow. The test's email entry and project were removed. Existing settings/whitelist E2E locators use project-scoped form IDs so multiple card dialogs remain accessible.

## Access-request queue — 2026-10-22

No migration, new service, signup-mode change, or extra environment variable is needed. Existing Clerk credentials support pending waitlist-entry storage. Signup first checks an email against the whitelist; unapproved emails create a deduplicated request with `notify: false`, while approved emails continue to Clerk's normal form. `/access-required` also exposes submission. The administrator can allow/dismiss requests in `/admin` and the main sidebar. Dates represent first submission; emails are unverified until normal signup verification. Historical provider rejections remain in Clerk's dashboard logs and are not imported.

Unit tests cover normalization, validation, deduplication, no automatic admission, admin-only reads/actions, dismissal, approval, and cleanup failure. `e2e/access-requests.spec.ts` checks the public form, provider persistence, duplicate submissions, approval, the actual Clerk signup continuation, disposable allowance removal, and dismissal from the main screen on a phone viewport. It does not complete signup or send email. The local request throttle is bounded and per runtime; a distributed/global anti-abuse guarantee is not claimed.

Validation passed: all 23 local tests and the access-request browser journey against the dedicated development services. The test confirmed deduplication and real provider persistence, then approved/dismissed synthetic requests without creating accounts or sending emails. Disposable requests and allowances from both successful and failed test attempts were removed.

## Comments and activity — 2026-10-22

Migration 003 adds project-scoped comments and activity, a composite selected-flow constraint, and feed indexes. It is additive and does not backfill invented events. Source writes and new activity share a transaction. The feed reads historical answer revisions and stage reviews directly. Whole-project deletion cascades new stores, including stage/node discussions when the selected flow is removed.

Before applying to the shared development branch, migration 003 passed local PGlite tests and ran against a dedicated Neon child of `codex-guided-flows`. A private owner-only consistent JSON backup of existing tables and migration ledger was saved outside the repository. The child branch is limited to 0.25 CU, retains account-managed suspension settings, and expires automatically at 2026-10-22 21:45 UTC. The shared branch's migration ledger was verified before/after apply; all 19 pre-existing projects were preserved.

SQL tests cover scopes, wrong-flow nodes, non-members, cross-project comment IDs, author-only editing, owner moderation, stale revisions, tombstones with no retained bodies, former authors, removed-member denial, safe invitation events, pagination with microsecond timestamps, transaction rollback, and complete project deletion. The opt-in `e2e/collaboration.spec.ts` exercises real two-person discussions and cleans its synthetic project and temporary test-email allowance. Export, AI, real-time subscriptions, and notifications are not included.

Verification passed: 29 local tests and the two-person Chrome collaboration journey using dedicated development identities. The browser check includes language refresh while a stale comment draft remains open, owner moderation, the activity feed, phone overflow, and removed-member denial. Its synthetic project and temporary test allowance were removed. A production build and live release check are performed separately.

## PWA and icons — 2026-10-22

The root layout supplies localized page and social titles/descriptions, application name, Apple web-app metadata, and the dark theme color. Next.js serves the favicon, SVG icon, Apple touch icon, and `/manifest.webmanifest`; `public/icons/` contains 192px and 512px install icons, including maskable support. The manifest is public and contains no project context.

On HTTPS (or localhost), use a supporting browser's install control; on iPhone/iPad use Share → Add to Home Screen. Installation opens Nakama in a standalone window. The app requires a connection and does not register a service worker or store private pages for offline use. Device installation and deployed metadata must be checked after deployment; local build success does not prove either.

Local validation for this slice passed: 29 tests, type checking, production build, and Chrome inspection of the production server's public preview. Chrome confirmed rendered title/social/theme metadata and manifest linkage; the manifest and every favicon/touch/install icon returned HTTP 200 with the expected content type. Manifest standalone display and icon entries were checked, and no service worker registrations were present. The icon was visually inspected. No deployment or physical-device installation was performed.

## Sidebar progress layout — 2026-10-22

Progress now occupies a dedicated panel above the right-hand Members/Activity panel; the flow-name/“Your path” banner is removed. Existing server-authorized sidebar and discussion content pass through layout slots, with no change to data queries or permission checks. Local production build (including TypeScript) passed. Chrome checks on the synthetic public preview verified right-column placement, banner removal, mini-view open/close, stage navigation, and a 390px layout without horizontal overflow; desktop and phone screenshots were inspected. Authenticated project layout and private draft preservation were not re-tested in this slice. Changes remain local pending the user's push instruction.

## Compact question-step cards — 2026-10-22

Step cards now put title/state on the first line and dependency/type beneath, with smaller padding and connector gaps and a 44px minimum target. Narrow screens use one card per row to avoid splitting titles into cramped columns. Production build passed; Chrome's synthetic preview measured desktop cards at about 51px, verified step navigation, and showed no horizontal overflow at 390px. Desktop and mobile card screenshots were inspected; the final mobile-only CSS rule was additionally checked by injecting that exact rule into the built preview. Authenticated venture data was not exercised, and nothing was pushed.

## Ultrawide discussion workspace — 2026-10-22

At 2000px and above, private projects use discussion/project/progress-and-members columns in both densities, including before flow selection. A single discussion instance moves through grid placement; it is not duplicated. The panel sticks within the viewport and its history can scroll while the composer remains in the same panel. Contextual comment queries and writes are unchanged. Production build passed. Authenticated Chrome checks against the existing development environment passed for 2560px column order in both densities, 1440px fallback below project work, comment-draft retention across resizing, one composer, and no overflow at 390px. The check only typed and cleared an unsent draft; no comment was posted. Long-history scrolling and contextual navigation with an unsaved comment were not exercised. Nothing was pushed.

## Vertical stage navigation — 2026-10-22

Overall-stage links now form a vertical rail beside the expanded stage or question editor on desktop, in both densities; mobile keeps the breadcrumb. Production build and Chrome checks passed: vertical alignment and no horizontal overflow at 1024/1440/2560px in both densities, stage navigation, one active-stage highlight, rail visibility in the question editor, and the 390px fallback. The desktop synthetic-preview screenshot was inspected. This slice did not repeat authenticated comment/access tests; all accumulated changes remain local.

## Return to step list after save — 2026-10-22

A confirmed saved revision now clears the dirty state and navigates to the existing stage back-link. Validation/conflict responses keep the editor mounted. Existing journey/language checks were adjusted to expect the stage list and reopen the step to inspect saved content. Production build and all 29 local tests passed. Authenticated Chrome checks against development services verified successful return, persisted content on reopening, validation staying in the editor, stale-revision draft retention, and return after explicit conflict reconciliation. Both disposable synthetic projects were deleted after checks. The full journey/language suites were not rerun; nothing was pushed.

## Members dropdown — 2026-10-22

Members, the invitation form, and pending invitations now use a native disclosure closed by default. The count stays visible and Activity remains independent. Production build passed. Authenticated Chrome checks on development services verified default collapse, keyboard/mouse toggles, preservation of an unsent email across closing/reopening, and no horizontal overflow at 390px. No invitation was created or sent. Existing full invitation E2E suites were not rerun; their selectors now open Members before accessing invitation controls. Nothing was pushed.


## Accumulated workspace improvements — integration check, 2026-10-22

The user authorized pushing the accumulated improvements to main. The final combined build (including TypeScript), all 29 local tests, and diff whitespace validation passed. Browser evidence and its limits for individual changes are recorded above. The full service-backed journey/language/collaboration suites were adjusted for navigation and disclosure behavior but were not rerun as a set. Deployment verification remains separate.

## Stage rail color and progress — 2026-10-22

Stage links now use the existing pink accent and display answered-question counts from the same guidance data as the step cards, plus explicit reviewed/in-progress/not-started and revisit states. Full question counts do not infer stage review. Production build and all 29 tests passed. Chrome synthetic-preview checks verified saved counts, an unreviewed 2/2 stage remaining In progress, the pink selected border in both densities, active-stage synchronization in the editor, and no phone overflow. A desktop screenshot was inspected. This slice did not perform new authenticated saves; prior save/revalidation checks remain documented above. Nothing was pushed.

## Full-width map placement — 2026-10-22

The map now renders above the stage rail/content layout, within the full project-working column. Production build passed. Chrome's synthetic preview verified equal map/work-column width, both rail and substeps below the opened map, original rail position restored on close, and no horizontal overflow with the map open at 390px. The desktop screenshot was inspected. The ordinary editor subtree remains mounted; private draft preservation was not re-exercised in this slice. Nothing was pushed.

## Heading alignment and lighter-green rail — 2026-10-22

The breadcrumb, stage question, and guidance now share a row above the stage rail and substeps; their first items align. The rail is lighter green with a lime selected indicator, superseding pink. Private project headings place the title beside Your projects, with description beneath. Production build passed. Chrome verified first-stage/first-substep top alignment in both densities, the shared heading above, and a 390px layout without overflow; the synthetic desktop screenshot was inspected. An authenticated read-only development check verified title/link alignment at 2560px and wrapping without phone overflow. No project data changed, and nothing was pushed.

## Right-panel vertical alignment — 2026-10-22

The desktop right sidebar now follows the measured offset of the middle content, aligning beneath the shared heading and expanded map with the stage rail/substeps. A ResizeObserver tracks actual wrapping and map sizes; phones retain zero offset. Production build passed. Chrome synthetic-preview checks passed at 1024/1440/2560px in both densities, with the map open/closed, and at 390px without overflow or extra sidebar offset. The desktop screenshot was inspected. No data queries or permissions changed; authenticated operations were not repeated. Nothing was pushed.

## Breadcrumb refinement — 2026-10-22

Breadcrumbs now distinguish ancestor links from a highlighted current location with a semantic ordered path, overview icon, and muted chevrons. Production build passed. Chrome synthetic-preview checks verified stage and question current-location labels, stage/overview ancestor navigation, and no horizontal overflow at 390px; a desktop breadcrumb screenshot was inspected. Existing project routes and authorization are unchanged. Nothing was pushed.

## Monospace typography and heading controls — 2026-10-22

The UI now uses the system monospace stack, including headings and branding, without a Google font import. Stage/question headings include a single compact map toggle and progress wheel; the right panel retains counts/bar. Overview controls remain in their original panel. Production build passed. Chrome verified computed monospace fonts, same-row heading/control alignment, 32px desktop sizing, map toggling, overview controls, and no overflow at 390px. Desktop/phone screenshots were inspected. A final compact-heading margin override was verified by injecting the exact rule into the built page. Authenticated flows were not repeated. Nothing was pushed.

## Approved-person invitation dropdown — 2026-10-22

Members is expanded again. Owner invitation forms now use approved email candidates, excluding addresses belonging to existing members; approval does not require an already-created account. Candidate discovery checks project ownership before reading provider data, and submission rechecks eligibility before the existing invitation write. Non-owners do not receive the list. Production build and all 29 tests passed. Authenticated Chrome checks verified expanded members, a real select control, owner-email exclusion, disabled submission without a selection, and no overflow at 390px. No invitations were created. Journey/collaboration selectors were updated for the select and duplicate-member exclusion; their full suites were not rerun. Newly created invitation acceptance and provider-failure scenarios were not re-exercised. Nothing was pushed.

## Header mesh texture — 2026-10-22

Added a static lime dot pattern behind the header, faded through an SVG wave mask with horizontal/vertical gradients. It has no animation, ignores pointer input, and adds no dependencies. Production build passed; Chrome verified mask delivery, navigation click-through, and no overflow at 390px. Desktop and phone header screenshots were visually inspected. Nothing was pushed.

## Softened mesh and accumulated release check — 2026-10-22

Feathered the SVG wave mask and reduced dot contrast/vertical opacity for a softer header fade. The final combined production build and all 29 tests passed; desktop and 390px header screenshots were inspected, with no phone overflow. The user authorized pushing the pending monospace/heading-controls, approved-person dropdown, and mesh work to main. Live deployment verification remains separate.

## Investigation flow — 2026-10-22

Migration 004 expands the allowed project flow IDs to include `investigation`. The five-stage flow reuses existing membership checks, answers, optimistic revisions, capture-to-header synchronization, comments, reviews, progress, and map rendering. Deliver records a Conclusion/Actionables/Artifact/Combination choice and developed result as answers. Sources are referenced in editable text entries; there are no source-upload records, automatic artifact generation, cross-project links, or spawning operations yet.

All 30 local tests and the production build passed. Tests exercise the migration in PGlite, Investigation capture/rename, evidence and outcome persistence, invalid-choice rejection, and outsider denial. Before applying 004 to the configured shared development database, existing migration checksums were verified and affected flow records plus the prior constraint/ledger were privately backed up outside the repository. Migration 004 applied successfully; comparison verified all 16 pre-existing flow records unchanged. No service was provisioned. The existing release uses this development database; deployment remains a separate check.

Authenticated Chrome verification passed for selecting Investigation, all five stage cards, saving an outcome choice and returning to the step list, persisted outcome after reopening, opening/closing the 3D map, Spanish display with canonical choices preserved, and a 390px layout without horizontal overflow. Both disposable investigations used during verification were deleted. The canonical Investigation Mermaid diagram was rendered and inspected. Cross-project linking/spawning remains future work; live deployment has not been verified for this release.

## Specialized business project types — 2026-10-22

Added five selectable templates: E-shop (generic), Shirt E-shop, SaaS, Importation, and Consultancy. Each has five stages with purpose-specific questions, examples, final outcome/follow-up prompts, and Spanish copy. Existing answers, comments, reviews, revisions, progress, and membership checks are reused. Metadata synchronization now identifies each template's capture nodes rather than hard-coding supported type names; flow selection validates against the template registry. No external shop, payment, logistics, or consultancy integrations are created.

All 31 local tests and the production build passed. Tests apply migration 005 in isolated PGlite, select every new type, synchronize name/description, persist and retrieve answers/history, reject cross-flow questions and outsider access, and prevent changing an existing flow. Before applying the additive flow-ID constraint migration to the configured development database, prior migration checksums were verified and affected records/constraint/ledger were privately backed up outside the repository. Migration 005 applied; all 16 pre-existing flow records remained unchanged. No service was provisioned.

Authenticated Chrome checks passed for all five new types: eight total chooser options, correct five-stage selection, answer saving and return to the stage list, persisted answer on reopening, Spanish display preserving user content, and no horizontal overflow at 390px. Each disposable test project was deleted. These are local checks against development services; the changes have not been pushed or verified live.

## Project To-do and Lock-In file compatibility — 2026-10-22

Migration 006 adds project task trees, task-list revisions, duplicate-import receipts, and task activity kinds. Task lists are independent of guided flows and available before selecting one. The browser offers creation/editing, nested subtasks and computed numbers, statuses, filters, expansion, explicit subtree confirmation, and file preview/download controls. All current project members can perform task operations; existing app admission and membership policy apply to reads, mutations, and exports. Limits are 512 KB per source file, 2,000 tasks per project, and 32 nesting levels.

All 35 local tests and the production build passed. New SQL tests cover task trees/status semantics, metadata edits, scoping and removed-member denial, stale subtree operations, subtree deletion/renumbering, import/export round trips, duplicate/invalid imports, rollback, and whole-project cleanup. Existing project/collaboration/flow tests apply the new migration too. Prior migration checksums and activity constraints were verified, affected records were privately backed up outside the repository, and migration 006 was applied to the configured shared development database. Pre-existing activity records were verified unchanged; no service was provisioned.

The authenticated `e2e/tasks.spec.ts` passed against development services: tasks before flow selection; add/edit/nest; canceled and confirmed completion; persisted collapse; filtering; preview cancellation; selected-project import; downloaded export; duplicate rejection; two-tab conflict recovery; confirmed subtree deletion and renumbering; guided-draft preservation while switching tabs; Spanish controls; and phone overflow. Its synthetic project is deleted by test cleanup. A synthetic file produced by Nakama's export converter was also opened in the actual Lock-In Go app using `LOCK_IN_DATA` pointing at a temporary file: it displayed the parent, `1.1` subtask, and correct In Progress/Ready states. The real Lock-In state file was not read or modified, and pre-existing Lock-In source changes were preserved.

Import is an append operation, not a merge or live sync. It preserves task hierarchy, titles, statuses, collapsed flags, and timestamps while remapping IDs. An exact same normalized source project is blocked on repeat import. Export contains only the current project's tasks and name in a Lock-In version 1 state, excluding guided answers, comments, application memberships, and other projects. Guided-context export remains unimplemented. No push or deployment has been performed for this slice.

The final styled browser run passed after refining controls and Spanish status labels; desktop, phone, and import-preview screenshots were inspected. Import inserts the validated ordered tree in one database statement, keeping its transaction independent of per-task network latency.

## Unread comment notifications — 2026-10-23

Migration 007 adds per-user comment read receipts with comment-deletion cascades. The header bell lists/counts only undeleted comments by other people on current memberships, with 25-item keyset pages, English/Spanish states, explicit read controls, and exact project/stage/node/comment links. Visible discussion comments mark read after one foreground second. Bell refreshes do not refresh discussion forms or clear drafts.

All 36 local tests and the production build passed. New SQL coverage checks per-person persistence and idempotence, own/deleted exclusions, removed-member access, unauthorized receipt attempts, pagination, old-comment targeting, cross-project targeting denial, edit semantics, invalid inputs, and project-deletion cleanup. The configured development database's six existing migration checksums and matching pooled/direct targets were checked, and a private pre-migration ledger/count snapshot was saved outside the repository before applying migration 007. Earlier migration checksums were verified unchanged afterward. No service was provisioned. Application push/deployment remains pending.

The authenticated Chrome notification check passed against development services: opening without clearing unread state, explicit marking, paginated older comments, direct links to comments beyond the first discussion page, visible-comment receipts, desktop overlay stacking, 1440px chat positioning, phone overflow/panel layout, and Spanish labels. Desktop/phone screenshots were inspected; disposable projects/comments/receipts were removed.

## Footer preferences and smaller bell — 2026-10-23

Language and desktop-density controls now replace the footer description on the right. The header bell uses an 18px icon in a borderless 28px desktop control, retaining a 44px touch target on coarse pointers. Type checking and the production build passed. Authenticated Chrome checks verified footer placement, language/density changes, bell dimensions/border, and no phone overflow; desktop/phone screenshots were inspected. Local implementation only; not pushed or deployed.

## Header project dropdown and centered card circles — 2026-10-23

The separate Your projects chevron fetches membership-scoped IDs/names on opening and displays ordinary navigation links in a fixed 320px scroll region bounded by viewport height. Authenticated Chrome verified navigation, current-project indication, Escape/focus restoration, outside dismissal, phone bounds and inner scrolling using temporary DOM-only entries. Desktop/phone screenshots were inspected. All 36 tests, type checking and the production build passed.

Project-card markers now contain only concentric discs; tooltips/accessibility retain review/revisit details. Explicit midpoint positioning fixes disc alignment. Chrome confirmed all live local project-card markers have no glyphs and their fill centers align within 0.05px; the screenshot was inspected and the build passed. Both changes remain local and unpushed.

## Project artifact library — 2026-10-23

Migration 008 adds project artifacts, bounded private image/Markdown files, per-artifact revisioned to-dos, and body-free artifact activity. The global library, per-project Artifacts tab, optional phase links, private detail/file routes, image lightbox, safe Markdown reader/download, GitHub link validation, explicit Ready to use state, conflict recovery and exact-name deletion are implemented locally. Files use the existing database; no service was provisioned. Image sets allow six files of 2 MiB each; Markdown is one replaceable UTF-8 document up to 512,000 bytes. Large files and artifact version history are not implemented.

All 43 local tests and the production build passed. New coverage includes membership-scoped lists/bytes, removed members and forged nested IDs, actual image-format validation, bounded files and safe filename extensions, required outputs, flow-stage validation, GitHub URL rejection, per-artifact tasks, stale edits/uploads, atomic Markdown replacement rollback, artifact/project deletion with stage-linked artifacts, and safe Markdown HTML/URL/image handling. Older SQL fixtures now apply the current artifact schema too. Project deletion removes artifacts before their referenced flow records.

Before applying migration 008 to the configured development database, pooled/direct target pairing and all seven prior migration checksums were verified; a private ledger/constraint/activity backup was saved outside the repository. The migration applied, and all earlier migration checksums and pre-existing activity records were verified unchanged.

The authenticated artifact Chrome journey passed against development services: project-tab/global creation, optional phase, required-output errors, rejected fake images, sequential multi-image upload, expanded viewer arrows/Escape/focus, private image bytes/no-store and forged-project denial, saved to-dos, rendered Markdown tables/code, disabled unsafe links/HTML, downloaded original filename, readiness, two-tab conflict recovery with drafts, software GitHub links, filtering, phone overflow and Spanish controls. The existing project-task/Lock-In browser journey also passed, including guided-draft preservation. Desktop/lightbox/Markdown screenshots were inspected. Disposable test projects and their files/to-dos are deleted by cleanup. These changes have not been pushed or verified live.

Footer preferences now share a measured 30px height. Administration moved from header navigation into the footer, retaining verified-administrator and signed-in visibility. The production build passed; authenticated Chrome verified the footer link, absence from the header, navigation to Administration, signed-out absence, and phone overflow. The desktop footer screenshot was inspected. These footer refinements remain local and unpushed.

## Single-button project setup and compact flow choices — 2026-10-23

The Projects sidebar now exposes a New project button opening a two-step native dialog: compact type selection, then name/description. Back/Close retain the page-local draft, and final creation atomically saves the project, owner membership, selected flow and its captured answers through the existing services in one transaction. Choose later preserves flow-free projects. Existing project type selection reuses the same compact responsive tile grid, including two columns on phones and complete accessible descriptions.

All 45 local tests and the production build passed. New SQL tests start all eight flow types with correct capture answers and access, preserve deferred type selection, and prove invalid/failed initialization leaves no partial project. Authenticated Chrome verified the single-button entry, type grid/dimensions, Back/Close focus and drafts, selected-flow initialization, deferred-flow chooser, phone bounds and Spanish setup labels. Desktop and phone grid screenshots were inspected. The artifact and project-task/Lock-In browser journeys passed through the new entry point as regressions. Earlier creation browser fixtures now open setup explicitly; density/language tests close/reopen the dialog around footer preference changes. No database migration or service provisioning was needed for this setup change. Changes remain local and unpushed.

## Many-to-many project lineage — 2026-10-23

Migration 009 and the lineage service support multiple sources and multiple spawned projects, source selection during atomic setup, bidirectional navigation, and linking/unlinking existing projects. Each endpoint keeps independent members and content. Both-endpoint membership is required for writes; lists omit inaccessible endpoints entirely. Self-links and recursive cycles are rejected, with graph writes serialized across transactions. Deleting a project removes its incident links while preserving other projects.

All 46 unit/SQL tests, type checking, and the production build passed. New coverage exercises multi-source/multi-child graphs, duplicate links, direct/transitive cycles, member/non-member and removed-member access, hidden destinations, rollback after a valid first source and an inaccessible later source, malformed IDs, and independent project deletion. Authenticated Chrome verified preselected source setup, additional sources, both navigation directions, existing-project link/unlink, phone bounds, and Spanish controls. A real concurrent pair of opposite link writes against the development database admitted exactly one edge and rejected the other. The existing guided setup browser journey also passed; its closed dialog now unmounts its controls while keeping page-local draft state. The phone relationship panel screenshot was inspected, and canonical document links resolve.

Before applying migration 009 to the configured development database, pooled/direct target pairing, all eight earlier migration checksums, and the absent new table were verified. A private migration-ledger/activity snapshot was saved outside the repository. After application, the ninth checksum, previous ledger, and pre-existing activity were verified. Disposable browser projects were removed. No service was provisioned. Changes remain local on `codex/project-lineage`; they have not been pushed or verified in the live deployment.

## Database normalization and strict TypeScript — 2026-10-23

The schema/type contract is described in [architecture](architecture.md#schema-and-typescript-contracts--2026-10-23). For a schema change, add a migration without modifying applied files, run `npm run db:types`, and commit the migration and generated types together. `npm run typecheck` first runs `db:check`; the unit suite independently checks generated output too. Keep query projections explicit and decoded, and use generated enums in validators instead of repeating string unions.

A disposable real Postgres database is available for browser and concurrency checks:

```sh
npm run db:local
```

This starts a fresh local cluster at `127.0.0.1:54331`, applies all migrations transactionally, reads no hosted database credentials, and removes its temporary data on shutdown. It uses the development-only embedded-postgres binaries; it does not create system users. The displayed local password is a synthetic fixture credential. In separate terminals, explicitly override the database for both application and tests:

```sh
DATABASE_URL='postgresql://postgres:nakama-local@127.0.0.1:54331/postgres' npm run dev -- --port 3011
DATABASE_URL='postgresql://postgres:nakama-local@127.0.0.1:54331/postgres' npm run test:e2e -- e2e/artifacts.spec.ts e2e/tasks.spec.ts e2e/project-links.spec.ts e2e/project-setup.spec.ts
npm run db:verify-local
```

Clerk development authentication/admission still uses the existing local test configuration. `db:verify-local` is deliberately restricted to this fixed local database and uses disposable synthetic projects. It checks real concurrent opposite project links, task-parent cycles, and uploads past the six-file limit; each rejected write must return the database constraint SQLSTATE. It also reads scoped comments/derived activity through node-postgres decoders and verifies a failing migration rolls back, emits no premature Applied message, and omits its synthetic private row from logs. PGlite remains the fast isolated SQL/migration test engine; production-style contention is checked separately with real Postgres. See the [embedded-postgres project](https://github.com/leinelissen/embedded-postgres) for local binary support.

Migrations 010–012 have **not** been applied to the configured shared development/public-release database. They remove the old artifact JSON task column and make file size generated; old application queries are incompatible. Back up and coordinate these migrations with the matching application release, with writes paused during the cutover. Build/test success is not a deployed schema or live verification.

The migration runner now rejects a pooled endpoint, non-prefix migration history, and altered applied checksums. Applied messages are emitted only after commit; database failures report the migration name/SQLSTATE without row-bearing Postgres DETAIL. A failed legacy-data conversion preserves the old JSON column and rows transactionally. No automatic production migration step has been added.

Verification completed locally: all 53 tests, schema-generation drift check, strict type checking, and the production build passed. The populated migration fixture preserves task IDs/order, file bytes, revisions and unrelated project data; malformed legacy data rolls back without dropping the original JSON. A 100-task save stays within 20 database queries, and library results contain counts without task titles/IDs. Authenticated Chrome passed the artifact, project-task/Lock-In, project-lineage and guided-setup journeys against the disposable real Postgres database, including conflicts, draft retention, private files, phone layouts and Spanish. Artifact/setup checks were repeated after the final projection changes. Native concurrent writes and safe migration failure/rollback checks passed. Canonical file links and heading anchors resolve. The local app/database processes were stopped after verification. The shared database's nine original migration checksums were verified unchanged. Changes remain local on `codex/schema-and-domain-types`, unpushed and undeployed.
