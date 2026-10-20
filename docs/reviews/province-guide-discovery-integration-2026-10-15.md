# Gauteng guide: discovery and regional depth

Local review follow-up to the first editorial guide implementation. Branch: `feat/province-guide-editorial-20261015`, in the task-owned `property-listify-province-guide-editorial-20261015` worktree. No push, merge, deployment or publication is included.

## Result

The approved discovery prototype is integrated into the real `/gauteng` page. Its content-width icon pills and compact image rows now coexist with the complete regional guide, rather than replacing it.

- The approved map-cover hero and existing journey composer remain at the top.
- Six independently selectable collections introduce City living, Green spaces, Connected living, East Rand towns, Town & country and Around the Vaal.
- A second tab row restores Johannesburg, Tshwane/Pretoria, Ekurhuleni, West Rand and Sedibeng/Vaal. Every original regional paragraph, consideration and source remains available. Selecting a district shows its complete text, places and practical comparison panel.
- All regional text and the new collection context are included in the initial HTML. The guide remains readable if inventory fails.
- Green spaces names Johannesburg Botanical Garden/Emmarentia Dam, Pretoria National Botanical Garden and Walter Sisulu National Botanical Garden. The JCPZ/SANBI references are in the source register. These are editorial starting points, not citywide park-proximity or property-suitability claims.
- City destinations use the existing verified place read models. A lifestyle card without a verified city destination opens its regional context. No city route or search boundary is invented. Repeated fragment navigation works after another district tab has been selected.
- Sale/rent availability bars use the existing public-inventory service. Unknown counts remain unavailable, and genuine zero remains zero. No regional prices, ratings, growth, demand or popularity are fabricated.
- The existing twelve compact city entries, search beneath them, practical guidance, FAQs and sources remain. The billboard keeps its existing separate sponsorship treatment.

The standalone approved prototype is preserved unchanged at `http://localhost:3022/`. The integrated real page is at `http://localhost:3020/gauteng`.

## Change boundaries

Changed presentation: `ProvinceEditorialPage.tsx`, new `ProvinceGuideDiscovery.tsx`, and `province-editorial.css`. The shared content model adds sourced discovery collections; `provinceGuideHtml.ts` includes their context in the initial document. Focused component/page and SEO contract tests protect retained content and navigation. The blueprint records the final design and data boundaries.

Changed files:

- `client/src/pages/ProvinceEditorialPage.tsx`
- `client/src/components/provincial/ProvinceGuideDiscovery.tsx`
- `client/src/styles/province-editorial.css`
- `shared/provinceGuideContent.ts`
- `shared/provinceGuideHtml.ts`
- `client/src/pages/__tests__/ProvinceEditorialPage.test.tsx`
- `client/src/components/provincial/ProvinceGuideDiscovery.test.tsx`
- `server/__tests__/contract.province-guide-seo.test.ts`
- `docs/product/gauteng-province-guide-blueprint-v1.md`
- `docs/reviews/province-guide-discovery-integration-2026-10-15.md`

No database query, schema, migration, seed, eligibility rule, permission, payment rule or publication gate changes in this follow-up. Other provinces keep their existing experience. The guide is still a local-review draft with noindex.

## Evidence and validation

Artifacts: `/home/edwardspc/Desktop/Dev/review-artifacts/province-guide-discovery-integration-20261015/`.

The previous editorial layout is recorded at `../province-guide-editorial-20261015/after-1440.png`. The approved standalone concept remains at `../gauteng-discovery-tabs-concept-20261015/`. Integrated desktop/mobile screenshots, region screenshots, browser interaction results and check logs live in the current artifact directory.

The browser pass covers 1440, 1024, 390 and 320 pixel widths, independent tab selections, full district text, repeated regional fragment links, twelve-city cap, city search/clear, document overflow, runtime errors, and WCAG A/AA checks at desktop/mobile widths. The established provincial journey suite checks the existing composer, canonical search handoffs, specialist journeys, browser history, sponsorship and unavailable-province behaviour.

Final results:

- Focused client coverage: 18 distinct passing tests across the page, discovery and compact-city components (the final six-test discovery run includes the repeated-fragment regression).
- Initial-document/SEO contracts: 4 passed.
- Existing provincial browser journey suite: 21 passed.
- Live page: no document overflow or runtime errors at all four widths; no WCAG A/AA violations in the checked guide/search regions at 1440 and 390 pixels.
- TypeScript, focused ESLint and formatting checks: passed. Frontend build: passed, with existing application bundle-size warnings.
- Built `/gauteng/index.html` contains regional text, the new garden context and the local-review noindex directive.

The screenshot comparison is `index.html` in the artifact directory. `integrated-1440.png` and `integrated-390.png` show the whole page; `west-rand-1440.png` and `west-rand-390.png` show the restored district detail. The prototype files remain untouched.

The existing disposable demo was preserved. After the local service interruption, the governed service recovery removed only stale PID/socket/lock metadata; the native service restarted without recreating its database or reseeding data. Read-only status verified exact ownership, manifest-head readiness, schema congruency and application readiness. Browser API requests are restricted to reads through the existing local review adapter.

## Limits

Regional medians and property-type distributions still require approved geographic aggregates and adequate samples. The bars describe local platform availability only. Missing town cover images use the existing province scene; these generated images are illustrations, not photographs of the named garden or an individual property. City/suburb guide depth and the other eight provinces remain separate work. Local validation does not establish production indexing or search rankings.
