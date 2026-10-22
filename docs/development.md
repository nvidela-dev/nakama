# Development and verification

The first application slice implements Clerk integration, project capture, per-project owner/member access, and recipient-specific invitations. It is not deployed or connected to cloud services yet. Guided stages, comments, and export remain subsequent work.

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

Before enabling a real environment, test the whole browser journey with two Clerk users: capture/reload, invite the second verified email, open the link while signed out, sign in, accept, reload, revoke a pending invitation, and remove an existing member. Check direct project URLs as a third user. Confirm no private content is rendered or cached for a non-member. No real Clerk session or Neon endpoint was available during the initial PR verification.

The public landing page was checked in Chrome at 1440px and 390px, with no JavaScript page errors or mobile overflow. Protected pages fail closed without configured identity. Browser verification of authenticated forms remains a setup-dependent release check.

## Invitation implementation

Owner creates a 7-day link for one email, shares it manually, and can revoke it. A replacement revokes the old unused link. Only a verified matching Clerk email can accept. No email service is configured or automatic email sent.

Tokens are random 256-bit values; only their SHA-256 hashes are stored. Links carry the secret in the URL fragment, so it is not sent as an HTTP path/query or referrer. Acceptance uses a POST Server Action. The sign-in modal keeps the fragment in place; after sign-in the form reads and removes it from browser history. If the page is reloaded after that, reopen the original link. Never log action bodies or capture invitation screens in public artifacts.

Display names are membership-time snapshots from Clerk; they do not grant permission. Changing a Clerk profile does not yet synchronize these labels. Ownership transfer, self-service account/project deletion, audit history, production abuse controls, and invitation email delivery are not implemented. The owner cannot be removed through the current member-removal operation.
