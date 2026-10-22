# Collaboration and access

**Confirmed:** membership and invitations are per project; different friends can join different projects. Comments can target the project, a stage, or a node. The first implementation uses the owner/member policy below with Postgres as membership authority. Ownership transfer and content collaboration remain later work.

## Initial policy and implementation scope

Projects are private to active members. Two roles keep the first version understandable:

| Capability | Owner | Member | Non-member / pending invite |
| --- | --- | --- | --- |
| Read project, answers, comments, decisions | Yes | Yes | No |
| Edit answers and record learning/decisions | Yes | Yes | No |
| Comment and export authorized context | Yes | Yes | No |
| Invite/revoke invitations/remove members | Yes | No | No |
| Edit project name/description; permanently delete project | Yes | No | No |
| Transfer ownership | Yes, to an active member | No | No |

Creating a project creates its owner membership atomically. The last owner cannot leave or be removed without transfer. No read-only role or private node-level discussions in the first version; all project content is visible to all active members. Do not confuse project privacy with the GitHub repository's visibility.

## Invitations and removal

Invite a specific verified identity/email to one project; do not implement unrestricted join links by default. For application-managed invitations, store a hashed, single-use token with expiry, intended recipient, role, project, inviter, and lifecycle timestamps. If Clerk Organizations is chosen, use its invitation lifecycle and verify the equivalent policy before committing to provider-specific behavior; do not duplicate its token store. Implemented invitations expire after 7 days and are manually shared links. Automated email delivery remains open. Acceptance checks signed-in verified identity, token, expiry, revocation, and current inviter authority, then creates membership transactionally. Repeated acceptance by the same recipient is idempotent. Invitation URLs and tokens never enter comments, exports, or analytics logs.

A pending invitation grants no content access. An invitation landing page exposes only the minimum information needed to accept. Removal revokes pending invitations for addresses previously used by the member to join. A fresh invitation created afterward can intentionally re-grant access. Removal stops subsequent reads, writes, exports, and future AI access; authorize again at execution and commit boundaries. Previously downloaded Markdown cannot be recalled. Retain old authorship with a former-member label rather than pretending someone else wrote it.

## Server-side boundary

Every read/write resolves the target project and checks current membership and capability. Nested stage/node/comment IDs must belong to that project. Apply this to lists, search, cached responses, direct URLs, background jobs, exports, and future chat/agents. UI hiding and an active organization selection alone are insufficient. Cache keys and invalidation must respect membership changes; never serve private responses through a shared public cache.

Use one access policy implementation; provider identity establishes who the person is, while the project policy determines what they may do. If memberships are external, define freshness/revocation handling before launch rather than trusting a stale local mirror.

## Comments and shared editing

Each comment has one validated target, author, created/edited timestamps, and content. Initial proposal: plain text with safe links, a flat chronological discussion per target, editing/deleting one's own comments, and owner removal with a visible moderation event. A deleted comment becomes a tombstone; export omits its former body. Retention policy must be settled before storage implementation.

Comments are suggestions/discussion until a person explicitly incorporates them into an answer or decision with attribution. Use revision checks for simultaneous edits and show the new saved answer alongside the stale draft for reconciliation. Do not promise real-time editing in the first release.

## Required access verification

Exercise owner/member/non-member across two projects with overlapping membership. Include forged project and child IDs, list endpoints, removed members, revoked/expired/wrong-recipient invites, repeat acceptance, stale edit conflicts, cache invalidation, and exports. Verify failures expose neither foreign content nor invitation secrets.

## Project editing and deletion — 2026-10-22

Owners can edit the name and description in project settings. Updates use a project revision snapshot to reject stale submissions. When a flow exists, changed fields save through the same answer-revision behavior as guided edits, preserving attribution and invalidating dependent reviews. Both field changes commit atomically. Members retain the existing ability to answer guided questions; project settings do not change that policy.

Owners may permanently delete a project after entering its exact current name in an explicit confirmation form. Deletion atomically removes its memberships, invitations, selected flow, answers, answer revisions, stage reviews, review history, and project record. No retained tombstone or in-app recovery exists for this operation. This policy applies only to whole-project deletion; account deletion, standalone comment retention, and ownership transfer remain unresolved. Authorization is checked server-side for both operations. An old project URL or invitation grants no access after deletion. No existing project is deleted by deploying the feature.

## Application admission and administrator — 2026-10-22

The app administrator is the account with the verified email configured in the server-only `NAKAMA_ADMIN_EMAIL` environment variable. The requested administrator is configured in ignored local settings and the hosting environments, not committed as a personal address. Administration does not grant membership in private projects.

Clerk's email allowlist is the authority for app admission. Only the administrator can list, add, or remove exact allowed emails through `/admin`. Wildcards are rejected, additions send no notifications, and the administrator cannot remove their own entry. Clerk's allowlist restriction blocks unapproved sign-ups. Every private page and action also checks the current account's verified emails against the list before project authorization, covering already-existing accounts and sessions. An invitation alone does not grant app admission or override membership checks. Removing an email blocks subsequent private requests; it does not delete identities, memberships, or historical content. Existing in-flight requests and already-downloaded content cannot be recalled.

Unapproved accounts see `/access-required`; non-admins cannot read whitelist entries or invoke its management actions. Missing administrator configuration fails closed. The public landing page, illustrative preview, sign-in, and sign-up UI remain public. Provider failures do not admit ordinary accounts.

## Access requests — 2026-10-22

People can submit an email for approval before signup or from the access-required page. An unapproved submission creates a deduplicated pending entry in Clerk's existing waitlist storage with notifications disabled; it does not create an account, verify ownership, grant admission, or create project membership. An already-allowed email continues to the ordinary Clerk signup form, where the allowlist and verification still apply.

Only the administrator can list requests, allow their exact emails, or dismiss them. Both Administration and the main-screen admin panel display pending emails and first-request timestamps. Submitted identifiers are explicitly labeled as unverified. Requests remain until allowed/dismissed; allowlisting precedes queue deletion, and already-allowed emails are filtered from the pending view if cleanup fails. Approval sends no invitation or notification email. Dismissal removes the request without granting access; a later submission can create another request. This queue is prospective and is not a history of Clerk's rejected authentication events. No historical signup rejection is inferred from an existing account.
