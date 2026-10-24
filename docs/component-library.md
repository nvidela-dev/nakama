# Component library

The explorer uses [Storybook’s Next.js/Vite integration](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite), pinned in the lockfile.

Nakama's internal library lives at `src/shared/ui`. Application features import it directly; Storybook imports those same source files and the application's styles. It is attached to this project as source, not a published package or a separately deployed service.

```sh
npm run storybook          # http://localhost:6006
npm run storybook:build    # ignored storybook-static output
npm run test:components   # starts local Storybook and runs browser checks
```

The browser checks use installed Chrome by default. For a managed Playwright Chromium installation, set `PLAYWRIGHT_CHANNEL=chromium` and install that browser first. No Clerk or database credentials are required. Stories contain synthetic data only. `npm run frontend:check-bundle` also rejects Storybook, story modules and accessibility tooling in the application’s deployment traces; this runs after production builds. Storybook telemetry is disabled; the static build is not automatically published.

## Available components

| Import | Components and responsibility |
| --- | --- |
| `@/shared/ui/button` | Button variants, pending/disabled state; IconButton requires an accessible label |
| `@/shared/ui/controls` | Input, Select, Textarea with native attributes, form actions, and React 19 refs |
| `@/shared/ui/panel` | Panel surface, StatusMessage alert/status semantics, EmptyState |
| `@/shared/ui/feedback` | Translated shared action feedback, independent of domain actions |
| `@/shared/ui/action-menu` | Native chevron disclosure with labeled trigger, Escape/outside dismissal and ordinary button navigation |
| `@/shared/ui/dialog` | Named native Dialog with focus trapping/restoration, Escape/backdrop dismissal, scroll locking, and pending dismissal control |
| `@/shared/ui/tabs` | Controlled Tabs with Arrow/Home/End navigation and mounted inactive panels to preserve drafts |
| `@/shared/ui/progress-marker` | Bounded concentric progress fill; accessible name or explicit decorative use |
| `@/shared/ui/loading-state` | Named loading skeletons (`stack`, `cards`, `workspace`, `compact`, `map` variants) with subtle shimmer/pulse bone animation and reduced-motion support |
| `@/shared/ui/markdown-reader` | Safe Markdown/GFM reader; no raw HTML, executable URLs, or automatic remote-image loading; named read-only task checkboxes |
| `@/shared/ui/icon` | Typed Lucide interface icon catalog, consistent sizing and decorative SVG semantics |
| `@/shared/ui/wave-mark` | Shared brand mark |

`src/app/globals.css` is the only stylesheet. Tailwind CSS v4 supplies utilities; `@theme` owns the `--color-*`, font, and animation tokens. The root PostCSS configuration is shared by Next.js and Storybook. Import globals once in each entrypoint.

Put complete utility strings on the element they style. Use component props and conditional utility strings for variants, `lg:compact:` for desktop density, responsive variants for layout, and `motion-reduce:` for animation. Keep arbitrary descendant variants for rendered Markdown or component composition where the child is not owned locally. Prefer direct utilities for children owned by the component. Marker classes used by tests remain stable, but have no custom stylesheet rules.

Shared primitives use `:where` for low-specificity defaults so caller utilities override them without a runtime class-merging dependency. The small `cn` helper joins complete strings; it does not resolve conflicting utilities. Choose one value per property and variant. Inline styles are reserved for runtime values such as progress percentages, task depth, and 3D label positions.

The architecture check parses CSS and rejects additional stylesheets, custom selectors, nested component rules, and CSS imports outside the Tailwind entrypoint. Globals permits only theme tokens/keyframes, the compact variant, and the documented browser motion resets. Do not copy component markup or styling into stories. The project setup dialog is a feature component loaded on its first opening; it stays mounted afterward to preserve drafts across dismissal. Its creation action is injected so stories can exercise validation without backend writes.

## How to add UI

1. Keep feature-specific components in that feature. Promote a component to the library when its meaning and behavior apply across features; do not move domain orchestration into UI for reuse.
2. Give public props useful native types and explicit states. Pass labels/content into primitives. A component must remain usable without Clerk, a database, a router, or a Server Action.
3. Add a colocated `*.stories.tsx` using `satisfies Meta<typeof Component>` and `StoryObj<typeof meta>`. Show relevant empty, error, loading, disabled, pending, and interactive states.
4. Use the Storybook language, density, and style toolbar. UI text is passed by callers; feature stories use the shared translator. Never translate user-authored content.
5. For interactive behavior, add a browser check in [the component suite](../tests/browser/components.spec.ts). Test keyboard use, focus restoration, and retained state. Axe checks reject serious/critical violations in the selected examples; they are not a claim of complete accessibility coverage.
6. Run lint, architecture/type checks, Storybook build, and component checks. Check actual application use too: isolated stories do not prove route integration.

## Examples

```tsx
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/controls";

<label htmlFor="name">Project name</label>
<Input id="name" name="name" required maxLength={100} />
<Button type="submit" pending={pending}>Save changes</Button>
```

Controlled fields remain disabled in SSR until hydration attaches their change handlers, preventing early input from being overwritten. Uncontrolled and hidden native form inputs retain progressive behavior. Button defaults to `type="button"`; form submission must be explicit. Use Next Link for internal navigation rather than an event handler that pushes a URL from a button. Keep direct browser requests for private artifact images: the image optimizer cannot forward the authenticated session required by those routes.

```tsx
<Dialog open={open} onClose={close} dismissible={!pending} labelledBy="edit-title">
  <h2 id="edit-title">Edit project</h2>
  {/* Feature-owned form and actions */}
</Dialog>
```

Dialogs require either `label` or `labelledBy`. A pending operation can prevent dismissal. Individual features still decide whether closing retains or discards a draft; the shared dialog does not perform mutations.

## Icon catalog

Use `Icon` from `@/shared/ui/icon` for interface icons. The typed catalog uses [Lucide React](https://lucide.dev/guide/react/) with explicit imports; it does not load a remote font or a dynamic whole-library icon lookup. Browse **UI/Icon → Catalog** in Storybook before choosing an icon. Add a real Lucide export to this catalog when a new meaning is needed; do not invent SVG paths or use Unicode glyphs for interface controls.

```tsx
<IconButton label="Delete project"><Icon name="delete" /></IconButton>
```

Icons inherit text color, default to 16px with a consistent stroke, and are decorative. Keep the accessible name on the containing control or visible text. The Nakama wave remains the custom brand mark; concentric progress indicators and the 3D map remain data visualizations. Architecture checks reject direct library imports outside the catalog and custom inline SVGs outside the wave.


## Visual styles

`src/shared/ui/style-theme.ts` owns the typed style catalog. Hacker is the default; Zen uses cream paper, indigo, weathered blue, and rust. The root layout reads the `nakama-theme` cookie and renders the palette before first paint. The footer selector saves a validated, year-long, HTTP-only preference without touching project data. Invalid or absent preferences fall back to Hacker. Storybook's Style toolbar uses the same catalog.

Use the `--color-*` Tailwind tokens for text, surfaces, borders, and accents, including gradient stops. The style catalog also sets the legacy core aliases for compatibility. Supplemental semantic `--theme-*` variables have existing Hacker colors as fallbacks; Zen overrides those roles. This preserves the default palette while allowing a complete light style. Add a style through the catalog and test text/button contrast, reload persistence, narrow-screen overflow, and component states. Canvas renderers subscribe to the root style so their colors follow changes too.
