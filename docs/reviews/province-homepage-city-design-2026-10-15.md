# Province city guides: homepage design and capped search

Edward rejected the city table and asked to adapt the homepage's existing city design. He then requested a maximum of twelve cities, with city search replacing expansion. This supersedes the city-section presentation in the preceding area-table review; its journey activation remains intact.

The homepage and province page now share `CityGuideEntry`: a small city image, name, province/location icon, Explore guide action, image fallback and common hover/focus styling. The province section uses a white background, four desktop columns and up to three mobile rows with horizontal swipe. No oversized panels or inventory table. City guides remain available independently of property stock.

The province section always shows at most twelve entries. Show more is removed. Search cities looks across verified guides in the chosen province, including places outside the initial twelve. Search results are also capped at twelve. Search is debounced; loading, errors/retry, minimum query length and successful empty results are distinct. Clearing search restores the default selection and input focus. Actions retain neutral city-guide URLs.

The existing `getCityGuides` public read accepts an optional validated city-name query. Its canonical query filters verified cities and verified parent provinces, applies the province filter before limiting, and uses a parameterized literal-text search with escaped LIKE wildcards. No schema, migration, seed, persisted fixture, publication, payment or permission changes. No alternate database authority or schema guessing. The homepage's existing request contract and default discovery behaviour remain compatible.

## Popularity limitation

The initial selection remains the existing editorial/curated order, supplemented by current major-market guides. It is not labelled Trending or Most searched. `cityGuideDiscoveryService` supplies editorial ordering; the existing analytics endpoint ranks suburbs through a separate location-ID namespace and is not a verified city-search ranking feed. A real most-searched/trending-city ranking still needs a canonical city search-activity source and its own acceptance evidence. No popularity figures, ranking events or cities were invented.

## Validation

25 focused tests passed across homepage guide presentation, province guide availability, city search/capping/loading/error states and the canonical query's province, verification and literal-wildcard boundaries. The existing 21 provincial Chromium scenarios passed, covering Buy/Rent continuity, canonical sibling OR, history, keyboard use, mobile/tablet composition, sponsored separation and missing-reference containment. TypeScript, focused lint, production build and whitespace checks passed; the existing large build-chunk warning remains.

Real local Chromium checks at 1440, 1024, 390 and 320px confirmed twelve default guides, no expansion, real Springs search beyond the default list, correct guide links, a twelve-result cap, exclusion of Cape Town from Gauteng, clear/reset/focus, mobile swipe, no page overflow and no page exceptions. Scoped city-section axe WCAG A/AA found zero violations; this is not a full-page audit. A separate Western Cape search opened its Cape Town guide.

Database Authority verification used the existing disposable demo, ready at the manifest head and schema-congruent; exact target fingerprint `536d822ba96d14486486fb53065a78e2935b9d65c7a23484c3b06f05b7dda890`. Its data was preserved. The task-owned read-only API/proxy were restarted for the updated reader; the shared demo was not altered.

Preview: http://localhost:3010/gauteng

Screenshots and sanitized evidence: `/home/edwardspc/Desktop/Dev/review-artifacts/province-homepage-city-design-20261015/index.html`.

Changed files: shared CityGuideEntry; ExploreCities; ProvinceCityGuides and its tests; ProvincePage and its guide-availability test; provincial CSS; getCityGuides input schema; cityGuideDiscoveryService and its tests; this review. The rejected ProvinceAreaTable and its tests are removed.

Worktree `/home/edwardspc/Desktop/Dev/worktrees/property-listify-homepage-ux-review-20261013`; branch `feat/homepage-ux-review-20261013`; successor to `101b202dd`. Local commit only: no push, merge, deployment or protected database operation.

## Search placement follow-up

At Edward's request, Search cities now sits below the suggested city entries. The Search this province shortcut is removed from this section, along with the two-sentence illustration/fallback caption. Existing image fallbacks and search behaviour are retained.

Ten existing focused tests passed. Desktop 1440px and mobile 390px browser checks confirmed search below the entries, removal of the shortcut, twelve default cities, working search/clear/focus and no page overflow. Formatting, focused lint and whitespace checks passed. Updated screenshots and verification: `/home/edwardspc/Desktop/Dev/review-artifacts/province-city-search-placement-20261015/`.
