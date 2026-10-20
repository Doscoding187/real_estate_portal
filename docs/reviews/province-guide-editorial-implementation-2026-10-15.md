# Gauteng province guide: local implementation review

## Result

The Gauteng page now leads with regional orientation and substantive guide content, followed by city discovery and practical information. The approved map-cover hero and compact twelve-city pattern remain. Property search is a secondary handoff at the bottom, and an existing sponsored billboard remains separate when a campaign is available.

Preview: `http://localhost:3020/gauteng`.
Previous accepted preview: `http://localhost:3010/gauteng`.
Comparison gallery: `/home/edwardspc/Desktop/Dev/review-artifacts/province-guide-editorial-20261015/index.html`.

Branch: `feat/province-guide-editorial-20261015`.
Task worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-province-guide-editorial-20261015`.
Base: accepted UX commit `43243be47`, preserving earlier unmerged homepage/map/city work.

Product and data decisions are recorded in [Gauteng Province Guide Blueprint v1](../product/gauteng-province-guide-blueprint-v1.md). The earlier audit remains in [Province guides: content, journey and SEO audit](province-guide-content-and-seo-audit-2026-10-15.md).

## Changed files

| Area                             | Files                                                                                                                                                                                                                                                         | Purpose                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Editorial model and initial HTML | `shared/provinceGuideContent.ts`, `shared/provinceGuideHtml.ts`                                                                                                                                                                                               | Five source-backed region chapters, practical guidance, FAQs, source register, explicit review/publication state; readable initial document     |
| Page and visual design           | `client/src/pages/ProvincePage.tsx`, `ProvinceEditorialPage.tsx`, `ProvinceDiscoveryPage.tsx`, `client/src/styles/province-editorial.css`, `client/src/components/provincial/ProvinceGuideHero.tsx`                                                           | Route by available editorial content, preserve other province templates, keep hero and compact directory, reduce transactional prominence       |
| Verified links and inventory     | `server/services/provinceGuideService.ts`, `server/locationPagesRouter.ts`                                                                                                                                                                                    | Exact verified canonical place links; separate sale/rent platform availability through existing eligible public search                          |
| SEO and static delivery          | `server/_core/seoHead.ts`, `server/routes/sitemap.ts`, `vite.config.ts`, `vercel.ts`, `client/src/components/location/LocationSchema.tsx`                                                                                                                     | Consistent guide metadata, initial editorial HTML, built guide document routing, published-guide sitemap registration; omit unknown zero prices |
| Verification                     | `ProvinceEditorialPage.test.tsx`, `ProvincePage.guide-availability.test.tsx`, `LocationSchema.neutral.test.tsx`, `provinceGuideService.test.ts`, `contract.province-guide-seo.test.ts`, `contract.sitemap-agents.test.ts`, `e2e/provincial-discovery.spec.ts` | Failure independence, canonical IDs, ambiguous identity rejection, true zero versus unavailable, metadata, readiness and existing journeys      |

## Validation

- `pnpm check`: passed.
- `pnpm exec vite build`: passed, including `dist/public/gauteng/index.html`. Existing large-chunk warning remains; no bundle-size optimisation is claimed.
- Focused client tests: **22 passed** across five files.
- Focused server tests: **22 passed** across five files.
- Existing provincial browser suite: **21 passed**. Covers neutral journey selection, Buy/Rent canonical handoff, filters, URL refresh/back/forward, deliberate sibling OR, keyboard use, sponsorship separation, Western Cape and missing canonical province coverage. Gauteng expectations were updated for the guide hierarchy rather than removed.
- Live local browser review: **1440, 1024, 768, 390 and 320px**, no page errors, page overflow or broken loaded images. Five chapters and twelve initial city entries.
- Axe WCAG A/AA checks of changed guide body/navigation at desktop and mobile: **zero violations**. This is not a certification of unrelated global site chrome.
- City search finds Pretoria, opens its existing guide, recovers from a no-match search and clears back to twelve. Search remains below the entries.
- Guide anchor navigation lands below sticky chrome.
- JavaScript-disabled page has all five readable chapters and guide-specific metadata.
- Deliberately failed place resolution leaves all five chapters readable and removes unresolved search handoffs. Unit tests separately cover partial inventory failure and zero counts.
- Previous preview was reopened and captured successfully through its original read API routing.

Evidence directory: `/home/edwardspc/Desktop/Dev/review-artifacts/province-guide-editorial-20261015/`.
Key artifacts: `browser-verification.json`, `browser.txt`, `build.txt`, `typecheck.txt`, `client-tests.txt`, `server-tests.txt`, `e2e.txt`, `lint.txt`, `database-status.txt`.
Lint had **zero errors**; existing `any`/unused-variable warnings and ignored configuration-file warnings remain visible in its log.

## Local data authority

Classification: database consumer/read-model work plus local-data browser validation.
Target: existing disposable local demo, fingerprint hash `536d822ba96d14486486fb53065a78e2935b9d65c7a23484c3b06f05b7dda890`.
Canonical authority: verified `provinces`/`cities` and existing `publicSearchService.searchInventory` eligibility. Status: manifest-head-ready and schema-congruent at `0115_non_geographic_place_search_eligibility.sql`, no incomplete attempts.

No schema, migrations, seeds, data writes, payment/access changes or protected database operations. The local review API accepts GET/HEAD only. The existing demo and its seeded data remain intact. Development's approved API-origin guard remains unchanged: the existing read proxy dispatches requests from the new preview origin to the task API and retains its old behaviour for the earlier preview.

## Limitations and next decisions

- Gauteng is a **local-review editorial draft**. It remains noindex and is intentionally absent from the published-guide sitemap until approved. Code review/merge must not silently imply editorial publication.
- The other eight provinces retain their prior page implementation; they need their own researched content before adopting this guide template.
- Several regional places do not resolve to verified city guide destinations in the demo. They are labelled orientation text, never invented links. Existing linked city pages are not a claim of completed substantive city/suburb editorial work.
- Available numbers are **platform inventory counts only**, based on local demo data. No regional median, growth, demand, concentration, safety or school-quality claim is manufactured. Regional market aggregates require boundary/classification and sample-size work described in the blueprint.
- The preview's default twelve-city order is editorial; no search analytics currently establishes popularity. A crawlable published-guide directory beyond twelve and reverse listing-to-guide modules remain follow-on work.
- Static guide output and route configuration were built locally; hosted routing, sitemap delivery and production indexing were not exercised. No push, merge or deployment occurred.
