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
