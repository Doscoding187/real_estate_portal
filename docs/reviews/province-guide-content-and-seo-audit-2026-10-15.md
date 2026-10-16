# Province guides: content, journey and SEO audit

Review target: local feature branch `feat/homepage-ux-review-20261013`, application at `0a4f40d9a`. Purpose supplied by Edward: province pages should provide meaningful insight into their cities and suburbs, act as substantial discovery guides, and support organic search. This is an audit and implementation brief; no application code is changed by this review.

## Assessment

The current page does not yet fulfil that purpose. It has an approved map hero and improved city-guide navigation, but its body remains a property-discovery landing page. Search composition, professional recommendations, journey prompts, inventory counts, property previews and conversion prompts occupy the main hierarchy. The locality-specific editorial content needed to explain a province is largely absent.

The problem is content architecture and publishing readiness as well as presentation. Adding more cards or appending generic paragraphs would preserve the underlying mismatch.

## Evidence

| Finding | Repository/runtime evidence | Implication |
| --- | --- | --- |
| Transactional hierarchy | `client/src/pages/ProvincePage.tsx`: composer and agent recommendations precede the main content; featuredNeeds, property availability, inventory previews, save-search and agent prompts precede the bottom context block. | A visitor is repeatedly asked to take a property action before learning about the province. |
| Minimal place-specific explanation | `shared/provincialDiscovery.ts`: Gauteng has a short introduction and platform-use FAQs; Western Cape describes the province-level discovery contract. The generic province factory repeats platform guidance with substituted province names. | The copy explains software behaviour rather than local geography, daily life or meaningful differences between areas. |
| A place record is treated as a guide | `server/services/cityGuideDiscoveryService.ts` checks verified city/province records and nonempty slugs, then returns identities/names/paths. It has no editorial-content or reviewed-guide readiness check. | A functioning page URL does not establish the existence of a useful, researched guide. |
| Editorial slots are not connected | `CityPage.tsx` and `SuburbPage.tsx` import SEOTextBlock but do not pass editorial content into LocationPageLayout's seoContent slot. Existing maps/amenity components are useful components, not a complete written guide. | Sending visitors down the hierarchy alone will not resolve the missing depth. |
| Guide availability depends on inventory processing | `provincialDiscoveryService.ts` calls the base inventory-aggregating province service, then publicSearchService.searchInventory before returning the province page model. Inventory eligibility failures can propagate from the base service. | Durable guide content should remain readable when inventory is empty or unavailable. No eligibility gate should be weakened to achieve that separation. |
| Neutral guide sitemap coverage is absent in this route set | `server/routes/sitemap.ts`: sitemap-areas builds sale/rent URL prefixes from eligible property inventory; sitemap-static does not supply neutral province/city/suburb guide URLs. | Add guide-specific sitemap coverage based on published, useful guides, independent of property stock. This finding is not proof that Google has failed to index a page. |
| Initial-delivery metadata needs reconciliation | The local initial HTML has the generic site title; React updates it to Explore Gauteng/Western Cape after rendering. `server/_core/seoHead.ts` handles transaction areas but falls through to generic metadata for neutral guide paths; `vercel.ts` uses an index.html fallback. | Review the actual deployed delivery path, canonical and descriptive head together. Google supports JavaScript rendering; this audit does not assume all client-rendered content is unindexable. |
| Structured data claims an unknown price is zero | ProvincePage passes avgPrice: 0 to LocationSchema, which emits Average Sale Price with numeric value 0 and ZAR. Both sampled pages reproduce it, although visible copy says reliable price data is unavailable. | Omit unknown pricing from structured data. Metadata must agree with visible, defensible information. |
| The twelve-city UI is not the complete crawl path | Current links are standard guide anchors, but cities beyond the selected twelve are found through an interactive search. | Keep the approved visual cap and search; provide an ordinary linked, paginated guide-directory path and sitemap coverage for other published guides. Do not require a crawler to type into search. |

## Rendered local samples

Gauteng and Western Cape were reviewed in Chromium at 1440px. The default-visible context block, including the first expanded FAQ where present, contained approximately 124 and 59 words respectively. These counts are descriptive evidence, not an SEO word-count target; collapsed FAQ answers are excluded from that visible-text count. The content itself is primarily product instructions.

The rendered main content in both samples had no discussion containing commute, transport, schools, healthcare, municipalities or daily life. Word matching alone is not a content-quality test, but manual review of the headings and paragraphs confirmed the missing topics. Gauteng's headings largely describe journeys, availability and next actions. Western Cape's context includes: “A metro-led coastal market can use the same province-level discovery contract without forcing a different geography journey.”

Both rendered metadata samples emit a zero average sale price. Initial HTML and rendered head, section order, context text, JSON-LD and full-page screenshots are retained in `/home/edwardspc/Desktop/Dev/review-artifacts/province-guide-content-audit-20261015/`.

## Proposed guide-first page structure

1. **Preserve the map hero and Explore [Province] title.** Add a short, province-specific orientation explaining the place and what the reader will learn. A genuine guide introduction replaces platform workflow language.
2. **Give readers their bearings.** Explain the major regions and the relationship between familiar cities/towns, metropolitan municipalities and surrounding areas. Use the approved map artwork for orientation; do not describe a decorative image as an interactive geographic map. Add a compact In this guide navigation with the existing visual language.
3. **Keep the approved city directory.** Up to twelve compact homepage-style entries, with Search cities below and no expansion. These are navigation, not the whole guide. Keep their links neutral and their availability independent of property stock.
4. **Explain different parts of the province.** Use readable editorial sections with substantive, specific context and selected child-guide links. Cover character, urban/town/peripheral settings, relevant employment/education/amenity context and practical considerations when comparing areas. Avoid a wall of equal promotional cards or a mandatory comparison table.
5. **Connect cities to suburbs.** Introduce selected neighbourhoods in the context of their city and explain useful differences, linking to canonical suburb guides. Province orientation, city detail and suburb daily-life detail each have a separate job; do not duplicate entire articles at every level.
6. **Cover getting around and everyday decisions.** Explain regional connections, transport options, access to education/healthcare/services and practical relocation considerations where reliable information exists. Attribute facts and meaningful limitations. Do not invent travel times, school ratings, safety rankings, price medians or claims of suitability.
7. **Answer local questions and show editorial accountability.** Questions should address the province, its places and the choices readers face. Include genuine sources, a real editor/reviewer where available, and the actual review date. Do not auto-refresh dates or invent local expertise.
8. **Offer property journeys as secondary next steps.** Buy, Rent, Developments and other working journeys remain available through their existing authorities. Inventory grids, repeated conversion prompts and agent panels should not define the guide's main body. Retain a clearly separated sponsorship/billboard opportunity without allowing sponsorship to determine editorial advice.

The body should use an editorial layout with useful headings, short paragraphs, selective lists and linked place references. The approved city component remains compact. Mobile should support scanning a guide and moving between sections, without requiring every paragraph to be hidden in a collapsed panel.

## Gauteng example of the missing orientation

A useful starting structure would explain Johannesburg, Tshwane/Pretoria, Ekurhuleni, West Rand and Sedibeng before asking readers to choose a place. Those labels are not interchangeable geographic levels. CoGTA describes Gauteng's three metropolitan municipalities and two district municipalities in its Gauteng DDM publication. Any guide groups must respect governed identities and distinguish editorial grouping from administrative or search authority.

Subsequent chapters would connect readers to verified city and suburb guides with sourced explanations. Existing listings and images alone cannot supply this editorial insight. Do not manufacture guide text simply because a canonical place row exists.

## Content and search boundaries

- The province guide explains the province and helps readers shortlist places.
- A city guide explains its character, connections, districts and neighbourhood options.
- A suburb guide provides specific neighbourhood context and practical local detail.
- Transaction results answer the explicit Buy/Rent intent and own filters, inventory and publication rules.

Retain the existing neutral guide URLs and transaction URLs, rather than introducing a competing hierarchy of nominal SEO pages. Core guide content should have a durable read model separate from volatile inventory. A reviewed guide should reference canonical place IDs, sourced factual sections, child-guide references, responsible authorship and a real revision history. The storage/editorial-authoring implementation needs to follow existing repository authority; this audit introduces no schema or CMS.

## Prioritised implementation

**First: establish the content contract and produce one complete Gauteng guide.** Build it around verified source material and the chapter structure above. Review its actual usefulness, reading hierarchy and city/suburb handoffs before repeating the structure elsewhere. Preserve the approved map and compact city design.

**Alongside it: close the concrete SEO defects.** Remove unknown zero pricing, align guide-specific initial and rendered metadata/canonicals, provide neutral published-guide sitemap coverage and crawlable directory links beyond the initial twelve. Verify the delivered HTML and Search Console outcomes on an authorised deployed environment separately; neither was inspected here.

**Then: extend to other provinces and connect substantive city/suburb content.** Each province needs distinct research. Do not clone a generic paragraph nine times or claim that every existing geography row is an editorially complete guide.

## Acceptance criteria

- A visitor can learn how a province is organised and identify meaningful differences between places before opening property results.
- The guide remains useful and readable with zero inventory and during an inventory failure.
- City and suburb links resolve to their real neutral guide routes and preserve governed geography.
- City discovery stays capped at twelve, search remains below, and removed sales shortcuts/captions are not reinstated.
- Each published guide has substantive place-specific content, real source/review information and a clear editorial readiness state.
- Claims about prices, transport, schools and other material matters are sourced and current enough for their purpose; unavailable facts are omitted or explained accurately.
- Metadata and structured data describe what the page actually provides; unknown pricing is not zero.
- Published guide URLs are discoverable by ordinary links and guide-aware sitemaps, including guides with no listings. Merely having a place record does not qualify a thin page for mass publication.
- Commercial actions remain secondary, functioning and governed; no payment, permissions, moderation or publication bypass is introduced.

## Sources and audit limits

- [Google: helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content): useful original coverage, sourcing and real expertise; no preferred word count. Depth means answering readers' needs.
- [Google: crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable): standard anchors and understandable link context.
- [Google: JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics): rendering, content and metadata need deliberate verification.
- [CoGTA: Gauteng District Development Model](https://www.cogta.gov.za/cgta_2016/wp-content/uploads/2023/11/Gauteng-DDM-Booklet-Vol-1-Nov-2021.pdf): published geographic orientation reference, not evidence of current transport, housing prices or service availability.

This is a repository and local-render audit, not a production indexability, ranking, keyword-volume, backlink or Core Web Vitals audit. No Search Console account, protected database or production deployment was accessed. Local data verification reused the existing exact owned disposable demo after Database Authority status reported ready, manifest-head-ready and schema-congruent. No application, schema, query, data, seed or fixture changes were made. Only this audit document is committed.
