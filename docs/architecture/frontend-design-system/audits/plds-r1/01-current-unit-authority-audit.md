# PLDS-R1 current unit and responsive authority audit

Date: 2026-07-27
Scope: source inspection only; no production CSS, component, configuration, or visual change was made.

## Executive summary

The active frontend is a Vite React application using Tailwind CSS 4.1.14, loaded through `client/src/index.css`. Its sizing authority is deliberately mixed: Tailwind's generated utility scale supplies most ordinary sizing; `index.css` supplies a small fluid token layer, page rails, and global fluid typography; individual components supply a large number of arbitrary Tailwind values for local geometry.

The principal policy conflict is the active `html { font-size: clamp(14px, 0.9vw, 16px) }`. It uses pixel bounds and a viewport preferred value, so it replaces the browser's root-font-size relationship rather than preserving it. The global `body` and heading rules then place another viewport-based fluid layer above it. This is not evidence that the product is currently broken, but it is an unsafe candidate for a blind global conversion because most Tailwind `rem` utilities are downstream of that root.

There are two dormant global style files, `client/src/globals.css` and `client/src/styles/theme.css`, containing overlapping rem-based sizing variables. Neither is imported by the runtime entry. The active foundation contract test explicitly guards against importing `theme.css`. The imported `design-system/components.css` supplies fixed pixel icon sizes. Thus, CSS variables, Tailwind configuration, the imported design-system stylesheet, and local arbitrary utilities are overlapping sources of values, but only `index.css` is the active product-wide runtime token entry.

Viewport breakpoints are the dominant responsive authority. Standard Tailwind prefixes appear widely in page layouts, and raw CSS breakpoints appear in `index.css`, `advertise-responsive.css`, and the billboard stylesheet. JavaScript media hooks independently use 767, 768, 769, 1024, and 1025 pixel boundaries. One reusable form primitive uses a named container query (`@container/field-group` and `@md/field-group`); no container-query units are in active source. That field primitive is a good controlled pilot, whereas page grids, navigation, and route-specific marketing layouts should retain viewport decisions until their intent is reviewed.

The reusable primitives generally make sound bounded-layout choices: `PageFrame` is flexible and capped, the dialog is full-width within a calculated inset, drawers cap their height, and table wrappers deliberately scroll horizontally. The material risks are fixed control heights with `whitespace-nowrap`, line clamps on listing titles, viewport-height bounds for mobile overlays, height-based hero/media implementations, and desktop grid templates with fixed secondary tracks. These are static risks only; no browser conformance claim is made.

## Repository scope and provenance

| Item | Evidence |
| --- | --- |
| Control repository | `/home/edwardspc/Desktop/Dev/property-listify-main` |
| Audit worktree | `/home/edwardspc/Desktop/Dev/listify-plds-r1-units-audit` |
| Audit branch | `audit/plds-r1-units-responsive-scaling` |
| Starting HEAD / `origin/main` | `87494145e0103bcb2bfc0a674ae75c26c104a2a6` |
| Control checkout before fetch | clean at `01037c8540fdbd66c9a270c688e815c1d48af59e` |
| Local `main` after fetch | differs from current `origin/main` (behind; audit starts from `origin/main`) |
| Audit worktree at creation | clean |

Inspected active source includes the runtime entry, all standalone styles, Tailwind integration, `components/ui`, `PageFrame`/`PageHeader`, `EnhancedNavbar`, search/filter surfaces, listing and development cards, Explore, Services, Agency and Developer workspaces, Prospect drawer, advertise/distribution surfaces, form primitives, tabs, drawers, dialogs, and tables. Test-only, documentation, generated, dependency, and dormant usages were separated where determinable. See [the unit inventory](02-css-unit-inventory.tsv), [responsive inventory](03-responsive-authority-inventory.tsv), and [fixed-size risk inventory](04-fixed-size-and-content-growth-risks.tsv).

## Global CSS authority

`client/src/main.tsx` imports `index.css` and `styles/reduced-motion.css`. `App.tsx` imports `styles/keyboard-navigation.css`; the distribution public page imports two advertise stylesheets. `index.css` imports Tailwind, configures it with `client/tailwind.config.js`, imports `tw-animate-css`, and imports `design-system/components.css`.

`index.css` is therefore the active global token and foundation entry. It defines colour variables, radii, fluid spacing/card variables, content rail variables, a viewport-clamped root font size, global body and headings, page/container utilities, and custom fluid utility classes. It does not declare global `box-sizing`; Tailwind v4's imported Preflight is the effective global border-box authority. No global minimum document width or body/root fixed height was found in active CSS.

`globals.css` and `styles/theme.css` define overlapping rem-based spacing/type/component variables but have no runtime import. The foundation test identifies `theme.css` as dormant. Treat them as `DORMANT_AUTHORITY`, not a fallback policy. `design-system/components.css` is imported and supplies fixed 16/20/24/32px icon classes, a legitimate visual-detail authority but separate from the active token layer.

## Tailwind authority

Tailwind 4.1.14 is active via `@import 'tailwindcss'` plus `@config "../tailwind.config.js"`. The config extends colours, radii, shadows, spacing (`--space-*` / card variables), and duplicated fluid font definitions. No custom `screens` setting was found, so responsive prefixes rely on Tailwind defaults rather than a repository-declared breakpoint scale.

The source uses ordinary Tailwind width/height, min/max, grid/flex, spacing, typography, aspect-ratio, responsive visibility, and breakpoint utilities throughout. It also contains 3,197 lexical arbitrary utility occurrences in active TS/TSX source. This is a pressure signal, not 3,197 defects: the count includes colours, shadows, and local visual details. Meaningful recurring sizing examples include `text-[10px]` (159), `text-[11px]` (197), `tracking-[0.14em]` (41), `h-[300px]` (14), `h-[400px]` (14), `h-[500px]` (13), `min-w-[120px]` (11), `max-h-[90vh]` (8), and `max-h-[92vh]` (7). Repetition makes the first group candidates for a later typography/overlay review; it does not authorize a global replacement.

## Unit usage summary

The active source contains `px`, `rem`, `em`, percentages, `ch`, `vw`, `vh`, `svh`, `fr`, CSS math functions, `minmax()`, `auto-fit`, and aspect-ratio utilities. The sidebar primitive uses Tailwind `min-h-svh` and `h-svh`, which compile to modern small-viewport-height sizing; this is existing precedent, not a product-wide viewport policy. Active Tailwind utilities such as `w-max`, `min-w-max`, and `max-w-max` also compile to intrinsic `max-content` sizing. The source has no active `ex`, `lh`, `rlh`, `vmin`, `vmax`, `svw`, `lvw`, `lvh`, `dvw`, `dvh`, container-query unit, `min-content`, `fit-content`, or `auto-fill` declarations. The source-wide literal search is intentionally not reported as a policy-quality metric: direct CSS declarations, Tailwind strings, inline style data, and non-layout code have different meanings. The inventory records active meaningful patterns instead.

Dominant relationships are:

- `rem` for Tailwind's ordinary spacing, type, and dimensions, but its resolved size is influenced by the active root clamp.
- `px` for exact icons, thin borders/radii, typography arbitrary values, fixed card/media heights, and many local component requirements.
- percentages and `w-full` for containing-block width; `fr`/`minmax()` for desktop grids.
- `vw` in page-level fluid tokens, viewport-bounded menus/toasts, and horizontal carousel cards.
- `vh` for modal/drawer bounds, short-form media, maps, and a few hero/loading heights.
- `svh` in the sidebar primitive, where a stable small viewport height is part of the full-height navigation relationship.
- intrinsic `max-content` sizing through active Tailwind `w-max`/`min-w-max`/`max-w-max` utilities, where content width is intentional rather than a generic grid rule.
- unitless line heights in the active global base (`1.55`, headings `1.2`–`1.4`) and Tailwind classes such as `leading-tight`; this is an appropriate existing pattern.

## Responsive authority summary

Page and route layouts primarily change at viewport width using Tailwind `sm`, `md`, `lg`, and `xl` variants. `index.css` additionally uses 600, 640, 768, 1024, and 1280px raw media queries. `advertise-responsive.css` uses 639/767/768/1023/1024px. JavaScript hooks independently define a 768px mobile breakpoint, `useMediaQuery` defines `<=768`, 769–1024, and `>=1025`, and individual components use 767px. This overlap is `RESPONSIVE_COUPLING`: equivalent-looking mobile decisions can disagree at 768px.

Container responsiveness exists only in `components/ui/field.tsx`: `FieldGroup` establishes `@container/field-group`, and the responsive field orientation changes at `@md/field-group`. This is appropriate because the label/control relationship depends on its parent width. No source uses container-query units. Candidates that may benefit from a similar parent-aware decision are reusable card metadata rows, compact filter groups, PageHeader action clusters, and form field groups; full-page grids, public navigation, and mobile overlays remain viewport decisions.

Capability media queries are not layout breakpoint authorities and should remain distinct. The runtime imports reduced-motion support; `styles/accessibility.css` contains additional contrast, forced-colours, and coarse-pointer rules but is dormant because it has no runtime import.

## Viewport and fluid-scaling findings

The global fluid scale is bounded: `--space-*`, card spacing, root/body/headings, and `text-fluid-*` use `clamp()`. Bounds prevent unlimited large-screen growth, but the root font clamp and viewport-driven typography compete with user root-font preferences. The `--card-width-sm` and `--card-width-md` tokens use px bounds with `vw` preferred values for mobile carousels; that relationship is deliberate but component-specific, not a general card-width token.

`min(356px, calc(100vw - 2rem))` on the Sonner toaster and `min(92vw, …px)` on the desktop mega menu are controlled viewport-bounded overlays. They are appropriate viewport relationships. `max-h-[80–92vh]` on dialogs/drawers normally includes `overflow-y-auto`, which is a reasonable bounded-overlay pattern but may be affected by browser chrome because it uses legacy `vh`. The sidebar's active `min-h-svh`/`h-svh` utilities are a modern viewport-unit precedent, but no product-wide viewport-height policy or `dvh`/`svh`/`lvh` fallback strategy exists. `h-screen` in the Explore feed, `70vh` on the Explore property overlay, `30/35vh` on a location hero, `calc(100vh - 2rem)` on a fullscreen map, and marketing `max(90vh, 640px)` need visual testing on mobile. The expanded Explore overlay already has an `h-full overflow-y-auto` internal scroll path; its remaining risk is viewport-height, nested-scroll, and mobile-browser behaviour rather than absent overflow.

## Content-growth, text resize, and reflow assessment

Static evidence indicates that flexible page rails, `min-w-0` in `PageFrame`, dialog width insets, mobile stacking, and table horizontal wrappers provide useful reflow protection. The following remain material static risks:

- fixed-height buttons/inputs/tabs coupled with `whitespace-nowrap` may clip or make controls overly wide under text enlargement or localisation;
- `line-clamp-2` intentionally truncates listing titles; it preserves card rhythm but loses content rather than allowing growth;
- 10/11/12px local label utilities and root `px` bounds can undermine a later root-relative typography policy;
- fixed desktop tracks (`360px`, `320px`, etc.) are usually protected by `lg`/`xl` but require testing with longer labels and text-spacing overrides;
- overlay height caps use `vh`; even with inner scrolling, browser viewport changes can reduce visible content;
- tables deliberately preserve a two-dimensional model with horizontal scrolling, a legitimate exception if reachable and labelled.

No application browser session was run: the fresh isolated worktree has no `node_modules`, and the brief prohibits dependency installation without reporting it. Consequently, 200% text resizing, 320 CSS-pixel reflow, text-spacing overrides, actual scrollability, and screen-reader navigation are **unverified browser behaviour**, not failed conformance. The source-level findings are classified accordingly in the TSV.

## Surface profiles

One foundation must support different responsive profiles. Public marketplace/search/discovery and homepage marketing benefit from flexible rails, grids, and intentional carousel/media ratios. Explore uses immersive, viewport-related media and needs dedicated mobile-viewport testing. Listing creation and Prospect flows are form- and drawer-heavy, so content growth and bounded scrolling matter most. Agency, Developer, partner, and administration surfaces are dense data workflows where tables and fixed secondary tracks may be deliberate; they need a retained two-dimensional-layout exception and a mobile escape path rather than marketing-style simplification. Services and Advertise journeys mix marketing hero layout with conversion forms; do not flatten them to dashboard density.

## Deliberate exceptions and unsafe global changes

Appropriate existing or deliberate exceptions include CSS-pixel borders/icons, aspect ratios for media, horizontal table overflow, viewport-bounded overlay widths, capped/scrollable dialogs, and container-aware form orientation. They should be documented as relationships, not converted solely because they use pixels or viewport units.

Unsafe changes without an approved pilot and visual matrix are: changing root `font-size`; renaming/removing `--space-*`, `--content-*`, or card-width variables; changing Tailwind breakpoint meanings; replacing all arbitrary values; changing every fixed `h-*` to `min-h-*`; replacing all `vh` with `dvh`; changing dialog/drawer bounds globally; removing `whitespace-nowrap` from primitives; or turning all page grids into container queries. Each has broad downstream and behavioural impact.

## Recommended next step

Use the decision questions and bounded-pilot proposal in [the next decision record](06-recommended-next-decision-record.md). The policy comparison is in [the compatibility assessment](05-provisional-unit-policy-compatibility-assessment.md). A first implementation should be a separate approved workstream, beginning with a reusable form/overlay primitive and visual validation at browser zoom, 320 CSS px, and text-spacing overrides.
