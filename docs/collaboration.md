# Collaboration and access

**Confirmed:** membership and invitations are per project; different friends can join different projects. Comments can target the project, a stage, or a node. The first implementation uses the owner/member policy below with Postgres as membership authority. Contextual comments and project activity are implemented; ownership transfer remains later work.

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

Each comment has one validated target, author, created/edited timestamps, and content. Implemented policy: plain text with safe HTTP(S) links, flat chronological discussions per target, editing/deleting one's own comments, and owner removal with an attributable moderation event. Deletion permanently clears the body and leaves a tombstone; a future export must omit the former body. Whole-project deletion removes the discussion and its activity. No old comment bodies are retained as hidden revisions.

Comments are suggestions/discussion until a person explicitly incorporates them into an answer or decision with attribution. Use revision checks for simultaneous edits and show the new saved answer alongside the stale draft for reconciliation. Do not promise real-time editing in the first release.

## Required access verification

Exercise owner/member/non-member across two projects with overlapping membership. Include forged project and child IDs, list endpoints, removed members, revoked/expired/wrong-recipient invites, repeat acceptance, stale edit conflicts, cache invalidation, and exports. Verify failures expose neither foreign content nor invitation secrets.

## Project editing and deletion — 2026-10-22

Owners can edit the name and description in project settings. Updates use a project revision snapshot to reject stale submissions. When a flow exists, changed fields save through the same answer-revision behavior as guided edits, preserving attribution and invalidating dependent reviews. Both field changes commit atomically. Members retain the existing ability to answer guided questions; project settings do not change that policy.

Owners may permanently delete a project after entering its exact current name in an explicit confirmation form. Deletion atomically removes its memberships, invitations, selected flow, answers, answer revisions, stage reviews, review history, and project record. No retained tombstone or in-app recovery exists for this operation. This policy applies only to whole-project deletion; account deletion, ownership transfer and account retention remain unresolved. Authorization is checked server-side for both operations. An old project URL or invitation grants no access after deletion. No existing project is deleted by deploying the feature.

## Application admission and administrator — 2026-10-22

The app administrator is the account with the verified email configured in the server-only `NAKAMA_ADMIN_EMAIL` environment variable. The requested administrator is configured in ignored local settings and the hosting environments, not committed as a personal address. Administration does not grant membership in private projects.

Clerk's email allowlist is the authority for app admission. Only the administrator can list, add, or remove exact allowed emails through `/admin`. Wildcards are rejected, additions send no notifications, and the administrator cannot remove their own entry. Clerk's allowlist restriction blocks unapproved sign-ups. Every private page and action also checks the current account's verified emails against the list before project authorization, covering already-existing accounts and sessions. An invitation alone does not grant app admission or override membership checks. Removing an email blocks subsequent private requests; it does not delete identities, memberships, or historical content. Existing in-flight requests and already-downloaded content cannot be recalled.

Unapproved accounts see `/access-required`; non-admins cannot read whitelist entries or invoke its management actions. Missing administrator configuration fails closed. The public landing page, illustrative preview, sign-in, and sign-up UI remain public. Provider failures do not admit ordinary accounts.

## Access requests — 2026-10-22

People can submit an email for approval before signup or from the access-required page. An unapproved submission creates a deduplicated pending entry in Clerk's existing waitlist storage with notifications disabled; it does not create an account, verify ownership, grant admission, or create project membership. An already-allowed email continues to the ordinary Clerk signup form, where the allowlist and verification still apply.

Only the administrator can list requests, allow their exact emails, or dismiss them. Both Administration and the main-screen admin panel display pending emails and first-request timestamps. Submitted identifiers are explicitly labeled as unverified. Requests remain until allowed/dismissed; allowlisting precedes queue deletion, and already-allowed emails are filtered from the pending view if cleanup fails. Approval sends no invitation or notification email. Dismissal removes the request without granting access; a later submission can create another request. This queue is prospective and is not a history of Clerk's rejected authentication events. No historical signup rejection is inferred from an existing account.

## Comment concurrency and project activity — 2026-10-22

Every comment/feed read and every comment action checks current membership; app administration does not bypass it. Authors edit or remove their own active comments; owners can remove another author's comment but cannot rewrite it. Edit/remove actions compare a revision captured when editing/confirming begins, including across language or server refreshes. Failures retain the draft. Server-side template checks reject mismatched stage/node targets, and project IDs scope all comment lookups.

Project and comment events save atomically with source writes. The feed also reads existing retained answer revisions and stage-review history. It shows actors, timestamps, targets, and answer states/direction choices, not full comment/answer bodies. Invitation events never include recipient emails or tokens. Current members can inspect former authors' retained contributions with a former-member label; removed members cannot read the feed or change comments. Keyset pagination exposes older records without truncating the collection or depending on browser-local dates.

### Approved-person selection

Members remains expanded. Only project owners see the approved-person dropdown for invitation creation. Candidate emails come from the application allowlist, excluding addresses belonging to existing project members; owners may discover these candidates without gaining allowlist-management rights. Server Actions check ownership and candidate eligibility again before creating the existing verified-recipient link. Approval does not itself grant membership, and selection does not send email or bypass recipient acceptance.

## Shared tasks and task files — 2026-10-22

Current owners and members may create, edit, change task status/expansion, delete, import, and export a project's tasks. Outsiders, removed members, and application administrators without project membership receive no task access. Every operation rechecks membership; IDs and parent references are scoped to the same project. Project-serialized writes compare a task-list revision, protecting bulk operations from newly added descendants. Import preview is local until confirmed; the server validates the selected tree and current revision before one atomic append. Export rechecks membership and returns only the current project's Lock-In task representation. Expansion state is shared, matching Lock-In's saved tree state. Task changes and generic activity events commit together without embedding deleted titles in the feed. Whole-project deletion removes all task data and import receipts.

## Unread comment inbox — 2026-10-23

The header bell lists active comments by other people across the viewer's current project memberships, with an unread count and paginated project/author/text previews. Existing comments begin unread; own comments and deleted bodies are excluded. No administrator bypass applies. Server Actions recheck app admission, and each list/count/read-receipt statement joins current project membership.

Read receipts are per person and comment, stored in migration 007. A comment becomes read after it is visible in its discussion for one second in a foreground tab, or through its explicit Mark as read control. Merely opening the bell does not clear comments. Edits to an already-read comment do not create another unread notification. Project deletion cascades through receipts. Removal immediately excludes a project's comments from subsequent requests.

Notification links select the exact project/stage/node and comment, including comments older than the default discussion page. The comment-page lookup rechecks membership and target scope. Previews contain at most 240 characters of current text; full text remains in the authorized discussion. The bell refreshes on navigation, window focus, confirmed reads, opening, and once per minute while visible; this is in-app polling, with no email or push delivery.

## Private artifacts and uploaded files — 2026-10-23

Current project owners and members may list, create, edit, upload, download, and remove artifacts and their to-dos. The global artifact library is a union of current project memberships, with no administrator bypass. Every Server Action checks app admission; services check project membership and nested artifact/file identity again. Removed members lose subsequent library/detail/file/action access. Shareable artifact URLs grant no membership and do not expose names to outsiders.

Private media is served through a membership-checked project/artifact/file route with no-store headers and no public storage URL. The upload validator checks content rather than trusting the filename or browser MIME. SVG/HTML/executables are not image formats. Markdown is UTF-8 text, rendered without raw HTML or executable links; remote Markdown images appear as links instead of making automatic external image requests. Downloads preserve the original safe filename.

Metadata, files, and to-dos share a revision; conflicts preserve the editing person's drafts. Activity records artifact create/update/delete without file bytes, document content, GitHub URLs, or task titles. Exact-name confirmation permanently removes an artifact and all its files/to-dos. All members may perform this operation, consistent with shared task editing. No public publishing, GitHub repository creation, external synchronization, or automatic artifact generation is included.

## Project lineage access — 2026-10-23

Creating or removing a relationship requires current membership in both source and spawned projects; either Owner or Member may do this. Spawning gives only its creator membership in the new project. Linking does not invite or admit anyone. A project's relationship list includes only other projects the viewer currently belongs to, with no hidden names, IDs, placeholders, or counts. Direct navigation checks the destination's membership as usual. Source selection lists only the viewer's projects; the server rechecks submitted IDs inside the creation transaction. Removing membership hides that endpoint and prevents subsequent link changes.
