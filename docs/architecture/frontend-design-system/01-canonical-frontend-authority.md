# Canonical frontend authority

## Purpose

Property Listify has one frontend authority chain: the PLDS contract, canonical CSS values, Tailwind mappings and approved utilities, shared React component contracts, page composition, and registered exceptions. The chain makes ownership explicit without requiring a product-wide redesign.

`client/src/index.css` remains the sole global runtime entry. It orchestrates the canonical layers in `client/src/styles/plds/`; it is not a second token source. New shared frontend work must follow this chain.

## Ownership and runtime layers

| Layer | Owner | Responsibility |
| --- | --- | --- |
| Primitive | `styles/plds/theme.css` | Existing runtime colour, surface, radius, chart, and dark-mode values. |
| Semantic | `styles/plds/semantic.css` | Existing fluid spacing and page-rail relationships. |
| Component | `styles/plds/components.css` | Existing card values and bounded contracts for the selected shared components. |
| Tailwind | `index.css` `@theme` mapping and existing config adapter | Exposes CSS-owned values as utilities; it does not independently decide PLDS values. |
| Shared React | `components/ui` and reusable components | Packages component geometry, states, accessibility, and responsive composition. |
| Pages | route and feature composition | Composes components; does not recreate a shared component contract. |

The existing `design-system/tailwind.extend.ts` remains a transitional adapter for legacy generated utilities. It must not receive new PLDS values while an equivalent CSS-owned value exists. Imported `design-system/components.css` remains a retained specialist/legacy utility stylesheet; its icon utilities are deliberate fixed-detail rules. It is not the canonical token location and is not expanded by this slice.

## Token record for this slice

Moved variables retain their existing computed values. The new `--plds-*` names below are component tokens, not a general scale.

| Token(s) | Layer | Existing source value | Owner / consumers | Reason and output |
| --- | --- | --- | --- | --- |
| `--brand-*`, surfaces, `--radius`, charts, sidebar values | Primitive | Active `index.css` variables | `theme.css`; Tailwind and all current consumers | Relocates the active authority; no computed-value change. |
| `--space-*`, `--content-*` | Semantic | Active `index.css` variables | `semantic.css`; container and content rail | Preserves shared page relationships; no computed-value change. |
| `--card-*`, `--card-width-*` | Component | Active `index.css` variables | `components.css`; existing card/carousel consumers | Relocates existing scoped card values; no computed-value change. |
| `--plds-nav-height`, `--plds-nav-action-height` | Component | `min-h-16`, `h-9` | `components.css`; `EnhancedNavbar` | Names repeatable navbar geometry; `4rem` / `2.25rem`, no output change. |
| `--plds-home-hero-title-max-width`, `--plds-home-hero-search-max-width`, `--plds-home-hero-search-radius` | Component | `24rem`, `max-w-4xl`, `1rem` | `components.css`; `EnhancedHero` | Names the live home hero/search contract; no output change. |
| `--plds-listing-card-max-width`, `--plds-listing-card-radius`, `--plds-listing-card-padding` | Component | `280px`, `rounded-xl`, `p-4` | `components.css`; `SimplePropertyListingCard` | Names an existing listing-card contract; no output change. |
| `--plds-field-group-gap`, `--plds-field-gap`, `--plds-field-content-gap` | Component | `gap-7`, `gap-3`, `gap-1.5` | `components.css`; `FieldGroup`, `Field`, `FieldContent` | Names the existing field rhythm; no output change. |

## Working rules

Use an approved token first, then a component token, then a registered exception, then a justified one-off arbitrary value. Frequency alone does not make a literal a token. Shared component geometry belongs in the component; pages choose variants and compose it.

Tailwind mobile-first breakpoints own new viewport-level layout decisions. Media queries own page and navigation composition. Named container queries own reusable component-internal adaptation. Capability queries remain separate. Existing 767/768/769 and 1024/1025 boundaries are legacy behaviour until their owning components are reviewed; this slice changes none of them.

The active `html { font-size: clamp(14px, 0.9vw, 16px) }` is a registered legacy root-size exception. Its owner is the frontend foundation, its affected surface is every rem-based interface, and its migration trigger is an approved typography foundation with a visual matrix. Do not change it incidentally.

## Exception register

| Exception | Owner | Reason / affected surface | Migration trigger |
| --- | --- | --- | --- |
| Root font-size clamp | Frontend foundation | Existing global rem relationship | Approved typography foundation and visual validation. |
| 767/768/769 and 1024/1025 boundaries | Owning navigation/page components | Historical viewport decisions | Component-specific responsive review. |
| Viewport-height immersive surfaces | Explore and overlay owners | Viewport is part of the experience | Dedicated mobile viewport validation. |
| Horizontally scrolling dense tables | Table primitive / dashboard owners | Preserves two-dimensional data meaning | A tested alternative that preserves access to all cells. |
| Pilot arbitrary values not replaced | Pilot owners | Local colour, type, and geometry remain component-specific | A stable shared meaning and an approved component contract. |

## Dormant authority and migration rules

`client/src/globals.css` and `client/src/styles/theme.css` were unimported. Their unique component and wizard values had no active consumers; they are retired rather than revived. Their overlapping spacing, type, and control values are not compatibility requirements.

Do not change root sizing, global body or heading behaviour, breakpoint meanings, JavaScript media thresholds, or visible hierarchy as part of token adoption. A token substitution must preserve the computed value. Any planned visible change requires a bounded component scope, visual evidence, and an explicit reason before commit.
