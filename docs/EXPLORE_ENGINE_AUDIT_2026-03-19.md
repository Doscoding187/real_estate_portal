# Explore Engine Audit

Date: 2026-03-19
Audit branch: `audit/explore-engine-2026-03-19`
Audit worktree: `C:\dev\real_estate_portal_explore_audit`
Source of truth inspected: active working tree at `C:\dev\real_estate_portal`

## Scope

This audit covered:

- Explore entry surfaces and routing
- Feed data flow from UI to tRPC to service layer
- Ranking, trust, monetization, and cache behavior
- Explore filters, intent propagation, and engagement tracking
- UI/UX consistency across home, feed, shorts, and discovery views
- Existing test coverage around explore-specific behavior

## Executive Summary

The Explore engine is not one engine yet. It is a set of overlapping implementations:

- `/explore/home` is a newer discovery home with intent rails
- `/explore/feed` is a custom vertical feed with its own playback and analytics wiring
- `/explore/shorts` uses the newer feature-layer `TrpcFeedProvider`
- `ExploreDiscovery.tsx` exists as another feed surface but is not routed

The biggest problem is not visual polish. It is that the live experience is fragmented, so filters, interactions, analytics, and ranking behavior are inconsistent depending on which surface the user lands on.

## Priority Findings

### P0. The live explore experience is split across multiple feed stacks

Evidence:

- `client/src/App.tsx` routes `/explore/home`, `/explore/feed`, and `/explore/shorts`
- `client/src/pages/ExploreFeed.tsx` implements its own feed rendering and interaction flow
- `client/src/pages/ExploreShorts.tsx` uses `TrpcFeedProvider`
- `client/src/pages/ExploreDiscovery.tsx` is another full feed page but is not routed

Impact:

- There is no single canonical playback, analytics, save/share/like, or filter contract
- New fixes can land in one surface while the production route keeps old behavior
- UI and ranking changes are expensive because they must be replicated across multiple stacks

Recommendation:

- Make one feed stack canonical
- Keep `TrpcFeedProvider` + `features/explore/components/video-feed/*`
- Retire or redirect the custom `/explore/feed` implementation after parity is reached
- Remove or explicitly archive `ExploreDiscovery.tsx` if it is no longer part of the product plan

### P0. Filters on `/explore/feed` are effectively disconnected from the live query

Evidence:

- `client/src/pages/ExploreFeed.tsx` gets `filterActions` from `useExploreCommonState`
- `client/src/hooks/useExploreCommonState.ts` uses `usePropertyFilters`
- `client/src/components/explore-discovery/ResponsiveFilterPanel.tsx` renders `FilterPanel` / `MobileFilterBottomSheet`
- `client/src/components/explore-discovery/FilterPanel.tsx` and `client/src/components/explore-discovery/MobileFilterBottomSheet.tsx` both mutate `useExploreFiltersStore`
- `client/src/pages/ExploreFeed.tsx` only sends `feedType`, hard-coded area/category fallbacks, intent, and creator seed into `trpc.explore.getFeed`

Impact:

- Filter badge count on `/explore/feed` reads one store while the panel edits another
- Applying filters does not change the backend query
- The page gives users an interactive filter UI that does not actually filter results

Recommendation:

- Replace `usePropertyFilters` with `useExploreFiltersStore` on all live explore surfaces
- Build a single mapper from filter store -> `trpc.explore.getFeed` input
- Apply filters server-side for the video feed, not only via local client filtering

### P0. Area/category feed controls are misleading because the search state is not exposed in the UI

Evidence:

- `client/src/pages/ExploreFeed.tsx` keeps `searchQuery` in local state
- No search input is rendered on the page
- When `feedType === 'area'`, the query falls back to `'gauteng'`
- When `feedType === 'category'`, the query falls back to `'property'`

Impact:

- The user can switch tabs and believe they are viewing local or category-specific content
- In practice, the route silently uses hard-coded defaults unless query params already exist

Recommendation:

- Add an explicit control for area/category targeting, or remove those tabs until the input exists
- Prefer URL-driven query params so state is visible and shareable

### P0. Engagement controls in the live feed are miswired

Evidence:

- `client/src/components/explore/VideoCard.tsx` uses `trpc.video.toggleLike`
- `server/videoRouter.ts` throws `"Video features are temporarily disabled: schema mismatch"` for `toggleLike`
- `client/src/pages/ExploreFeed.tsx` maps `likes` to `item.stats.saves`
- `/explore/feed` records only `view` from the page shell; share/save/like are not consistently routed through explore analytics

Impact:

- The heart action is not functional for logged-in users
- The visible count under the heart is not a like count
- Interaction data from the live feed is incomplete and inconsistent

Recommendation:

- Stop using `videoRouter` for Explore
- Move all live feed engagement to `trpc.explore.recordInteraction`, `saveProperty`, and `shareProperty`
- Expose correct per-action counts from the Explore feed contract

### P1. Recommendation caching can leak across creator- or geo-scoped feeds

Evidence:

- `server/services/exploreFeedService.ts` uses `CacheKeys.recommendedFeed(userId, limit, offset)`
- `server/lib/cache.ts` only keys recommended feed by user, limit, and offset
- `getRecommendedFeed` disables cache for `intent`, `location`, `seed`, `seenIds`, and debug mode
- `creatorActorId`, `locationType`, and `locationId` are not part of the cache gate or cache key

Impact:

- Production cache can serve the wrong recommended feed when creator seed or geo dominance context changes without changing the user/offset tuple
- Debugging recommendation quality becomes harder because cache contamination looks like ranking drift

Recommendation:

- Extend the cache gate and key to include every ranking-relevant input
- Short term: disable caching for any request with `creatorActorId`, `locationType`, or `locationId`

### P1. The documented ranking service is not the runtime ranking path

Evidence:

- `server/services/feedRankingService.ts` defines `rankFeedItems`, `ensureBoostLimit`, and weighted ranking utilities
- Runtime search showed no production call sites for `rankFeedItems` or `ensureBoostLimit`
- `server/services/exploreFeedService.ts` manually orders recommended content in SQL, then applies trust/diversity/geo adjustments afterward

Impact:

- Ranking logic is split between SQL order clauses, trust scoring, geo monetization, and an effectively unused ranking service
- Documentation overstates what is actually in use
- Optimization work risks landing in the wrong layer

Recommendation:

- Choose one ranking pipeline
- Either delete the unused service or move recommended-feed scoring into it
- Keep trust, monetization guardrails, and intent scoring inside the same ranking pass

### P1. `intentFocus` and `intentSubFocus` are used as a post-filter, not a true retrieval/ranking signal

Evidence:

- `server/services/exploreFeedService.ts` applies `applySectionPurity(...)` after the feed has already been assembled and trust-ranked
- If nothing matches, the result can be emptied with `shortfallReason: 'no_matching_content'`

Impact:

- Explore home rails can look broken even when the catalog has content
- Relevance is enforced late, which wastes query budget and causes thin sections

Recommendation:

- Use `intentFocus` and `intentSubFocus` to constrain candidate retrieval and boost ranking upstream
- Keep section-purity as a guardrail, not the primary matching mechanism

### P1. The "lifestyle" taxonomy is not lifestyle-based

Evidence:

- `client/src/components/explore-discovery/LifestyleCategorySelector.tsx` loads categories from `trpc.explore.getCategories`
- `server/services/exploreFeedService.ts` returns only canonical categories: `property`, `renovation`, `finance`, `investment`, `services`
- The explore-discovery spec calls for lifestyle-oriented categories such as Secure Estates, Luxury, Family Living, Student Living, Urban Living, Pet-Friendly, and Retirement

Impact:

- UI language promises lifestyle discovery, but the data model exposes only internal content buckets
- Home and discovery taxonomy are misaligned

Recommendation:

- Introduce a real lifestyle taxonomy
- Separate content domain/category from user-facing lifestyle collections

### P1. `useDiscoveryFeed` is partly dead abstraction

Evidence:

- `client/src/hooks/useDiscoveryFeed.ts` accepts `categoryId` but never uses it in the feed query
- It switches to `trpc.properties.search` when filters are active, which changes the content model from mixed discovery content to property search results
- `ExploreDiscovery.tsx` is not routed, so this abstraction is not the primary user path

Impact:

- The API surface suggests mixed-content discovery blocks, but the runtime behavior collapses into either recommended feed or plain property search
- More dead weight to maintain

Recommendation:

- Decide whether discovery cards remain a real product surface
- If yes, give it a dedicated backend contract
- If no, remove the unused abstraction and archive the page

### P2. Test coverage is concentrated on stores and compatibility layers, not live explore behavior

Verified tests:

- `client/src/hooks/__tests__/useFilterUrlSync.test.ts`
- `client/src/hooks/__tests__/useExploreCommonState.test.ts`
- `server/services/__tests__/exploreFeedLegacyAliasSwitch.test.ts`

Observed gap:

- No direct page-level tests for `/explore/home`, `/explore/feed`, or `/explore/shorts`
- No test asserting that filter UI changes the actual feed query
- No test asserting the live like/share/save actions use the Explore router

Impact:

- The exact regressions identified above can ship without failing CI

Recommendation:

- Add integration tests around the live routes, not only hooks
- Prioritize query wiring, interaction wiring, and route parity

## UI/UX Audit Notes

What is working:

- `ExploreHome.tsx` is directionally better than the legacy feed pages
- The home page has a clearer editorial model: rails, creator spotlight, intent chips
- Motion and card polish are ahead of the backend/data model maturity

What is not working:

- The jump from `/explore/home` to `/explore/feed` feels like dropping into a different product
- Feed controls imply precision and personalization that the page does not actually deliver
- Taxonomy is inconsistent: "lifestyle", "category", "type", "intent", and "trending" mean different things in different places
- Users are exposed to interaction controls that are partially non-functional

UX direction:

- Keep the editorial richness of `ExploreHome`
- Collapse feed playback onto one visual system
- Make every active control truthfully represent live system behavior
- Do not expose advanced controls until query plumbing is complete

## Recommended Optimization Sequence

### Phase 1: Stabilize the live path

1. Make `/explore/feed` use the same provider stack as `/explore/shorts`
2. Rewire likes, saves, shares, and outcomes to the Explore router only
3. Remove hard-coded area/category defaults or add visible inputs
4. Connect filter UI to one store and one backend query contract

### Phase 2: Unify ranking and discovery semantics

1. Consolidate ranking into a single runtime pipeline
2. Fix recommended-feed cache scoping
3. Move intent focus/subfocus into candidate retrieval and ranking
4. Separate internal content categories from user-facing lifestyle collections

### Phase 3: Reduce product surface duplication

1. Pick one canonical vertical feed surface
2. Redirect or retire legacy pages that duplicate that surface
3. Delete dead hooks/pages after migration
4. Add route-level tests that lock the new architecture in place

## Suggested Backlog

### Immediate

- Replace `VideoCard` like action with Explore-native interaction handling
- Replace `usePropertyFilters` usage on `/explore/feed`
- Map `useExploreFiltersStore` into the actual `trpc.explore.getFeed` input
- Disable recommended-feed cache when `creatorActorId` or geo context is present

### Next

- Introduce a single `ExploreFeedQueryInput` mapper shared by home/feed/shorts
- Add real area/category selectors
- Add a page-level test for filter-to-query wiring
- Add a page-level test for like/share/save behavior

### Later

- Replace canonical categories with true lifestyle collections
- Fold `ExploreDiscovery` into the chosen canonical surface or remove it
- Remove unused ranking APIs or wire them into production

## Verification Run

Executed:

```bash
pnpm vitest run client/src/hooks/__tests__/useFilterUrlSync.test.ts client/src/hooks/__tests__/useExploreCommonState.test.ts server/services/__tests__/exploreFeedLegacyAliasSwitch.test.ts
```

Result:

- Passed: 37 tests across 3 files
- Note: `useFilterUrlSync` tests emitted React `act(...)` warnings
- Note: the server compatibility test triggers full SQL migration setup, which is slow for a narrow explore check

## Bottom Line

The highest-value optimization is not a new animation pass. It is to collapse Explore onto one canonical feed implementation, one filter store, one interaction contract, and one ranking pipeline. Until that happens, backend tuning and UI polish will keep producing localized improvements while the live discovery experience remains internally inconsistent.
