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

1. **Hero:** keep Explore Gauteng and the approved map-cover artwork. Short orientation, no sales metric or manufactured video button.
2. **In this guide:** sticky, keyboard-accessible section anchors; horizontal scrolling on mobile.
3. **Province orientation:** explain three metros/two districts and distinguish familiar labels. Five compact regional jump links.
4. **Five region chapters:** original geographic context, two useful paragraphs, practical consideration and source links. An adjacent compact rail links verified city/town destinations. Only the first three chapters use existing city imagery; no invented West Rand/Vaal image presented as a specific place.
5. **Find your starting point:** priorities for a daily destination, property setting and home type. These are transparent research starting points, not personalised recommendations or unsupported “best area” rankings.
6. **City directory:** reuse the approved homepage-style entries; twelve maximum, then search. Loading, failure and genuinely empty data are distinct. Existing routes are place destinations, not a claim that every city article is editorially complete.
7. **Optional sponsorship:** existing billboard contract, distinctly labelled and separated from guide content. It never chooses a search location or alters editorial ordering.
8. **Everyday life:** transport connections and practical questions about destinations, services and running costs. No unsubstantiated safety/school-quality rankings or commute-time promises.
9. **Platform availability:** separate sale/rent counts, canonical province scope, observed date, explicit platform-only coverage. Secondary Buy/Rent handoffs retain canonical location authority.
10. **FAQs and sources:** Gauteng-specific geographic questions, asking versus sale prices, limits of platform data; official source links and actual source-check date. No fabricated reviewer or automatically refreshed editorial date.
11. **Property journey handoff:** existing seven pill tabs/composer, moved below editorial content. Existing filters, URLs, specialist journeys and access gates remain authoritative.

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

The source register lives beside the text. Source check is 15 October 2026. Sources include CoGTA, Johannesburg, Tshwane, Ekurhuleni, West Rand, Sedibeng, Metsimaholo and Gautrain. Older municipal documents are used for stable geographic structure, not current population, prices, service quality or unimplemented plans. A West Rand draft is explicitly identified as a draft. Practical checklists are advice, not claimed local rankings.

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
