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

Display names are membership-time snapshots from Clerk; they do not grant permission. Changing a Clerk profile does not yet synchronize these labels. Ownership transfer, self-service account/project deletion, audit history, production abuse controls, and invitation email delivery are not implemented. The owner cannot be removed through the current member-removal operation.

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
