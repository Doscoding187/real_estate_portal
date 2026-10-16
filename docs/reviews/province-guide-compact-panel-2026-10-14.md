# Compact province-guide search panel

The founder approved the recovered map hero but identified oversized journey cards, filter blocks and action sizing, plus a clipped hover border and misleading Land availability text. This local iteration addresses the panel presentation.

## Changes

- The extra province-guide eyebrow and Province illustration badge are removed. Explore Gauteng and the corresponding province headings remain, with the recovered artwork and short introduction.
- Journey choices use single-line icon pills. The repeated Homes for sale/New developments subtitles and Coming later labels are removed. Icons, supported choices, selected state and disabled behaviour are preserved.
- The scrollable pill rail has enough inset for keyboard outlines and hover borders. Hover no longer translates the button upward. Active pills retain readable colours when hovered.
- Location, property type, budget and the search action use compact 44px controls. Labels sit above controls; repeated Optional refinement lines and outer filter-card borders are removed. The action no longer stretches to match location helper text.
- Property type and budget sit together on mobile, below the full-width location input. The action uses the next full-width row. Location suggestions remain free to expand, and multi-area chips retain their existing behaviour.

## Land finding

Land implementation files and the earlier MVP integration exist. However, `shared/landLaunchPolicy.ts` explicitly sets `enabled: false` and `deferred_first_cohort`, while App routes public Land search/detail and authoring/review through LandDeferred. The provincial configuration also keeps Land unavailable. This is a current release disposition, rather than evidence that the engine was never implemented.

This presentation change does not enable Land, change commercial policy or alter its public geography contract. Its unavailable reason now reads Land search is not enabled in this release. Activating Land should reconcile the launch disposition, real public routes and specialist search handoff together; changing only this button would create a false working journey.

## Validation and scope

37 existing focused tests passed. Six affected existing browser scenarios passed for neutral discovery, keyboard controls, mobile/tablet composition and sponsored separation. Typecheck, affected-file lint, production build and whitespace checks passed; the existing build chunk warning remains.

Real local browser checks at 1440, 1024, 390 and 320px confirmed seven equal-height pills, aligned controls, contained hover/focus styling, visible active state, retained budget filters, unchanged Land availability and no page-width overflow or page exceptions. Scoped panel axe WCAG A/AA found zero violations. The measured neutral panel height is approximately 282px desktop and 423px mobile. This does not constitute a full-page accessibility audit.

No backend, schema, migration, fixture, seed, permission, payment, moderation, publication or launch-policy state change. Local-data verification reused the owned disposable demo, with Database Authority status ready, manifest-head-ready and schema-congruent. Fingerprint: `536d822ba96d14486486fb53065a78e2935b9d65c7a23484c3b06f05b7dda890`. The shared demo and data are preserved. No protected access, push, merge or deployment.

Preview: http://localhost:3010/gauteng

Screenshots/evidence: `/home/edwardspc/Desktop/Dev/review-artifacts/province-guide-panel-20261014/index.html`.

Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-homepage-ux-review-20261013`; branch: `feat/homepage-ux-review-20261013`.

Changed files: ProvinceGuideHero, ProvincialComposer, provincial-discovery.css, two Land explanation strings in shared/provincialDiscovery, and this report.
