# PLDS-R1 recommended next decision record

Status: proposed for founder and senior frontend authority review. This is a decision agenda, not an implementation plan.

## Questions answered by evidence

- `client/src/index.css` is the active product-wide runtime CSS/token entry. Tailwind v4 is active, and its config is explicitly loaded there.
- The repository has no 62.5% root convention, no active modern viewport units, no active container-query units, and no custom Tailwind screen declaration.
- Root size is currently viewport-clamped (`14px` to `16px`), so existing rem use does not by itself demonstrate user-root-relative scaling.
- `globals.css` and `styles/theme.css` are dormant overlapping variable authorities; `theme.css` is explicitly guarded against runtime import.
- Viewport media queries are appropriate for page/nav layout. A named field-group container query is already an appropriate reusable-component pattern.
- Bounded dialog widths, table horizontal scrolling, aspect-ratio media, thin px details, and viewport-bounded overlay widths are all legitimate existing relationships.

## Decisions requiring explicit approval

1. **Root-size authority.** Should the future policy preserve browser root defaults, and if so what migration path replaces the active px/vw root clamp? This is the highest-impact decision.
2. **Fluid type/spacing scope.** Are `--space-*`, global headings, `text-fluid-*`, and Tailwind's duplicated fluid `fontSize` definitions one intentional system, or should a future policy retain only a bounded subset? Approval must precede consolidation.
3. **Breakpoint ownership.** Should PLDS define a documented viewport breakpoint scale and a migration rule for 767/768/769/1024/1025 boundary duplicates? Do not silently change existing feature thresholds.
4. **Viewport-height policy.** Which use cases may retain `vh`, and which need an approved `dvh`/`svh` fallback strategy after mobile-browser validation? Maps, immersive Explore media, drawers, dialogs, and heroes are distinct cases.
5. **Text truncation policy.** When card rhythm conflicts with property/development name disclosure, should product titles wrap, clamp with a disclosed full name, or use a different compact-card contract?
6. **Dense-data exception.** Confirm that tables and desktop operating grids may retain horizontal scrolling/fixed tracks when they provide an accessible narrow-screen route or scroll container.

## Proposed Property Listify adaptations

- Define policy by relationship, not by unit spelling: visual device details may use px; shared type/spacing need a root-relative decision; media should use aspect ratio; pages use flexible rails; reusable internal layout may use container queries; page/nav transitions use viewport media queries.
- Keep semantic and component tokens distinct. `--content-*` is a strong semantic/page-composition candidate. Card carousel widths, overlay caps, ad heights, and nav-menu widths are component contracts unless evidence proves shared meaning.
- Require an explicit rationale for new `clamp()` values: semantic owner, min/preferred/max relation, target surfaces, and browser validation matrix.
- Require a documented modern-viewport exception for every mobile viewport-height migration; do not mechanically replace `vh`.
- Make arbitrary-value review selective: promote only repeated values with stable meaning, not every repeated literal.

## Exceptions requiring approval or registration

- Retaining the root px/vw clamp after a root-relative policy is approved.
- Retaining fixed-height text-bearing hero/overlay regions where browser tests find clipping or inaccessible scrolling.
- Reusing a nonstandard viewport boundary after PLDS declares an authority.
- Retaining `line-clamp-*` for primary property/development names without a content-disclosure contract.
- Any global dialog/drawer height strategy that causes a regression in mobile safe areas, keyboard interaction, or nested scrolling.

## Candidate pilot components

1. **`components/ui/field.tsx`** — already has a named container query; a low-risk place to document parent-width criteria and test root/text scaling without changing page layout.
2. **`components/ui/page-frame.tsx` and `PageHeader`** — small, bounded consumers of existing rail and space variables; validate page-gutter/long-action behaviour, not a new spacing scale.
3. **`components/ui/dialog.tsx` plus one content-owning dialog** — test inset width, long text, 200% resize, 320 CSS px, and mobile viewport height before adopting any overlay rule.
4. **`SimplePropertyListingCard`** — decide title disclosure and small metadata behaviour with known marketplace content pressure; do not globally migrate all cards.
5. **One Agency dense grid/table** — establish a deliberate exception and narrow-view evidence for data-management surfaces.

## Unsafe migration approaches

- A repository-wide px-to-rem or rem-to-px conversion.
- Changing `html` font size, Tailwind screen meanings, or global media queries in one change.
- Replacing all fixed heights with `min-height`, all `vh` with `dvh`, or all responsive media queries with container queries.
- Bulk promotion of arbitrary values to global tokens based on count alone.
- Removing nowrap/line clamps before a component-level content contract and visual tests exist.
- Applying marketplace/marketing density rules to Agency, Developer, Prospect, and administration workspaces.

## Recommended implementation boundary

Create a separate implementation decision record first, then limit the first code change to one primitive plus explicitly named pilot consumers. It must include a browser matrix covering normal and 200% zoom/text resize, 320 CSS-pixel width, text-spacing overrides, desktop/wide viewport, a mobile browser viewport/chrome case for overlays, keyboard/focus, and content samples with long English and localised strings. Do not modify root size, global breakpoints, Tailwind configuration, or inactive global styles in that pilot.
