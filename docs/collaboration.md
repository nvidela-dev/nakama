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
