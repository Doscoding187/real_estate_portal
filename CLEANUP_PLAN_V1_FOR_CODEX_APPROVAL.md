# Codebase Cleanup Plan - For Codex Approval

## Executive Summary

This plan identifies **high-impact, low-risk cleanup tasks** to reduce technical debt and improve code maintainability. The work is designed to be executed in a clean worktree (not on main) and submitted for review.

**Estimated Impact:** Removes ~100 files of dead code/docs, consolidates 3 overlapping services, fixes 2 broken routers.

---

## Phase 1: Root Directory Cleanup (Safe, High Impact)

### 1.1 Delete Build Artifacts
Remove files that should be in `.gitignore` or are no longer needed:
- `lint-output.txt`
- `tsc.out.txt`
- `tsc.after-rootfix.txt`
- `tsc.phaseC.txt`
- `verify_stats.ts`

### 1.2 Archive Task Completion Notes
Move ~80 root-level `.md` files to `docs/history/` or delete them. These are task artifacts, not active documentation:

**Categories:**
- `ADVERTISE_*` (17 files)
- `TASK_*_COMPLETE.md` (14 files)
- `FIX_*.md` (6 files)
- `EXPLORE_*` (10+ files)
- `PHASE*` (3 files)
- `DASHBOARD_*` (4 files)
- `DOMAIN_*` (4 files)
- `REDIS_*` (5 files)
- `database-*` (8 files)
- Other one-off notes (~20 files)

**Action:** Create `docs/history/` and move all files there, OR delete if content is captured in git history.

---

## Phase 2: Dead Code Removal (Medium Risk)

### 2.1 Delete Stubbed/Disabled Server Files
Remove files that are entirely stubs or commented out of the router tree:

| File | Reason |
|------|--------|
| `server/boostCampaignRouter.ts` | Commented out in `routers.ts` |
| `server/services/boostCampaignService.ts` | Entirely stubbed, only used by above |
| `server/campaignBoost.ts` | Uses `as any`, always returns 0 |
| `server/revenueCenterSync.ts` | Uses `as any`, broken imports |

### 2.2 Delete Example Files
Remove large example files that add noise:
- `server/services/qualityScoringService.example.ts` (330 lines)
- `server/services/leadGenerationService.example.ts` (391 lines)

### 2.3 Fix or Remove marketingRouter.ts
The router has an empty import and broken schema references. Either:
- Fix the import if the schema exists
- Remove the router from `routers.ts` if not needed

---

## Phase 3: Documentation Consolidation (Low Risk)

### 3.1 Move QUICK_REFERENCE Files
Move ~16 `QUICK_REFERENCE.md` files from source directories to `docs/`:

**From `server/services/`:**
- `qualityScoringService.QUICK_REFERENCE.md`
- `leadGenerationService.QUICK_REFERENCE.md`
- `feedRankingService.QUICK_REFERENCE.md`
- `partnerAnalyticsService.QUICK_REFERENCE.md`
- `partnerSubscriptionService.QUICK_REFERENCE.md`
- `partnerBoostCampaignService.QUICK_REFERENCE.md`
- `contentBadgeService.QUICK_REFERENCE.md`

**From `client/src/`:**
- `components/advertise/REDUCED_MOTION_QUICK_REFERENCE.md`
- `components/advertise/ERROR_HANDLING_QUICK_REFERENCE.md`
- `components/advertise/SEO_QUICK_REFERENCE.md`
- `lib/testing/BROWSER_ISSUES_QUICK_REFERENCE.md`
- `lib/testing/CROSS_DEVICE_TESTING_QUICK_REFERENCE.md`
- `lib/testing/QA_QUICK_REFERENCE.md`
- `lib/testing/VISUAL_DOCS_QUICK_REFERENCE.md`
- `lib/testing/PERFORMANCE_QUICK_REFERENCE.md`
- `lib/accessibility/QUICK_REFERENCE.md`

---

## Phase 4: Test Cleanup (Low Risk)

### 4.1 Delete Legacy Skipped Tests
Remove 5 test files that are entirely skipped with `describe.skip` and marked as `[LEGACY]`:

- `server/services/__tests__/exploreAgencyService.test.ts`
- `server/services/__tests__/exploreAgencyAttribution.integration.test.ts`
- `server/services/__tests__/exploreShorts.schema.test.ts`
- `server/services/__tests__/exploreAgencyAttribution.test.ts`
- `server/services/__tests__/trendingSuburbs.property.test.ts`

### 4.2 Delete Fully Skipped E2E Test
- `e2e/routing/nav-seo-architecture.spec.ts` (6 `test.skip` calls, every test skipped)

---

## Phase 5: Service Consolidation (Medium Risk, Requires Review)

### 5.1 Consolidate Location Services
Three overlapping files exist:
1. `server/services/locationPagesService.ts` (base, 603 lines, used by production)
2. `server/services/locationPagesService.improved.ts` (13 TypeScript errors, excluded from tsconfig)
3. `server/services/locationPagesServiceEnhanced.ts` (Google Places variant, only used in tests)

**Recommended Action:**
- Merge useful code from `.improved.ts` into base service
- Integrate Google Places logic from `Enhanced.ts` if needed
- Delete the other two files
- Update imports in `locationPagesRouter.ts`

**Note:** This requires careful review due to compilation errors in `.improved.ts`.

---

## Success Criteria

After execution, verify:
1. `pnpm type-check` passes (no new errors)
2. `pnpm lint:check` passes
3. `pnpm test` passes (no test failures from deleted files)
4. Root directory has <20 `.md` files (down from 80+)
5. No dead imports or unused exports

---

## What This Does NOT Do

- Does not implement any TODO stubs (those are feature work)
- Does not modify production behavior
- Does not change database schema
- Does not affect deployed code (cleanup only)

---

## Request for Codex Review

Please review this plan and:
1. Approve or modify the scope
2. Identify any files I may have missed that should be cleaned
3. Flag any files you want to preserve (even if they appear unused)
4. Confirm the worktree approach (create `codex/cleanup-<date>` branch)

Once approved, I will execute in a clean worktree and submit a PR for final review.
