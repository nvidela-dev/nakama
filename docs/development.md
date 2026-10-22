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
