# Gauteng Province Guide Blueprint v1

Status: local review implementation, 15 October 2026. Not a production release or an editorial publication approval.

## Product decision

A province guide helps someone understand a province and decide where to explore next. A city guide compares that city's areas. A suburb guide supports a local decision. Buy/Rent results fulfil explicit property-search intent. These pages have different jobs and must not become interchangeable listing landing pages.

Keep the canonical `/gauteng` route. No competing `/guides/gauteng` destination. Preserve the approved map-cover hero, site navigation/theme, and shared compact city entries. The directory shows at most twelve entries, with Search cities below them. Its default order is editorial, not a measured popularity ranking. Do not claim trending without search analytics.

The task branch starts at accepted UX commit `43243be47`, rather than dropping the unmerged approved homepage/map/city work by starting from main. Existing other province pages remain on that baseline until they have their own researched content.

## Three responsibilities

| Responsibility        | Authority                                                                                                                        | Failure behaviour                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Editorial orientation | `shared/provinceGuideContent.ts`: explicit local-review/published state, source register, fixed source-check date, original text | Accessible without inventory or a database connection; initial HTML includes the substantive text                               |
| Place links           | Exact verified `provinces` / `cities` IDs, resolved by `provinceGuideService`                                                    | Never create a route from a plausible label or use a province fallback for a missing city; show place names as orientation text |
| Platform availability | Existing `publicSearchService.searchInventory`, with one canonical province ID                                                   | Sale and rent fail separately; unknown is unavailable, genuine zero is zero. Never reinterpret a failure as no stock            |

No new CMS, geography database, schema, seeds, commercial eligibility, moderation, publication or payment logic is introduced. Editorial region membership is **not** a Search Area or a query boundary.

## Geographic contract

Gauteng has three metropolitan municipalities (Johannesburg, Tshwane, Ekurhuleni) and two district municipalities (West Rand, Sedibeng). Do not reproduce the mockup's four-region model or treat metros and familiar lifestyle labels as the same administrative level.

- Johannesburg North is an editorial description inside the Johannesburg discussion, not a canonical location or inferred user preference.
- Pretoria is not the entire Tshwane metro. Centurion and eastern Tshwane need their own place context.
- Ekurhuleni's constituent towns provide a more useful next step than an assumed metro-wide home preference.
- Roodepoort belongs to Johannesburg; West Rand district is separate.
- Sedibeng includes Emfuleni, Midvaal and Lesedi. The wider Vaal river region reaches outside Gauteng. Do not silently include Sasolburg/Free State in a Gauteng search.

The retained hero artwork is decorative orientation imagery. It is not a boundary selector or an interactive map.

## Section contract and implemented design

The approved discovery prototype is preserved at `/home/edwardspc/Desktop/Dev/review-artifacts/gauteng-discovery-tabs-concept-20261015/`. The integrated page uses its balanced tabs and image rows while keeping the substantive guide content.

1. **Hero and journey composer:** keep Explore Gauteng and the approved map-cover artwork. Restore the existing seven journey pills/composer directly beneath the hero. Existing location identities, filters, specialist journeys and access gates remain authoritative.
2. **In this guide:** sticky, keyboard-accessible anchors to discovery, regions/districts, insights, cities, practical living and questions; horizontal scrolling on mobile.
3. **Discover your side of Gauteng:** independent, content-width icon tabs for City living, Green spaces, Connected living, East Rand towns, Town & country and Around the Vaal. Each has an original short description, compact image cards and expandable sourced context. These are editorial starting points, not popularity, affordability, safety or proximity rankings.
4. **Province orientation and five full regional guides:** retain the three-metro/two-district explanation and the full province introduction. Region pills expose one complete chapter at a time, including both original paragraphs, source links, place cards and practical considerations. All five chapters remain in the document and initial HTML. West Rand and Sedibeng are equal navigable districts; no content is discarded because their city destinations are missing.
5. **Canonical links and unavailable destinations:** city cards link only when the existing verified city read models supply canonical identities. Lifestyle cards without a city destination lead to the matching region chapter through a hash anchor; regional cards label those places as context. No city route is fabricated from a plausible name. Source and guide links use real anchors.
6. **Platform availability:** separate sale/rent counts and labelled bars, canonical province scope and observation date. These are available platform listings, not regional market prices or concluded sales. A zero has no filled bar; unavailable data never becomes zero.
7. **City directory:** approved homepage-style entries, twelve maximum, then search. Loading, failure and genuinely empty data remain distinct. No popularity claim or expanding “show more” grid.
8. **Optional sponsorship:** retain the existing separately labelled billboard contract. It never chooses geography or changes the guide order.
9. **Everyday life:** retain the full practical transport, daily-destination and running-cost guidance in compact adjacent panels. No unsubstantiated safety/school rankings or commute-time promises.
10. **FAQs and sources:** retain all province-specific questions and original sources, add the outdoor-destination sources, and keep the genuine fixed source-check date. No manufactured reviewer, market rating or refresh date.

### Collection evidence and geography

Green spaces names actual reference points: Johannesburg Botanical Garden/Emmarentia Dam, Pretoria National Botanical Garden, and Walter Sisulu National Botanical Garden in Poortview, Roodepoort. JCPZ and SANBI sources support those references. A city image is a city illustration, not a purported garden photograph. City-guide links provide broader context; collection membership does not claim every neighbourhood is green or near a park.

Connected living names the commuter-network reference points and directs readers to check the complete home-to-destination trip. Town & country and Around the Vaal link back to the existing regional context when city guides cannot be verified. These curated memberships are not new Search Areas or runtime query boundaries. No inference is made about an individual property's setting, access, suitability or value.

Both selector rows support normal keyboard tab focus plus arrow/Home/End navigation. Selection is local and independent: changing lifestyle does not reset a region or the property journey. Region hash links select the correct chapter before scrolling. Native Back/Forward and existing composer URL reconstruction remain part of validation.

## Market intelligence: defined but not manufactured

Phase one implements platform sale/rent availability, not regional prices or housing concentrations. The current service does not provide a governed municipality-wide regional aggregate. Summing a selection of city IDs would risk omissions/overlaps, and a Johannesburg place ID must not be described as the entire metropolitan municipality without boundary proof.

Future market pulse must declare:

- canonical geographic boundary/version, eligible listing sources, transaction and property type;
- denominator, sample size and snapshot date, with no mixed sale/rent or mixed units;
- one consistent observation per marketable item, including a reviewed development-unit counting rule;
- asking prices, never achieved-sale prices or “fair value”;
- median of finite positive advertised prices for the same type/transaction, with a proposed initial minimum of **30** priced observations; review that threshold before publication, rather than treating it as a statistical guarantee;
- no average slot merely because the mockup has one; luxury outliers make that easy to misread;
- demand/popularity only from real behavioural data, growth only from comparable historical snapshots;
- concentration only with a defined denominator and sufficient geographic/classification coverage. “Our available loft listings” is not “Gauteng's loft stock”.

Suppress unsupported estimates; do not fill them with zero or fictional data. Availability counts may honestly be zero. A count-service failure is a separate unavailable state. The demo's current counts are local scenario data and must not become market facts in editorial content or screenshots presented as production evidence.

## Content and sources

The source register lives beside the text. Source check is 15 October 2026. Sources include CoGTA, Johannesburg, Tshwane, Ekurhuleni, West Rand, Sedibeng, Metsimaholo, Gautrain, JCPZ and SANBI. Older municipal documents are used for stable geographic structure, not current population, prices, service quality or unimplemented plans. A West Rand draft is explicitly identified as a draft. Practical checklists are advice, not claimed local rankings.

Before public editorial publication: human review of region descriptions and source mappings; check source changes; verify place destinations against the release database; decide ownership/review cadence; approve only substantive city/suburb articles as they are completed. A verified place record alone is not a published article.

## SEO acceptance

- Initial HTML and rendered page use the same editorial content source and guide metadata/canonical.
- Vite emits `/gauteng/index.html`; reviewed frontend routing serves that document for `/gauteng`. Express also injects the same editorial body. This is a visible initial document, replaced by React, not hidden SEO-only copy. It contains no database-dependent city links or fictional metrics.
- React adds verified child links through ordinary anchors, while source/chapter links exist in the initial document.
- Local-review status is noindex. A separate editorial publication decision changes readiness; merging code does not silently publish an article.
- `/sitemap-guides.xml` is included in the sitemap index. Its entries come from published editorial guides independently of stock. It is intentionally empty while Gauteng is in local review. Do not list all place records as reviewed guides.
- Unknown/zero average prices are omitted from location structured data. Genuine zero listing totals remain valid.
- No false author, reviewedBy, publication date, market rating or price schema.
- Filtered journey URLs retain the clean guide canonical and noindex.

## Remaining work after this pilot

1. Review the local Gauteng design/content, then apply the approved template to separately researched provinces.
2. Give city/suburb pages distinct substantive content and publication readiness; preserve canonical route hierarchy.
3. Add a crawlable paginated directory beyond the twelve-entry preview, backed by published-guide eligibility, rather than a mass catalogue of thin place pages. Search already finds verified places beyond twelve.
4. Add regional market aggregates only after municipal/Search Area boundaries and development-unit counting semantics are approved. No new approximate geography layer.
5. Connect listing/result pages back to the relevant substantive suburb/city/province guide using their canonical place identities. Those reverse-link modules are not implemented by this province-page change.
6. Verify hosted static routing, sitemap proxy and production indexing only through the normal reviewed release. Local checks cannot prove rankings or production crawl behaviour.

Measure guide-to-city/suburb clicks, time to meaningful place selection, search backtracking, zero-result recovery, and enquiry outcomes. Instrument later using the governed analytics conventions; do not invent “popular” city order or event counts for this preview.
