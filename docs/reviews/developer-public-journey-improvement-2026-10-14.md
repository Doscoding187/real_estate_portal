# Developer discovery and public project journey

Date: 14 October 2026
Feature branch: `feat/homepage-ux-review-20261013`
Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-homepage-ux-review-20261013`
Preview: http://localhost:3010
Before/after gallery: `/home/edwardspc/Desktop/Dev/review-artifacts/developer-journey-improvement-20261014/index.html`

## Result

Implemented the approved follow-up to `developer-homepage-journey-review-2026-10-14.md`. The homepage developer section now offers two understandable destinations: **View projects** opens the developer's published projects in the selected province, and **Developer profile** opens the profile with that province retained. Counts no longer masquerade as filters or repeat three times.

The section retains the existing carousel, logos, building icons and visual system. It has one provincial published-project count, quieter selling/launch information, a visible project-province selector, comfortable 44px primary/secondary actions and a regional directory link. Unavailable counts are not fabricated as zero. Disabled carousel arrows are hidden.

The directory supports project province alongside its existing name and brand-tier filters. A provincial match requires an eligible published project in that province; head-office location does not establish project location. Visitors can deliberately select All provinces. Clearing name/reach filters keeps the selected province. An unsupported URL province is an invalid state, not a national search.

The public profile now uses the existing vertical project-card component, sized for its grid, with readable project information and **View development**. There is no clipped Contact Agent button or rating-zero text appended to titles. Organisation verification and contact verification are separate supported facts; neither is converted into a featured claim. Prices come from mapped unit-type price facts; an unpriced rental remains Monthly rent on request rather than displaying a sale-like legacy project price. Missing or broken imagery has an honest placeholder.

Directory, profile and project requests distinguish loading, failed/retry, confirmed missing profiles and successful empty results. Empty provincial projects keep that scope until the visitor chooses another province or View all published projects. Directory and profile use server pagination with one-record lookahead, 24 profiles or 12 projects per displayed page, without inventing a catalogue total.

## Preserved rules and data authority

- Existing public publisher/profile authority and development eligibility remain the gates. Publication, moderation, supported transaction/type rules, publisher visibility, organisation approval, operator membership, paid Launch Access and supersession exclusions are unchanged.
- Homepage organic ranking remains qualifying project count, latest publication and brand name. No sponsored ranking, payment flow, private developer workspace, role permission or access rule changed.
- The API additions are optional exact-province filtering and page bounds on existing public read endpoints, plus distinct existing verification flags in the public profile DTO. The project service adds offset and a stable ID ordering tie-breaker. No browser filtering of a truncated national response is used to claim complete provincial results.
- Database-consumer authority, database policy and exceptions were reviewed before query changes. Canonical publisher → organisation and project → publisher relationships were used; no schema guessing or compatibility fallback was added.
- Browser checks used the already-owned disposable local demo database. Its authority status was ready, exact-owned and schema-congruent, with applied manifest head `0115_non_geographic_place_search_eligibility.sql`. That additional head contains unrelated place-eligibility data; touched publisher/project schema authority is unchanged. No schema, migration, seed, fixture or other database write was performed.
- The shared demo server on port 5000 and its data were preserved. Feature read endpoints are served by a separate GET-only local preview on 5010 through the existing review proxy, using the governed local scenario capability for the developer Launch Access product. It starts no application schedulers or delivery workers. Normal runtime release checks are unchanged. Other demo routes continue through the existing server.
- No push, merge, deployment or production change.

## Changed files

| Area | Files |
| --- | --- |
| Homepage | `client/src/components/TopDevelopers.tsx`, `client/src/pages/home/HomeDesktopView.tsx`, `client/src/pages/home/HomeMobileView.tsx` |
| Public directory/profile | `client/src/pages/DeveloperDirectoryPage.tsx`, `client/src/pages/DeveloperPublisherPage.tsx`, `client/src/components/development/DeveloperProvinceSelect.tsx` |
| Cards/images | `client/src/components/SimpleDevelopmentCard.tsx`, `client/src/components/FallbackImage.tsx`, `client/src/components/DevelopmentCard.tsx` |
| Scope contract | `shared/developerDiscovery.ts` |
| Existing public reads | `server/cataloguePublisherRouter.ts`, `server/developerRouter.ts`, `server/services/developerIdentityService.ts`, `server/services/developmentService.ts` |
| Validation | `client/src/components/TopDevelopers.test.tsx`, `client/src/pages/__tests__/DeveloperPublicJourney.test.tsx`, `shared/__tests__/developerDiscovery.test.ts`, `server/__tests__/developer.public-profile.contract.test.ts`, `server/services/__tests__/developerDirectoryProvince.test.ts` |
| Type baseline | `scripts/config/ts-nocheck-allowlist.txt`: removed this public profile page after restoring type checking |

## Validation

- 173 unique tests passed across 23 files: 23 focused client tests, 27 focused server/shared tests and 123 homepage/search/public-development/commercial regressions. After the final project-card readability adjustment, its 14 relevant client tests passed again.
- `pnpm check`, `pnpm build`, `pnpm lint:tsnocheck-baseline` and `git diff --check` passed. Changed client/shared files lint clean. Server lint completed with zero errors and existing-file warnings for broad typing/formatting; those large unrelated files were not reformatted. Build retains its large-chunk warning.
- Real browser journeys at 1440×1000, 390×844 and 320×844 passed: homepage → provincial projects → actual development detail, regional directory, explicit all-province selection and empty-province recovery. No page exceptions or horizontal overflow; project cards fit their content; homepage primary targets measured 44px.
- Additional browser checks passed for secondary profile navigation/back links, name/reach filtering and clearing, homepage province selection, directory/project loading, and directory/project/profile failures followed by successful retry. Failed requests did not render empty messages; scope persisted.
- Read-only real API checks passed for Gauteng project inclusion, Western Cape exclusion, offset exhaustion, invalid province/negative offset rejection and missing publisher rejection.
- Axe WCAG A/AA checks found zero violations in the homepage developer section at all three widths, and directory/profile content at 390px. Shared navigation was excluded from the downstream content check; this is scoped verification, not whole-site certification.
- Screenshots and machine-readable measurements, action/error/endpoint evidence and test logs are in the gallery folder above.

## Limits

The existing fictional demo has two qualifying developers in Gauteng, four public directory profiles nationally and no qualifying provincial projects elsewhere. It has missing logos and a broken project-image asset, so screenshots cannot establish final real-brand photography quality. No imagery, project prices, stock or counts were invented to improve the presentation.

Pagination beyond the small real demo catalogue is covered with local mocked response/contract tests; the real API also verifies offset exhaustion. Current developer discovery is explicitly provincial. This change does not imply city/suburb relevance, proximity ranking or silently expand a buyer's separate location search. More precise project discovery should use the governed geographic search workstream.
