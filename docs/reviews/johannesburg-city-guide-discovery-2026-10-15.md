# Johannesburg city guide: discovery pilot

Local preview: `http://localhost:3024/gauteng/johannesburg`.

Branch `feat/city-guide-discovery-20261015`, task-owned worktree `property-listify-city-guide-discovery-20261015`. Based on accepted province spacing commit `b514654dc`; the province review at port 3020 and approved standalone concept at port 3022 remain available. No deployment, push, merge or editorial publication is included.

## Product and visual result

The city guide helps a visitor compare parts of Johannesburg and decide which place to investigate next. It uses the approved province page's content-width pills, restrained blue palette, compact place rows, section spacing and source-backed context. It adds city-level detail rather than repeating the province overview or leading with listing promotions.

- Hero: retain the owned Johannesburg scene, restore a readable Explore Johannesburg heading, and explain the guide's purpose.
- Journey composer: one set of journey pills, a verified area picker, optional residential type/budget and an explicit action. No Buy/Rent intent or citywide scope is selected automatically. A deliberate all-Johannesburg option remains available.
- Discovery: Across the city, Green spaces, Rail connections and Neighbourhood life. Named parks/stations provide concrete starting points. Editorial collections are not suitability, safety, affordability or popularity rankings.
- Orientation: all seven municipal-region chapters, with independent tabs, individual place links and practical considerations. The metropolitan context never becomes an inferred search boundary.
- Inventory: labelled property-type bars from the existing eligible city read model. Sale and rent are explicitly combined. No median, achieved sale price, demand, price-per-square-metre, growth or fabricated benchmark is shown.
- Suburb directory: twelve compact previews, followed by a search that reaches beyond the preview. Mobile uses three compact rows with horizontal browsing, consistent with the approved province directory.
- Deeper context: practical living considerations, FAQs, a source register and a return link to the Gauteng guide. Optional sponsorship keeps the existing separately labelled billboard contract.

This pilot applies to the neutral Johannesburg guide, including its trailing-slash form. Other cities and transaction roots retain their existing page implementation. Existing specialist journey URL builders and release gates remain authoritative.

## Place identity and the Rosebank case

The current governed discovery service resolves Rosebank as factual town `city:258`, with route `/gauteng/rosebank`, while Sandton resolves as locality `suburb:1` under Johannesburg, with route `/gauteng/johannesburg/sandton`. The frontend must not reclassify either from a familiar name or rewrite their parents to fit a visual hierarchy.

The picker groups verified Johannesburg suburbs separately from other returned Gauteng city/town places. Selecting one is explicit and retains its canonical and available factual identity. Neighbourhood cards use the destination supplied by the authority; ambiguous exact matches fall back to explanatory city context. The pilot creates no place rows, aliases, region boundaries, approximate geographic scopes or display-name queries.

The existing public discovery endpoint searches across locations and returns at most twenty matches. Filtering them for this guide can therefore miss a place when a very ambiguous short query is crowded out. The UI asks for a more specific name rather than widening scope silently. A complete city-scoped server search would be a separately reviewed contract improvement.

## Data and failure boundaries

No database schema, runtime query/service, seed, fixture, permission, moderation, commercial eligibility, payment or publication rule changes. Browser validation uses the existing disposable local demo through a GET-only review API. Read-only authority status confirmed exact ownership, manifest head `0115_non_geographic_place_search_eligibility.sql`, schema congruency and readiness. Demo data is preserved and remains local.

The page uses `getCityData` with `includeInventoryPreview: false`, existing governed place discovery and the existing campaign query. Static editorial content renders independently. Loading, network/API failure and a genuine zero are separate states. Inconsistent type totals suppress the breakdown rather than draw a misleading chart. Place search failure offers retry; it does not become a zero-inventory message.

Inventory is the existing Johannesburg catalogue identity, not a newly calculated total for the whole municipality. The current read model has no source snapshot timestamp, so the UI does not invent an update time. Price comparisons and municipal aggregates remain outside this change. Composer choices are held in page state; refresh/back restoration of that draft is not added by this presentation pilot.

## Sources and SEO

`shared/cityGuideContent.ts` owns original guide text, source IDs and local-review readiness. Sources checked 15 October 2026:

- City of Johannesburg, 2025 strategy: stable seven-region geography only; no crime, safety rating, population or forecast claims are reproduced.
- Johannesburg City Parks & Zoo: named parks, gardens and neighbourhood context; no access-time, fee, proximity or safety guarantee.
- Gautrain: commuter-network and Rosebank-station reference points; no commute-time promise.

Full guide text is in the visible initial HTML and the React document. Vite emits `/gauteng/johannesburg/index.html`; initial and rendered metadata share the same clean canonical path and local-review noindex state. The existing environment-aware client utility uses the local app origin in this preview; initial HTML uses the public site origin. Hosted origin parity still depends on the normal frontend environment configuration. Unknown prices and artificial ratings are absent. No extra SEO route is introduced. Publication and sitemap inclusion require a later editorial readiness decision; this pilot does not publish a new article by merging code.

Generated city imagery is illustrative context, including shared scene fallbacks where a neighbourhood has no owned cover. It is not represented as a photograph of a specific garden or property. Suburb-guide content and other city pilots remain separate workstreams.

## Changed files and evidence

Presentation: `CityGuidePage.tsx`, `CityGuideJourney.tsx`, `city-guide.css`, the neutral-guide wrapper in `CityPage.tsx`, and exports of the already-tested discovery-tab/row components. Identity helpers: `cityGuideDiscovery.ts`. Editorial/SEO: `cityGuideContent.ts`, `cityGuideHtml.ts`, `seoHead.ts` and Vite's existing guide-document emission. Focused tests cover identity, ambiguity, area/intent selection, failure states, inventory honesty, initial HTML and retained shared components.

Evidence directory: `/home/edwardspc/Desktop/Dev/review-artifacts/city-guide-discovery-20261015/`. It contains the original page screenshot, integrated desktop/mobile screenshots, green-space and region detail, real canonical place responses, failure-state capture, browser/action/a11y results, and check logs. The final result and limitations are recorded with the local commit.

Validation results:

- 22 focused component/identity tests passed, including the retained province discovery controls and existing location-hero Rent/Land behaviour.
- 68 existing search handoff and location-discovery tests passed.
- 8 initial HTML/SEO contracts passed with database initialization explicitly skipped.
- All 21 existing provincial browser journeys passed on the new preview, including Western Cape and unavailable-province cases.
- Live city checks passed at 1440, 1024, 390 and 320 pixels: seven retained regional chapters, twelve suburb previews, independent tabs, Buy/Rent filters, specialist destinations, exact place selection, suburb navigation/back and readable data-failure state. No document overflow or page errors.
- Scoped WCAG A/AA checks at 1440 and 390 pixels reported no violations.
- TypeScript, new-code ESLint, formatting and whitespace checks passed. Existing warnings in the retained legacy CityPage implementation are unchanged. Frontend build passed; it emits the existing application bundle-size warnings.

The local preview is a reviewable implementation, not evidence of production indexing, search ranking or complete editorial coverage of every city/suburb.
