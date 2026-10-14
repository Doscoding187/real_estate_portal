# Explore property by city: UX and journey review

Date: 14 October 2026

Reviewed application commit: `7ee392bb2`, branch `feat/homepage-ux-review-20261013`.

Local preview: http://localhost:3010

Evidence: `/home/edwardspc/Desktop/Dev/review-artifacts/explore-city-review-20261014/index.html`.

## Verdict

Keep this as an exploration entry: a city card opens its area guide, where visitors can learn about places and then choose an exact property-search scope. It should support someone deciding where to live, rather than immediately submitting a broad Buy search. The current card destination already follows that distinction, but the discovery action, request states and subsequent guide search need attention.

This is a read-only review. No application, backend, navigation, database, seed or fixture change is included. The existing homepage/developer and running demo work are preserved.

## Findings

| Priority | Observed behaviour | Recommended correction |
| --- | --- | --- |
| 1 | Homepage View All Locations has `href="/"`. It stays on the homepage rather than opening a larger set of places. It is also a button nested inside a link. | Make Browse locations open a real, neutral location chooser or an existing province-guide choice. Use one interactive element for the action. Do not redirect to an unfiltered sale feed. |
| 1 | `Home` reads only the popular-city query's data. `ExploreCities` replaces an absent or explicitly empty array with a hard-coded list. Both a successful empty response and an intercepted request failure rendered 12 default city links, without a loading or error state. | Distinguish pending, failed/retry and successfully empty data. An explicitly supplied empty list must remain empty. Any deliberately curated guide selection needs its own governed source and label; it must not conceal a failed inventory query. |
| 1 | From the Johannesburg guide, Buy → Residential → House → maximum R2m → Search opened `/property-for-sale?locationId=city%3A1&city=johannesburg&province=gauteng`. There was no area clarification, property-type parameter or budget parameter. | Reuse the existing area-first decision for any broad city/town/province transaction scope. Preserve Buy/Rent, supported property type and price filters when selecting an area or deliberately browsing the whole scope. This is a gap outside the first homepage-only implementation, not a failure of that homepage picker. |
| 2 | Province text has measured contrast 2.63:1 against white, below the 4.5:1 requirement for its small text. View All Locations measured about 31.5px high. City-card links themselves are comfortably sized and fit the viewports. | Retain the icons and card proportions; strengthen secondary-text contrast, provide clear focus states and make the discovery action comfortably tappable. |
| 2 | The city source contains only cities with eligible public property records, ranked by eligible listing count and then name. The local demo returns Johannesburg with 15 such records. This is inventory availability, not visitor popularity, exhaustive guide coverage, development-unit inventory or the whole local housing market. | Label counts as the supported published-listing coverage. Do not imply demand, comprehensive city coverage or sale-only inventory. A city can still be useful to explore when stock is zero, but exposing additional guide destinations requires an actual governed discovery source. |
| 2 | A city guide can reuse `ExploreCities` for its suburbs. Because the shared component treats `customLocations=[]` as unspecified, an empty suburb collection can fall back to unrelated national cities under a suburb heading. This is a source finding, not a newly seeded browser scenario. | Make omitted default data and an explicitly supplied empty collection distinct. Keep the current city/suburb scope when empty, and offer clearly labelled alternatives. |

The homepage does not currently show city photography: its cards use building and location icons, even though the component's default data has image fields. Keep the familiar icon treatment for this pass. Do not add generic photographs merely to fill space or imply that an image depicts a particular city.

## Recommended presentation and journey

1. Retain Explore property by city and the existing city-card visual language. Make the next step explicit, for example a City guide or Explore areas affordance.
2. Use the familiar province pills if adding a geographic browser, with a clearly labelled All provinces option for national discovery. Province selection must be visible and deliberate; it must not inherit a hidden search location or silently change a visitor's transactional area.
3. City cards open neutral guides. Their first useful choices should be governed market areas where supported, then suburb exploration and local context. Missing market-area coverage is a data limitation; do not invent northern/eastern clusters from names or municipal boundaries.
4. A visitor choosing Buy/Rent with a broad place then chooses an area, or explicitly Browse all [place]. A specific eligible suburb/market area opens directly. Preserve the chosen filters through either route, and explain the final scope.
5. Browse locations provides a genuine wider discovery action. Loading, retry and empty states remain distinct, with no unsupported city count or implicit fallback location.

These rules apply by scope across South Africa, including factual towns with city runtime handles. They do not introduce a Johannesburg/Cape Town exception, a municipality-wide identity, silent nearby expansion or a new geography authority.

## Related guide finding

The guide's Top Localities component appends `/m²` to `avgSalePrice`. The current location-page service calculates that value as a mean of complete property prices, without an area denominator. This is a source-backed unit-label mismatch. Correct it before treating the guide's pricing panel as reliable local insight; do not turn a small sample mean into a fair-price claim. This review does not alter those metrics or their service.

## Validation and limits

- Desktop 1440×1000, mobile 390×844 and narrow mobile 320×844 browser review: the real Johannesburg card opens `/gauteng/johannesburg`; settled homepage data showed the same 15-record count. No page exceptions or page-width overflow were observed in these section checks.
- Axe WCAG A/AA checks identified the province-label contrast failure at all three widths. This is a scoped finding, not a whole-site accessibility review.
- Browser-only response interception reproduced empty and failed city requests. Both displayed the fallback cities. No database mutation or new fictional fixture was used.
- The actual city-guide Buy filter selection and resulting URL were captured in `buy-handoff.json` and `guide-buy-filters.png`.
- Seven existing tests passed across ExploreCities, the location hero's Rent controls and homepage journey selection. They verify their existing contracts; they do not protect the broken View All action, truthful fallback states or guide Buy filter preservation.
- Owned local demo database authority status was ready, exact-owned, manifest-head-ready and schema-congruent. Only existing local public reads were used. The 15-record count and single popular city describe this demo, not national production coverage.
- Some external guide imagery did not load in the local browser review. The large gray banner screenshot must not be interpreted as proof that live city images are always missing.
- Implementation should remain isolated on the existing feature branch and task worktree. No push, merge, deployment or protected release is part of this review.

## Source pointers

- `client/src/components/ExploreCities.tsx`: default/empty selection around line 185, View All path around line 199, city-card presentation around line 240.
- `client/src/pages/Home.tsx`: popular-city query around line 60 and display mapping around line 92.
- `client/src/pages/CityPage.tsx`: neutral city-guide mode, canonical city identity and suburb collection passed to ExploreCities.
- `client/src/components/location/LocationHeroSection.tsx`: neutral Buy branch around line 176 and Search handoff around line 206.
- `server/services/locationPagesService.ts`: eligible-property loading and city ranking around line 120; complete-property averages and top-locality values around line 380.
- `client/src/components/location/LocationTopLocalities.tsx`: sale-price unit label.
- `docs/reviews/home-metro-scope-audit-2026-10-14.md`: agreed country-wide scope clarification and known geography coverage limits.
