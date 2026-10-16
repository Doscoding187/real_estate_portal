# Province guide history and visual recovery

## What happened to the map-based design

The founder's remembered artwork was found intact. Its saved source is the August 2026 geography visual foundation:

| Saved work | Evidence | Relationship to the current public page |
| --- | --- | --- |
| Initial province-outline hero | `225f6fd01`, 6 August 2026, `ProvincialFallbackHero.tsx` | A separate checkpoint, absent from this branch's ancestry |
| Geography visual foundation | `97d1cb2d3` and `60a7383cc`, 6 August 2026 | Introduced GeographyHero, GeographyComposer and a private `/__preview/geography/:previewKey` route; did not replace the public ProvincePage |
| Gauteng desktop/mobile artwork | `60a7383cc`, `client/public/province_hero_assets/gauteng-hero-desktop.png` and `gauteng-hero-mobile.png` | Exact saved artwork recovered; the desktop SHA-256 matches the founder's Downloads file |
| Other eight province covers and the earlier frontend audit | `0e274577e`, 31 August 2026, archive of `listify-provincial-fallback-hero-refinement` | Preserved files that are absent from the current public page's working tree |
| Current provincial discovery | `ec3c1df90`, `132588492`, `38c6ca1d1` and later commits | Public province data, search contracts and sponsored presentation developed independently |

The immediate cause of this discrepancy is separate preview and public implementations, followed by unintegrated refinement work. The map assets were preserved; their intended visual foundation was not connected to the current public province route. These findings establish repository history, not the reasoning behind earlier decisions or whether the founder approved every historical commit.

A separate December 2025 commit, `16f9e9bce`, explicitly removed an interactive map section from the older ProvincePage. That older Google Maps section is distinct from the August 2026 map-outline hero artwork.

## Current route and component ownership

| Journey | Public entry | Current layout and data |
| --- | --- | --- |
| Homepage | `/` → Home | HomeLayout, enhanced navigation, desktop/mobile views; independent homepage section queries |
| Province guide | `/:province` → ProvincePage | ListingNavbar, provincial CSS, ProvincialComposer, getProvincialDiscoveryData and verified city-guide discovery |
| City guide | `/:province/:city` → CityPage | LocationPageLayout and LocationHeroSection; getCityData |
| Suburb guide | `/:province/:city/:suburb` → SuburbPage | LocationPageLayout and LocationHeroSection; suburb data reader |
| Property results | Explicit Buy/Rent roots → SearchResults | Transactional filters and search contracts |

The public route registry has one province, city and suburb handler, rather than two active province pages. Visual fragmentation remains between the provincial page-local system and the city/suburb layout system. The recovered private preview also used its own shell/composer and development data. Its older query behaviour and fictional identities have not been imported into public journeys.

## This recovery

- The real province route now uses a dedicated ProvinceGuideHero with the recovered map-outline covers for all nine provinces. Gauteng uses its saved mobile artwork at narrow widths. The existing artwork is compressed to ten WebP files totalling 1,038,058 bytes; no new image was generated. Local assets also supply the guide metadata image.
- Map outlines and beacons remain decorative illustrations. They do not define search boundaries, imply exact coordinates or add map search behaviour. Full-image containment retains the illustrated province shapes, and the page remains readable if an asset fails.
- The generic secondary hero panel and decorative counters were removed. Visible headings and guidance now use visitor-facing wording instead of canonical/routing/authority terminology. The current composer, URL-owned filters, supported journeys, inventory states, FAQs and sponsored billboard remain in place.
- Existing guide availability is resolved independently of advertised inventory. The inventory projection had disabled a city guide even when that verified identity existed. The existing bounded `getCityGuides` reader now resolves exact same-province city records for configured market-guide links and composer shortcuts. Inventory counts and unavailable states are retained; a failed guide check has its own retry notice.
- Province agent recommendations now receive the numeric province record ID. Previously the page called `Number()` on a value such as `province:3`, producing `NaN`. A real request check confirms that the sent numeric ID matches the loaded province record; it does not assume fixed demo IDs.
- Property preview badges describe the transaction as For sale or For rent, including development-derived property, matching the founder's existing card rule. The listing detail links and source data are unchanged.

## Verification

40 focused tests cover the composer, sponsored billboard, provincial query/handoff helpers and the new guide-availability/numeric-ID/error boundary. The existing 21-case provincial browser suite checks neutral discovery, Buy/Rent filters, deliberate sibling locations, history/refresh, keyboard use, sparse and unavailable data, desktop/tablet/mobile layouts and sponsorship separation. Two existing wording assertions were updated for the simplified helper text.

Real local pages were checked for all nine provinces at 1440, 390 and 320px: covers loaded, the route stayed neutral, one page heading was present and no page-width overflow occurred. Scoped hero axe WCAG A/AA checks reported zero violations. A failed-artwork check retained the readable guide and composer. The original and recovered desktop/mobile screenshots are in the review gallery. The scope of these checks does not imply a full-page accessibility audit or complete province content coverage.

Typecheck, affected-file lint, production build and whitespace checks passed. A guide-map inference error found by typecheck was corrected with an explicit city read-model type. Existing build chunk warnings remain. The restored design is a reviewable province foundation, not a claim that the entire geography system has been redesigned.

The extended redirected browser sessions wrote complete success reports, then their retained command sessions returned signal 143; those shutdown results are retained as a harness limitation. The final short desktop/mobile smoke exited normally and confirmed the real Pretoria guide and composer shortcut are enabled, with no page overflow. The numeric province recommendation request also completed normally. Existing tracked test artifacts affected by Playwright's output cleanup were restored from the unchanged baseline; subsequent output was redirected to the task-owned temporary folder.

## Next review boundaries

1. Review the province body against the recovered foundation: local context, city-guide discovery, real inventory and professional discovery. Resolve curated market coverage and price-context presentation deliberately.
2. Review city guides next, then suburb guides, including consistent guide navigation, exact canonical identities and preserved search intent/filters. These pages retain their current composition in this commit.
3. Broaden verified city-guide content and image coverage separately. The homepage's twelve-city target should use existing verified guides; missing property stock does not itself prevent a guide from appearing. No placeholder cities or stock have been added to balance a grid.

## Evidence and workflow

Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-homepage-ux-review-20261013`; branch: `feat/homepage-ux-review-20261013`.

Preview: http://localhost:3010/gauteng

Gallery and checks: `/home/edwardspc/Desktop/Dev/review-artifacts/province-guide-recovery-20261014/index.html`.

Asset provenance: `province-guide-recovered-assets-2026-10-14.json`, recording source Git objects and hashes. Original PNGs remain in their saved commits and Downloads; only optimized assets are referenced by the current page.

Classification: frontend guide-consumer correction with local-data verification. The existing owned disposable demo remained exact-worktree-owned, manifest-head-ready, schema-congruent and ready at `0115_non_geographic_place_search_eligibility.sql`. Target fingerprint: `536d822ba96d14486486fb53065a78e2935b9d65c7a23484c3b06f05b7dda890`. Database Authority entry and operating playbook were followed; canonical location models/readers were inspected. No schema, migration, seed, fixture, SQL mutation, protected access, deployment, push or merge occurred. Fictional records remain confined to the existing automated browser tests. The shared demo and its seeded data were preserved.

Changed files: ProvincePage; ProvincialComposer's presentation copy; provincial-discovery.css; new ProvinceGuideHero and provinceGuideImages; a focused ProvincePage boundary test; two existing browser wording assertions; ten recovered WebP assets; this history report and asset record.
