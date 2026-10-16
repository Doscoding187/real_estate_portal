# City-guide province pills and image fallbacks

## Result

The founder requested the homepage's existing province-pill theme instead of Browse by province. The city-guide section now has nine visible, horizontally scrollable province buttons styled like the developer section. The selected button has a pressed state and the description names its province. Selecting a province filters the guide collection in place, preserving the homepage and compact image-left/text-right city layout.

Gauteng is the initial selection. This section owns its selection, so choosing a city-guide province does not change the property or developer section elsewhere on the page. Three rows of twelve cities appear on desktop when available. Smaller collections use only the needed rows, including on mobile.

## Data and imagery

The existing `locationPages.getCityGuides` array reader now accepts an optional, validated canonical province slug. SQL applies the province equality before ordering and limiting; it still requires verified parent and city identities and existing nonempty stored city slugs. Omitted province retains its existing national behaviour. There is no property-count or popularity claim, display-text geography fallback, schema change or data mutation.

The homepage requests up to 24 guides in the selected province, showing twelve initially and revealing the remainder with Show more. This remains a bounded homepage selection, not an exhaustive province directory. Each province has its own query/cache identity; loading, retry and genuinely empty data remain distinct. The pills remain available in every state, and client-side scope checking prevents another province's stale records from appearing.

Each supported province has a representative cover selected from the existing generated image library. A city with its own cover uses that image. An uncovered city uses its province's illustration, with provincial accessible text and an explicit section disclosure. A failed city thumbnail tries the province image, then the existing neutral urban illustration. Duplicate image requests are avoided; a final building icon is available if both images fail. The same helper supplies clearly labelled province fallback banners to existing city-guide pages. Campaign-image precedence remains unchanged.

The removed province-browser dialog is no longer referenced and has been deleted. Guide links continue to open neutral city-guide URLs. Province/city page redesign and route consolidation are separate follow-up work.

## Verification

- 15 tests passed across the existing ExploreCities, homepage journey and city discovery suites. Coverage includes province filtering before the query limit, visible pill selection, unchanged guide URLs, unloaded/failed data, missing city covers and failed city/province images.
- Typecheck, production build, affected frontend/service lint and router error-only lint passed. The build retains its existing large-chunk warning; existing router formatting/type warnings were not reformatted wholesale. Diff whitespace checks passed.
- Real public API reads passed for all nine provinces, with every record belonging to the selected canonical province. Invalid, mixed and display-name province strings were rejected with HTTP 400.
- Browser checks at 1440, 390 and 320px passed for all nine selections, native scrolling, keyboard activation, compact three-row presentation, Show more, retained empty/error/loading states and recovery. There was no page-width overflow or page exception. Scoped axe WCAG A/AA checks reported zero violations.
- The real North West record, Rustenburg, uses a loaded North West illustration because it has no city-specific cover. Desktop/mobile screenshots were reviewed.

The local catalogue returns 24 records at the Gauteng homepage limit and one guide for each other province. These are real existing local records, not added demo cities or proof of complete national coverage. Classification of existing geography records is unchanged.

## Review and workflow

Preview: http://localhost:3010

Screenshots and evidence: `/home/edwardspc/Desktop/Dev/review-artifacts/city-guide-pills-20261014/index.html`

Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-homepage-ux-review-20261013`; branch: `feat/homepage-ux-review-20261013`.

Database classification: consumer read refinement with local-data verification. Database Authority skill, entry, operating playbook, policy and exceptions were followed. Canonical sources: `drizzle/schema/locations.ts`, canonical baseline and the active `0004_canonical_listing_location.sql` lifecycle additions. The reused disposable local demo remains exact-worktree-owned, manifest-head-ready, schema-congruent and ready at `0115_non_geographic_place_search_eligibility.sql`. Target fingerprint: `536d822ba96d14486486fb53065a78e2935b9d65c7a23484c3b06f05b7dda890`. Its read-only feature API was restarted to load the new input contract; the shared demo and seeded data were preserved. No schema, fixture, seed, migration or reference-data operation was performed. No protected access, push, merge or deployment.

Changed files: ExploreCities and its tests; removed ProvinceGuideBrowser; cityGuideImages; Home and its desktop/mobile views; locationPagesRouter; cityGuideDiscoveryService and its tests; this report.
