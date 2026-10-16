# Province journeys and compact area table

Edward requested that already implemented property journeys be available from the province search panel, and that the oversized Johannesburg/Pretoria cards become a compact table. This follows the approved map hero and compact pill panel; their design remains intact.

## Result

All nine province configurations expose seven local choices: Buy, Rent, Developments, Explore areas, Land & plots, Commercial and Shared Living. The existing hosted journey-release manifest still governs hosted exposure. Specialist choices open their existing specialist destination using canonical location identities. Commercial means commercial leasing; Shared Living means rooms, cottages and small places to rent. Neither is presented as a residential search.

The compact table uses existing curated markets, small city thumbnails, short area context, genuine sale availability and an explicit Explore guide link. It opens city guides rather than directly sending readers into listings. A guide can remain available with no property stock. Unknown availability is labelled Inventory unavailable, separately from a known zero. Guide loading and unavailable states remain distinct, with the existing retry action for guide retrieval errors. No additional cities, prices, popularity rankings or listings have been fabricated. Existing province image fallback and the icon fallback remain available.

Desktop keeps Area, Get to know the area and Guide columns. Mobile keeps the image, city, availability and guide action together and hides the longer context column. Actual measured rows are approximately 85px desktop and 67px mobile. The retired large-card styles were removed.

## Land boundary

The previous shared first-cohort policy prevented both public entry and publishing. The user authorised public search activation during this UX review. `isLandPublicDiscoveryAvailable` now separates consumer entry from the unchanged `isLandVerticalAvailable` publication policy. Public `/plots-and-land` and `/land/:slug` mount their implemented pages with existing public navigation and footer. City-guide Land entry also hands off to the specialist search, preserving the canonical city identity; residential Buy filters do not acquire Land options.

Land authoring, review, public inventory release, payment, access and lead-custody rules remain unchanged. In particular, generic development feeds continue to exclude Land while its inventory release is contained. Existing server containment tests still pass. Opening this UI does not establish that Land inventory is commercially released; the current local Land search has no released stock. The bounded decision is recorded as a supplement to LRC-LAND-001 in the central launch register.

No schema, migration, runtime database query/service, seed or persisted fixture changes. Real-data browser verification used the existing disposable demo; authority status was ready, manifest-head-ready and schema-congruent. Exact target fingerprint: `536d822ba96d14486486fb53065a78e2935b9d65c7a23484c3b06f05b7dda890`. The read-only local review proxy rejects writes. The shared demo and its seeded data were preserved.

## Validation

- Focused client/server checks: 11 files, 80 tests passed, including specialist canonical handoffs, central Land classifications, mixed-authority rejection, retained server containment and table empty/error states. The nine province configuration cases additionally verified all seven active choices after the final assertion update.
- Real local Chromium checks: 1440, 1024, 390 and 320px; seven enabled choices, neutral initial state, all three specialist destinations preserving `province:3`, guide links, no overflow and no page exceptions. Scoped table axe WCAG A/AA found zero violations. This is not a full-page accessibility audit.
- Repository TypeScript check passed. Focused lint passed without warnings.
- Existing provincial browser suite: all 21 Chromium scenarios passed, covering Buy/Rent continuity, refresh/history, canonical sibling OR, keyboard use, mobile/tablet layout, sponsored separation and missing-reference-data containment.
- Production build passed; the existing large-chunk warning remains.

The first long browser-suite attempt lost the local Vite preview and failed with connection-refused errors. It was rerun against a restarted task-owned preview; this did not require any demo/data changes.

## Review and files

Preview: http://localhost:3010/gauteng

Before/after screenshots, all four viewports, specialist destinations and sanitized logs: `/home/edwardspc/Desktop/Dev/review-artifacts/province-journeys-area-table-20261014/index.html`. The before image is the preserved map-hero review screenshot containing the same pre-change city cards; the after image is the current task-owned preview.

Changed presentation and handoff files:

- `client/src/components/provincial/ProvinceAreaTable.tsx` and its tests; `ProvincialComposer.tsx` and its tests.
- `client/src/pages/ProvincePage.tsx`; `client/src/styles/provincial-discovery.css`.
- `client/src/components/land/LandPublicLayout.tsx`; `client/src/App.tsx`.
- `client/src/components/location/LocationHeroSection.tsx`, its Rent/Land test and `LocationTrendingFeedSection.tsx`.
- `client/src/lib/provincialSearchHandoff.ts`, `publicNavigation.ts`, the consumer-router comment and affected client contract tests.
- `shared/provincialDiscovery.ts`; `shared/landLaunchPolicy.ts`.
- `e2e/provincial-discovery.spec.ts`; the central launch-register supplement and this report.

Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-homepage-ux-review-20261013`.
Branch: `feat/homepage-ux-review-20261013`; successor to `90d46bcef`.

Local review only. No push, merge, deployment, protected target access or production changes. Curated market coverage varies by province; this change does not populate missing geography or manufacture inventory. Existing cities and source availability govern what appears.
