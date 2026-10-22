# Visual and interaction direction

**Confirmed direction:** spatial, 3D, chill, piratey/hackery, lovely and satisfying with friends. Named stages expand into downward trees; nodes open readable guidance and answers. Specific theme assets, palettes, metaphors, and rendering technology remain proposals.

## Navigation contract

1. Project overview: name, purpose, flow, members, named stages, progress, and a suggested next action.
2. Expanded stage: downward question/activity tree, visible branches and outcomes, clear current location, and stage discussion.
3. Open node: plain-language question, optional example, answer editor, save state, relevant learning/evidence, and node discussion. Close/back returns to the same stage location.

A persistent breadcrumb and simple stage list accompany spatial navigation. Direct links identify a stage/node without bypassing access checks. Project-level comments live in a clearly labeled discussion area. The project menu offers context export once implemented.

## Copy and feedback

Ask “Who would use this?” instead of “Define your ICP.” Present examples as examples with no prefilled factual claims. Offer “I don't know yet” and room to record what would help answer. Label save states: unsaved, saving, saved, failed/conflict; preserve the draft on failure. Feedback distinguishes an answered question from a verified assumption.

Answered nodes can gently light up or gain a mark; skipped/blocked/unknown states have text and symbols. A small celebration should acknowledge effort or learning, not pressure friends into a streak. Revisiting should feel normal. No fabricated collaborator presence or progress.

## Proposed art direction

Explore floating islands or a friendly ship workshop, softly lit paths, restrained terminal-like details, and warm colors. These are candidates for a prototype, not committed branding. Test whether the scene makes the stage sequence easier to understand before investing in assets. Use ordinary readable panels for forms rather than text painted onto moving 3D surfaces.

## Mobile, accessibility, and performance

Design a one-column stage list and node sheet for narrow screens. All actions have touch-friendly controls and keyboard equivalents; dragging, zooming, and hovering are never required. Keep focus visible; opening/closing a node restores focus predictably. Provide semantic headings, labeled fields, error announcements, sufficient contrast, and textual progress.

Reduced motion disables camera flights, parallax, and celebration animation. A lightweight 2D/list mode exposes the same content, actions, and save behavior even if 3D fails or is disabled. Load heavy visuals separately from the usable form interface. Keep unsaved content safe during view changes.

Before M5 acceptance, compare capture → stage → answer → comment → export on a desktop and a modest phone, with keyboard and a screen reader pass. Measure loading/input responsiveness and agree a performance budget from the prototype; no speed claims exist yet. The 3D layer must not be necessary for completing these tasks.

## Desktop density and ultrawide screens — 2026-10-22

Desktop defaults to Compact at 1024px and wider. The header offers Compact / Comfortable and remembers the selection in a browser cookie. Compact uses the available viewport width, including ultrawide displays, with a fixed-width crew/capture sidebar, a responsive project-card grid, short stage rows, tighter question branches, and side-by-side answer/state controls. An open stage or answer retains an overview navigation bar. Comfortable preserves the original roomy layout. Phone and tablet spacing stays unchanged regardless of the saved desktop preference. Density is presentation only: changing it keeps drafts and selected values mounted.

## Interface language and entry route — 2026-10-22

Use direct, professional language in English and Spanish: Projects, New project, Members, Save, and factual status messages. Remove whimsical encouragement, harbor/crew metaphors, and promotional filler from working screens. Signed-in visits to `/` redirect on the server to `/projects`; signed-out visits retain the public landing page. Project authorization remains enforced by the destination page and services.

## Optional 3D mini-view — 2026-10-22

The project journey offers a cube-icon toggle immediately left of the progress wheel, initially off, with a localized Show / Hide 3D mini-view accessible label and tooltip. This adds a compact spatial stage sequence above the existing tree and editor. Each stage retains its question/activity/outcome dependency branches, including joins. Saved states color the nodes; stage labels distinguish not started, in progress, and explicitly reviewed. Revisit flags remain accessible as text. This shows the project's saved progress, not a timeline of visits.

Stage labels and question points are ordinary keyboard-accessible navigation links; node names and states appear on hover/focus and in accessible labels. Perspective buttons rotate in discrete steps without continuous motion, dragging, or camera flights. The map scrolls within its own region on phones. Its canvas is decorative to assistive technology; semantic links and the ordinary working tree remain available. WebGL failure displays a message directing members to the tree. Toggling does not replace or unmount answer forms. The mini-view requests no additional private data and uses the page's existing membership-checked guidance.

The user's supplied reference refines the mini-view toward a dark technical display: wireframe stage volumes in Nakama’s lime, peach, and muted green palette, luminous answered nodes, fine connecting lines, a perspective floor grid, restrained scan lines, and monospace labels. The stage sequence now occupies depth as well as width, while each stage retains its downward dependency branches. There is no automatic animation, flashing, or invented telemetry.

## Project list cards — 2026-10-22

Project cards display only the project title as their navigation link. Descriptions, ownership/member labels, and the private-project footer are omitted from the list; project details and membership rules are unchanged.

Each titled project card now includes a compact horizontal stage timeline for its selected flow. Stage labels and answered-question counts remain visible; partial rings show answer coverage, a check indicates explicit human review, and an exclamation flags revisiting. Tooltips and accessible list labels additionally report blocked/skipped counts. Answer coverage does not imply review or validation. Projects without a flow show a muted five-position placeholder timeline with empty rings and short label bars. No stage names or progress counts are invented; accessible text and a tooltip explain that a flow must be chosen. The entire card remains one navigation link.

Compact desktop project cards stretch to the tallest card in each grid row. Mixed cards with and without a selected flow retain aligned bottoms and consistent row gaps.

## Management from the main screen — 2026-10-22

The Projects screen exposes edit and delete controls on owner project cards. These open a native modal dialog over the existing list, with a close control, Escape dismissal, keyboard focus containment/restoration, and the same revision-aware edit and exact-name delete forms used on project pages. Card titles/timelines remain navigation links; action buttons are separate siblings, never controls nested inside links. Settings forms mount only while the dialog is open, keeping the ordinary list light and avoiding duplicate active fields.

For the application administrator, the sidebar also provides an allowed-email form and an expandable whitelist with removal controls. Non-admins receive no whitelist data or controls. Full project and Administration pages remain available. New project capture stays in the main sidebar. Desktop cards retain aligned row heights and compact action buttons; phone controls support touch targets.

## Access-request review — 2026-10-22

Administration shows the allowed-email list and a separate Access requests section with email, first-request time, Allow email, and Dismiss. The main sidebar exposes the same request controls in an expandable section. Empty queues say there are no pending requests. These are submitted, unverified identifiers, not confirmed people or imported rejected-signup history.

Signup begins with an email-only step. Allowed emails continue to Clerk signup; others receive a saved-request confirmation and remain unable to sign up until explicitly approved. The access-required page offers the same request form for people reaching a private route without admission. Requests do not notify the submitted email address.

## Contextual discussion and activity — 2026-10-22

The working column shows a Discussion section below the overview, expanded stage, or open question. Its heading identifies the exact target; changing scope changes the thread. Comments display author, original time, edited status, and former-member attribution. Authors can edit/remove; owners can moderate. Deletion requires a separate confirmation and leaves a visible marker. Errors announce without clearing drafts. HTTP(S) links open safely; arbitrary HTML/Markdown is displayed as plain text. Comments remain separate from answers and agreed decisions.

The members sidebar includes an expandable Activity section, open on project overviews. It lists attributable changes with context links and timestamps; answer states distinguish drafts and answered directions. Earlier history is explicitly limited to existing answer revisions and stage reviews. Older/latest links page comments and activity independently while retaining stage/node context. There are no live updates, automatic notifications, or fabricated presence indicators; reload to see another person's newer changes. Public preview data has no private discussion or activity access.

Owner project edit/delete controls sit beneath the right-hand members/activity panel, stacking below it on narrow screens.

The accepted brand mark is a curling wave. Interface brand motifs and browser/home-screen icons share its silhouette, retaining the dark green background, lime mark, and pink accent in app icons.
