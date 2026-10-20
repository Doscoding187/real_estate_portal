# 62 — Guide Pilot Publication, SEO Delivery and Frontend Release Step

**Date:** 2026-10-20
**Worktree:** `.worktrees/property-listify-guide-pilot-seo-20261020` (branch
`feat/guide-pilot-seo-publication-20261020`, base `origin/main` = `cd62988fb`)
**Type:** Reviewed Git change plus a recorded release step. No schema, migration,
seed, fixture or protected database operation in this packet.

## Purpose

The launch path was blocked on the geography guide pilot. The authored Gauteng,
Johannesburg and Sandton guides existed in the integration base but were held in
`local-review`, so every guide route emitted `noindex`, the guide sitemap was
empty, and the hosting layer had no route for a city or suburb guide request.
This packet records the publication decision, the code delivery, and the frontend
release step that removes the production deployment gate.

## Finding reconciliation against the integration base

The findings were checked against `origin/main` = `cd62988fb` before any edit.

| Finding | State in the integration base | Disposition |
| --- | --- | --- |
| Guides are `local-review` and every guide route emits `noindex` | True. `shared/provinceGuideContent.ts` and `shared/cityGuideContent.ts` both carried `status: 'local-review'`; `server/_core/seoHead.ts` derived `noindex, follow` from that status. | Correct. Publication is an explicit editorial decision, made in this change. |
| `sitemap-guides.xml` contains zero guide URLs | True, and for the right reason. The route exists and filters on `getPublishedProvinceGuides()` / `getPublishedCityGuides()`, and no guide was published. | Correct. The sitemap now lists the published guides. |
| A flip also makes the pilot suburb indexable | True. The suburb pilot inherited the city guide's status, so publishing Johannesburg published Sandton. | Retained as one authority. The pilot has no separate reviewed article, so its readiness belongs to its city guide. |
| The build emits HTML for `/gauteng` and `/gauteng/johannesburg` | True. `vite.config.ts` emitted one document per authored province and city guide. | Correct. |
| No static HTML is generated for `/gauteng/johannesburg/sandton` | True. The suburb pilot had no delivered document. | **Fixed.** `shared/suburbGuideHtml.ts` produces the pilot's first document and the build emits it. |
| Vercel has an explicit route only for province guides | True. `vercel.ts` mapped `PROVINCE_GUIDE_CONTENT` only, so a city or suburb guide request fell through to the generic application shell. | **Fixed.** Every guide route now has an explicit route. |
| Published copy still says "local preview draft" / "local-review" | True. The province and city first documents, and the rendered city guide, carried the draft marker unconditionally. | **Fixed.** The marker is now derived from the publication status. |
| `vercel.ts` has `deploymentEnabled.main: false` | True. | **Fixed** in the separately recorded release step below. |

Two related defects were found while implementing the findings and are fixed in
the same change because they are part of the same delivered document:

- The static fallback `client/public/sitemap.xml` listed `sitemap-areas.xml`,
  which the API index no longer advertises, and omitted `sitemap-agents.xml`
  and `sitemap-guides.xml`. The index children now have one authority,
  `shared/sitemapIndex.ts`, and a contract test holds the static document to it.
- `scripts/generate-sitemap.ts` wrote a sitemap index built from the retired
  `https://propertylistify.com` origin into `client/public/sitemap.xml`. It was
  referenced by no script, CI workflow or document behaviour, and running it
  would have silently corrupted the public sitemap. It is retired.

## Publication decision

`status` is now `'published'` for the Gauteng province guide and the
Johannesburg city guide. That single field is the publication authority:

- the route's robots directive,
- the guide sitemap entry,
- the delivered document's draft marker, and
- the rendered page's `forceNoIndex`

all derive from it. Reverting one field returns the guide to `local-review`,
which restores `noindex, follow`, removes it from the guide sitemap and restores
the draft marker. The published guide content, source register and source-check
date are unchanged by this decision.

**Edward's copy sign-off is still required.** The publication decision here is
made to unblock the launch path; if the copy review rejects a passage, the
status field is the single place to correct it and no other change is required.

## Code delivery

| Concern | File | Change |
| --- | --- | --- |
| Publication vocabulary | `shared/guidePublication.ts` | One status type, one draft label and one publication filter for every guide level. |
| Province guide | `shared/provinceGuideContent.ts` | Status set to `published`; publication filter uses the shared selector. |
| City guide | `shared/cityGuideContent.ts` | Status set to `published`; Region E source added to the source register; publication filter uses the shared selector. |
| Suburb pilot policy | `shared/suburbGuidePolicy.ts` | Pilot identity, the city-context chapter id, the published-pilot decision, and one title/description source. |
| Suburb first document | `shared/suburbGuideHtml.ts` | New. The pilot's visible, inventory-independent first document, reusing the reviewed city-guide chapter the rendered page also shows. |
| Guide routes | `shared/guideRoutes.ts` | One list of guide routes that receive a delivered document. |
| Sitemap index | `shared/sitemapIndex.ts` | One authority for the index children. |
| Served metadata | `server/_core/seoHead.ts` | Suburb pilot metadata and first document; guide structured data (place and breadcrumb) delivered with the document. |
| Guide sitemap | `server/routes/sitemap.ts` | Published province, city and suburb pilot routes listed. |
| Build | `vite.config.ts` | Emits one document per guide route, including the suburb pilot. |
| Hosting | `vercel.ts` | An explicit route per guide route. |
| Rendered guides | `client/src/pages/CityGuidePage.tsx`, `client/src/pages/SuburbGuidePage.tsx` | Status-aware source copy; shared title, description and pilot publication decision. |

### Delivered document contract

Each guide route now receives a document that a crawler can read without
executing JavaScript:

- the guide's own editorial content, not a hidden block;
- the guide's title, description, canonical URL and robots directive;
- `BreadcrumbList` and place structured data, marked `data-seo-managed` so the
  rendered page replaces them on boot rather than duplicating them;
- no listing counts, prices, amenities or local professionals, and no draft
  marker on a published guide.

## Evidence

Repository-local verification, all against the reviewed worktree:

```
pnpm check                                   # tsc -p tsconfig.check.json --noEmit, no diagnostics
npx eslint <changed files>                   # 0 errors
npx vitest --run --config vitest.server.config.ts \
  server/__tests__/contract.province-guide-seo.test.ts \
  server/__tests__/contract.city-guide-seo.test.ts \
  server/__tests__/contract.suburb-guide-seo.test.ts \
  server/__tests__/contract.guide-pilot-publication.test.ts \
  server/__tests__/contract.sitemap-agents.test.ts \
  server/services/__tests__/googlePlacesFailure.test.ts \
  server/services/__tests__/googlePlacesService.test.ts \
  scripts/__tests__/guideStaticHtmlBuild.test.ts \
  scripts/__tests__/vercelHostingRoutes.test.ts \
  scripts/__tests__/hostedFrontendBuild.test.ts
```

New executable contracts:

- `server/__tests__/contract.guide-pilot-publication.test.ts` — the three pilot
  routes are indexable on their clean path, noindex with a query string, the
  guide sitemap lists exactly the published routes, the delivered documents
  carry no draft marker and no fabricated metric, and the static sitemap index
  matches the API index.
- `scripts/__tests__/guideStaticHtmlBuild.test.ts` — a real Vite build proves the
  three documents are emitted with the correct title, canonical, robots and
  structured data.
- `scripts/__tests__/vercelHostingRoutes.test.ts` — every guide route has an
  explicit hosting route ahead of the generic shell, the production sitemap
  proxy is intact, non-production stays `noindex`, and the production Git
  trigger is enabled.
- `server/services/__tests__/googlePlacesFailure.test.ts` — a Google Places
  failure is classified into billing, API-enablement, key-restriction, quota and
  availability causes instead of one ambiguous "invalid API key".

## Configuration and data findings

### Google Places

`REQUEST_DENIED` arrives as HTTP 403 for three different causes: billing not
enabled, the Places API not enabled for the project, and a rejected or
restricted key. The service reported all three as "Invalid API key", and the
autocomplete and geocode paths reported a non-OK provider status as an ordinary
empty result with no diagnostic at all.

`server/services/googlePlacesFailure.ts` now classifies the failure once and
every call site reports the same actionable reason. **The underlying
configuration is not changed by this packet and cannot be changed from the
repository**: enabling billing and the Places API for the project that owns
`GOOGLE_PLACES_API_KEY`, and reviewing the key's referrer and IP restrictions,
are provider-console actions outside this authority.

### Pilot suburb data sufficiency

The pilot suburb's live inventory, developments and agency affiliations were
**not** measured in this packet. The worktree's approved target is a disposable
local database with no running service and no canonical reference data, and no
protected or production target was accessed.

`scripts/verify-guide-pilot-data.ts` (`pnpm guide:pilot:verify`) is the
read-only check. It reads through the same services the public page uses, so the
reported counts are the counts a visitor sees, and it exits non-zero when the
pilot does not have enough live content to index. It must be run inside the
release window against the approved target.

The commercial sections are not hidden when they are empty. The suburb guide
already renders an honest empty state for both, with no invented figure, so
"no published developments" is stated rather than implied by an absent section.

## Frontend release step

`vercel.ts` now sets `git.deploymentEnabled.main: true`. The production Git
trigger is restored as the recorded frontend release step, and the production
deploy happens from the integration base at merge time.

This packet does **not** claim a deployment. No Vercel CLI, token or hosted
environment was available to this work, and no deployment artifact was produced
or verified here. The release step is the merge of the reviewed change to the
integration base; the deploy, the health checks and the production indexation
verification are separate steps in the attended window.

## Open items for the founder

1. **Copy sign-off** on the Gauteng and Johannesburg guides, and on the Region E
   context the Sandton pilot document reuses.
2. **Google Places configuration**: billing, Places API enablement and key
   restrictions for the production key.
3. **Pilot data sufficiency**: run `pnpm guide:pilot:verify` in the release
   window before submitting the guide sitemap.
4. **Search Console**: submit
   `https://www.propertylistifysa.co.za/sitemap-guides.xml` after the deploy.
   The submission requires the founder's Search Console account.
5. **Neutral place routes without a published guide** — for example
   `/gauteng/pretoria` — currently serve `index, follow` with the generic site
   title and are not in the guide sitemap. A place record alone is not a
   published article, so an explicit decision is required: noindex those routes,
   or author and publish a guide for each. This change does not make that
   decision.

## Unchanged

The paid-opening NO-GO, the B08–B18 execution dispositions, the release-boundary
conditions, the database authority model and every accepted scope are unchanged.
This packet is a frontend and guide-publication delivery. It authorises no paid
opening, no protected database release and no hosted execution.
