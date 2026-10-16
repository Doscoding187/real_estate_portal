# City-guide discovery and imagery

Date: 14 October 2026

Branch: `feat/homepage-ux-review-20261013`

Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-homepage-ux-review-20261013`

Preview: http://localhost:3010

Before/after gallery: `/home/edwardspc/Desktop/Dev/review-artifacts/city-guide-improvement-20261014/index.html`

## Approved direction

The founder clarified that Explore property by city is an entry to existing city/local guides, internally called SEO pages. These cards continue to open neutral guide URLs such as `/gauteng/johannesburg`, rather than a property-results feed. The guide's existing content, supported journeys and market sections are retained. Its downstream search, metrics and publication behaviour are outside this presentation slice.

## Changes

- A four-card opening row uses city cover images, city/province names and an explicit Explore guide action. Show more reveals up to the 12 guide records loaded for the homepage, without switching to search results. Desktop uses the existing content rail; mobile keeps a horizontally scrolling card row.
- Browse by province replaces the homepage self-link. Its accessible dialog offers nine links to existing province guides, with clear keyboard focus and focus restoration on dismissal. It remains useful when the city collection is empty or temporarily unavailable.
- City guides are discovered independently of listing stock through the new bounded public `locationPages.getCityGuides` read. It uses existing verified city and province identities, stored nonempty slugs and supported province routes. Editorial display priority is explicit; it is not visitor-popularity or paid ranking. No list/count of properties is queried or invented for these guide cards. The existing getPopularCities reader and all of its consumers are preserved.
- Loading, failed/retry and successfully empty guide requests are distinct. `ExploreCities` no longer substitutes a hard-coded national city list for an explicitly empty suburb/guide collection or failed homepage request. Its existing configurable links remain available to the city-page suburb component.
- Province text contrast, card focus styling and wider-discovery touch targets are improved. Each card is one link; the previous button-inside-link is removed.
- The same city-specific image is used on its card and existing guide banner/metadata. Sponsored campaign imagery keeps its existing precedence and is not labelled as an AI image. Guides outside the cover set use the existing neutral urban illustration, rather than an unrelated city photograph.

## Image assets

22 realistic-looking city illustrations were generated with the built-in `image_gen.imagegen` tool. They cover Johannesburg, Cape Town, Durban, Pretoria, Gqeberha, Bloemfontein, Polokwane, Mbombela, Kimberley, Mahikeng, Sandton, Midrand, Centurion, Randburg, Roodepoort, Benoni, Boksburg, Alberton, Kempton Park, Soweto, Umhlanga and Stellenbosch. These are representative illustrated scenes, not photographs documenting exact city geometry or actual property stock. They carry a small AI city illustration label and descriptive alt text on the cards.

Final workspace assets: `client/public/images/city-guides-v1/`. Each city has `-480.webp`, `-960.webp` and `-hero.webp` files. Responsive card images load lazily with explicit dimensions/aspect ratio and asynchronous decoding. All 66 files total 10,750,194 bytes; the entire set is not downloaded by the initial four-card homepage row. Original generated PNGs remain in the generator's output directory; the application references only workspace assets.

Prompt specifications, city cues and asset hashes are recorded in `city-guide-image-prompts-2026-10-14.json`. The visual cues for Table Mountain, Durban's Golden Mile and Pretoria's Union Buildings were checked against [Cape Town Tourism](https://www.capetown.travel/top-attractions/tablemountain/), [Durban Tourism](https://visitdurban.travel/page/central-beaches) and [The Presidency](https://www.thepresidency.gov.za/union-buildings). No source photographs were copied into the project. Other scenes are representative interpretations rather than asserted landmark reconstructions.

## Database and workflow boundaries

This is a database-consumer read addition plus a local-data browser verification, with no schema or data write. Database Authority skill, entry, operating playbook, policy and exceptions were reviewed. Canonical sources are `drizzle/schema/locations.ts`, the baseline and active `0004_canonical_listing_location.sql` lifecycle additions. No schema guessing, alternate model fallback or invented display-text geography was added.

The existing owned disposable local demo's authority status was ready, exact-worktree-owned, manifest-head-ready and schema-congruent. No migration, reference preparation, scenario preparation, fixture edit, seed or manual SQL mutation was performed. The shared demo server and its existing data are preserved. A separate read-only feature API serves the new read in the review preview; the proxy separates mixed request batches so existing consumers keep their original demo service. A real mixed-batch comparison confirms that the unchanged popular-city response is retained.

No push, merge, deployment or production change. Changes are saved locally on the feature branch for review.

## Validation

- 144 unique tests passed: 23 focused city-guide/hierarchy/hero/homepage tests plus 121 homepage area-first, search-intent, public-inventory and commercial-access regressions. The 13 affected client tests passed again after final banner positioning.
- Typecheck, production build, changed/new component and service lint, ts-nocheck baseline and diff whitespace checks passed. Existing city/hero/router files still have broad pre-existing formatting/type warnings; no new lint errors. The build retains its existing large-chunk warning.
- Desktop 1440×1000, mobile 390×844 and narrow mobile 320×844 checks passed for four opening guides, Show more, province choices, dialog dismissal/focus, neutral city-guide navigation, loading/error/empty states and retry recovery. No page exceptions or page-width overflow. Scoped card/dialog axe WCAG A/AA checks found zero violations.
- All 66 image files decode at their expected dimensions and are served as WebP. The complete cover set was reviewed together, and actual guide/card screenshots are in the gallery.
- Actual Johannesburg, Cape Town, Pretoria and Durban guide navigation retains neutral exploration. Cape Town, Pretoria and Durban checks also confirm matching city covers and metadata images; the province browser opens the existing Gauteng guide.
- Real public read checks passed for bounded limits, canonical identities, no listing-count claim and invalid-limit rejection. A guide with zero property stock is still represented by its existing verified identity.

## Limits

The first cover set contains 22 cities and is not an exhaustive image library for every South African locality. An image does not establish guide availability: the new reader returns only existing verified guide identities, so illustrations for places absent from the current local guide catalogue are not used to fabricate city links. The homepage loads 12 guides and provides province-guide navigation for wider discovery.

The earlier review's city-guide Buy filter/area-clarification and price-unit findings are preserved as separate follow-up work. This change does not alter that search flow or claim those guide metrics have been repaired. The demo data and browser checks do not establish national production coverage or measured conversion gains.

## Changed files

`ExploreCities.tsx` and its tests; new `ProvinceGuideBrowser.tsx`; `Home.tsx`, desktop/mobile views and the homepage journey mock; `CityPage.tsx` and the optional image-label/position props on `LocationHeroSection.tsx`; new `cityGuideImages.ts`, `shared/cityGuideFeatures.ts`, `cityGuideDiscoveryService.ts` and its tests; the bounded read in `locationPagesRouter.ts`; 66 WebP assets and this report/prompt record.
