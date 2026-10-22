# Root Markdown Disposition Manifest

**Worktree:** `codex/cleanup-2026-09-03` at `153b7cee`
**Date:** 2026-09-03
**Total files:** 137

---

## RETAIN (20 files)

These files are referenced by code, `docs/`, or authority material. Keep in root.

| File | Referenced By |
|------|--------------|
| `AGENTS.md` | `docs/architecture/`, `server/__tests__/contract.*.test.ts` |
| `README.md` | `docs/database-authority/`, `client/src/lib/testing/` |
| `DATABASE_MANAGEMENT_OPTIONS.md` | `docs/database-authority/migration-tree-authority.json` |
| `DATABASE_SETUP_GUIDE.md` | `docs/database-authority/migration-tree-authority.json` |
| `MIGRATION_GUIDE.md` | `docs/database-authority/migration-tree-authority.json` |
| `DEPLOYMENT.md` | `server/__tests__/database-security-containment.contract.test.ts` |
| `ROADMAP.md` | `database-gap-3-disposition-and-implementation-plan-s3c1.md` |
| `database-gap-3-disposition-and-implementation-plan-s3c1.md` | `docs/database-authority/migration-tree-authority.json` |
| `database-gap-3-slice-2-diagnostics-data-repair-authority-audit-s3c3.md` | `docs/database-authority/migration-tree-authority.json` |
| `database-manual-utility-authority-audit-s3c1.md` | `docs/database-authority/migration-tree-authority.json` |
| `database-migration-tree-authority-audit-s3b2.md` | `docs/database-authority/migration-tree-authority.json` |
| `database-migration-tree-semantic-reconciliation-s3b2.md` | `docs/database-authority/migration-tree-authority.json` |
| `database-temporary-legacy-sql-reconciliation-s3c1.md` | `docs/database-authority/migration-tree-authority.json` |
| `EXPLORE_QUICK_REFERENCE.md` | `docs/database-authority/migration-tree-authority.json` |
| `EXPLORE_UPLOAD_READY.md` | `docs/database-authority/migration-tree-authority.json` |
| `FINAL_CHECKLIST.md` | `docs/database-authority/migration-tree-authority.json` |
| `IMPLEMENTATION_STATUS.md` | `docs/database-authority/migration-tree-authority.json` |
| `UNIT_TYPES_DELIVERY_SUMMARY.md` | `docs/database-authority/migration-tree-authority.json` |
| `UNIT_TYPES_INTEGRATION_GUIDE.md` | `docs/database-authority/migration-tree-authority.json` |
| `RAILWAY_EXPLORE_SETUP.md` | `docs/database-authority/`, `database-migration-tree-*` |

---

## ARCHIVE to `docs/history/` (36 files)

These files are only referenced by other root `.md` files (mutual cross-references). Move to `docs/history/` preserving structure.

### ADVERTISE cluster (10 files)
| File |
|------|
| `ADVERTISE_FIX_COMMIT_MESSAGE.md` |
| `ADVERTISE_FIX_SUMMARY.md` |
| `ADVERTISE_LAYOUT_FIX_EXPERT_REFERENCE.md` |
| `ADVERTISE_PAGE_FIX_COMPLETE.md` |
| `ADVERTISE_PAGE_QUICK_TEST.md` |
| `ADVERTISE_PAGE_RUNTIME_FIX.md` |
| `ADVERTISE_WITH_US_CODE_REPORT.md` |
| `ADVERTISE_WITH_US_READY_FOR_TESTING.md` |
| `ADVERTISE_WITH_US_TROUBLESHOOTING.md` |
| `COMMIT_MESSAGE.md` |

### DASHBOARD cluster (3 files)
| File |
|------|
| `DASHBOARD_INTEGRATION_REPORT.md` |
| `DASHBOARD_MIGRATION_PLAN.md` |
| `DASHBOARD_TECHNICAL_SPEC.md` |

### DOMAIN cluster (3 files)
| File |
|------|
| `DOMAIN_SETUP_CHECKLIST.md` |
| `DOMAIN_SETUP_COMMANDS.md` |
| `DOMAIN_SETUP_GUIDE.md` |

### EXPLORE cluster (7 files)
| File |
|------|
| `EXPLORE_ANALYTICS_QUICK_REFERENCE.md` |
| `EXPLORE_API_ENDPOINTS_COMPLETE.md` |
| `EXPLORE_API_QUICK_REFERENCE.md` |
| `EXPLORE_FILTERING_QUICK_REFERENCE.md` |
| `EXPLORE_MUTATION_ERROR_FIX.md` |
| `EXPLORE_FEATURE_IMPLEMENTATION_REPORT.md` |
| `WHAT_YOU_HAVE_NOW.md` |

### REDIS cluster (5 files)
| File |
|------|
| `REDIS_CACHE_INTEGRATION_EXAMPLES.md` |
| `REDIS_CACHING_DESIGN.md` |
| `REDIS_DEPENDENCIES.md` |
| `REDIS_DEPLOYMENT_MIGRATION_GUIDE.md` |
| `REDIS_PERFORMANCE_COMPARISON.md` |

### TASK cluster (4 files)
| File |
|------|
| `TASK_13_IMPLEMENTATION_SUMMARY.md` |
| `TASK_13_QUICK_REFERENCE.md` |
| `TASK_13_SAVE_FOLLOW_COMPLETE.md` |
| `TASK_16_PERSONALIZED_CONTENT_SECTIONS_COMPLETE.md` |
| `TASK_16_QUICK_REFERENCE.md` |

### Other cross-referenced (4 files)
| File |
|------|
| `DEVELOPER_PROFILE_FIX.md` |
| `EXPLORE_DISCOVERY_CARD_FEED_COMPLETE.md` |
| `EXPLORE_LIFESTYLE_CATEGORIES_COMPLETE.md` |
| `WIZARD_V2_IMPLEMENTATION_CHECKLIST.md` |

---

## DELETE (81 files)

These files have zero references from any other file in the codebase. Safe to delete.

### ADVERTISE (7 files)
- `ADVERTISE_COMMIT_MESSAGE.md`
- `ADVERTISE_CSS_LEAKAGE_FIX.md`
- `ADVERTISE_CSS_SCOPING_FIX.md`
- `ADVERTISE_FIX_CHECKLIST.md`
- `ADVERTISE_LAYOUT_FIX_CODE_REFERENCE.md`
- `ADVERTISE_PAGE_FIX_COMPLETE_2024_12_11.md`
- `ADVERTISE_PAGE_IMPORT_FIX.md`
- `ADVERTISE_WITH_US_LAYOUT_FIXES_SUMMARY.md`

### TASK (13 files)
- `AGENT_DASHBOARD_OPTIMIZATION_COMPLETE.md`
- `TASK_10_DYNAMIC_FILTERING_COMPLETE.md`
- `TASK_11_BOOST_CAMPAIGNS_COMPLETE.md`
- `TASK_12_USER_ENGAGEMENT_TRACKING_COMPLETE.md`
- `TASK_14_SIMILAR_PROPERTIES_COMPLETE.md`
- `TASK_15_ADMIN_DASHBOARD_INTEGRATION_COMPLETE.md`
- `TASK_17_PERFORMANCE_OPTIMIZATION_COMPLETE.md`
- `TASK_17_PERFORMANCE_OPTIMIZATION_GUIDE.md`
- `TASK_17_REACT_QUERY_OPTIMIZATION_COMPLETE.md`
- `TASK_18_ACCESSIBILITY_FEATURES_COMPLETE.md`
- `TASK_2_STATE_MANAGEMENT_COMPLETE.md`
- `TASK_6_COMPLETE_SUMMARY.md`
- `TASK_8_COMPLETE_SUMMARY.md`
- `TASK_9_NEIGHBOURHOOD_DETAIL_COMPLETE.md`

### FIX (6 files)
- `AUTHENTICATION_FIX_REPORT.md`
- `AWS_IMAGE_UPLOAD_FIX.md`
- `DEVELOPER_PROFILE_FIX.md` (note: only referenced by ISSUE_RESOLVED.md which is also unreferenced)
- `FIXED_ERRORS.md`
- `FIX_KPI_QUERY.md`
- `LOGIN_FIX_PROMPT.md`
- `LOGIN_FIX_SUMMARY.md`
- `LOGIN_JSON_ERROR_HANDLING_FIX.md`
- `ROUTING_FIX_SUMMARY.md`
- `TITLE_FIX.md`

### EXPLORE (9 files)
- `EXPLORE_COLUMN_NAME_FIX.md`
- `EXPLORE_DASHBOARD_INTEGRATION_QUICK_REFERENCE.md`
- `EXPLORE_FEATURE_CODEBASE_DOCUMENTATION.md`
- `EXPLORE_MAP_HYBRID_VIEW_COMPLETE.md`
- `EXPLORE_PERSONALIZED_HOME_SUMMARY.md`
- `EXPLORE_PLACEHOLDER_CONTENT_READY.md`
- `EXPLORE_RECOMMENDATION_ENGINE_COMPLETE.md`
- `EXPLORE_STRATEGIC_INTENT.md`
- `EXPLORE_VIDEO_FEED_COMPLETE.md`
- `EXPLORE_VIDEO_UPLOAD_COMPLETE.md`

### PHASE (3 files)
- `PHASE1_COMPLETE.md`
- `PHASE9_GOOGLE_MAPS_INTEGRATION_COMPLETE.md`
- `PHASE9_GOOGLE_MAPS_INTEGRATION_PLAN.md`
- `PHASE10_PROPERTY_PRICE_INSIGHTS_COMPLETE.md`

### DEVELOPMENT (4 files)
- `DEVELOPMENT_STATUS_REPORT.md`
- `DEVELOPMENT_WIZARD_FIXES_COMPLETE.md`
- `DEVELOPMENT_WIZARD_SPEC_UPDATE_COMPLETE.md`
- `DEVELOPMENT_WIZARD_V3_SPEC_COMPLETE.md`

### Other (19 files)
- `BASELINE.md`
- `CITY_PAGE_COMPONENT_BREAKDOWN.md`
- `CLEANUP_REPORT.md`
- `COMPONENT_ARCHITECTURE.md`
- `COMPREHENSIVE_TASK_DOCUMENTATION.md`
- `DEMO_GATE_SUPER_ADMIN.md`
- `DOMAIN_SETUP_NEXT_STEPS.md`
- `FRONTEND_ARCHITECTURE.md`
- `IMPLEMENTATION_PLAN.md`
- `IMPLEMENTATION_TODO_LIST.md`
- `ISSUE_RESOLVED.md`
- `LOCATION_AUTO_POPULATION_GUIDE.md`
- `LOCATION_PAGES_EMPTY_STATE_COMPLETE.md`
- `PRE_PUSH_SUMMARY.md`
- `PROPERTY_DEVELOPER_DASHBOARD_EXPORT.md`
- `PUBLISHER_UI_IMPROVEMENT_COMPLETE.md`
- `QUICK_START_GUIDE.md`
- `README_UPDATE.md`
- `REAL_ESTATE_PORTAL_ANALYSIS.md`
- `REDIS_IMPLEMENTATION_SUMMARY.md`
- `search_architecture_rules.md`
- `search_logic_documentation.md`
- `SUPER_ADMIN_DASHBOARD_REPORT.md`
- `TROUBLESHOOTING_SERVER.md`
- `UPDATE_TITLE_GUIDE.md`
- `WIZARD_V2_EXECUTIVE_SUMMARY.md`

---

## QUICK_REFERENCE FILES (16 files in source directories)

### RETAIN (7 files in `server/services/`)
These are referenced by other docs/code and have relative links. Keep in place.

| File | Relative Links | Referenced By |
|------|---------------|---------------|
| `server/services/qualityScoringService.QUICK_REFERENCE.md` | `../../docs/database-authority/`, `../migrations/README.md` | `server/services/__tests__/` |
| `server/services/feedRankingService.QUICK_REFERENCE.md` | `./contentHierarchyEngine` | `docs/` |
| `server/services/partnerAnalyticsService.QUICK_REFERENCE.md` | None | `docs/` |
| `server/services/partnerSubscriptionService.QUICK_REFERENCE.md` | None | `docs/` |
| `server/services/partnerBoostCampaignService.QUICK_REFERENCE.md` | None | `docs/` |
| `server/services/contentBadgeService.QUICK_REFERENCE.md` | None | `docs/` |
| `server/services/leadGenerationService.QUICK_REFERENCE.md` | None | `docs/` |

### RETAIN (6 files in `client/src/lib/testing/`)
These are referenced by other testing docs. Keep in place.

| File | Relative Links | Referenced By |
|------|---------------|---------------|
| `client/src/lib/testing/BROWSER_ISSUES_QUICK_REFERENCE.md` | None | `client/src/lib/testing/README.md` |
| `client/src/lib/testing/CROSS_DEVICE_TESTING_QUICK_REFERENCE.md` | `./CROSS_DEVICE_TEST_RESULTS.md`, `./CROSS_BROWSER_TEST_RESULTS.md`, `./BROWSER_COMPATIBILITY_MATRIX.md` | `client/src/lib/testing/README.md` |
| `client/src/lib/testing/PERFORMANCE_QUICK_REFERENCE.md` | None | `client/src/lib/testing/README.md` |
| `client/src/lib/testing/QA_QUICK_REFERENCE.md` | None | `client/src/lib/testing/README.md` |
| `client/src/lib/testing/VISUAL_DOCS_QUICK_REFERENCE.md` | `./capture-visual-docs.sh` | `client/src/lib/testing/README.md` |

### RETAIN (3 files in `client/src/components/advertise/`)
These are referenced by other advertise docs. Keep in place.

| File | Relative Links | Referenced By |
|------|---------------|---------------|
| `client/src/components/advertise/SEO_QUICK_REFERENCE.md` | None | `client/src/components/advertise/` |
| `client/src/components/advertise/ERROR_HANDLING_QUICK_REFERENCE.md` | None | `client/src/components/advertise/` |
| `client/src/components/advertise/REDUCED_MOTION_QUICK_REFERENCE.md` | `./REDUCED_MOTION_GUIDE.md`, `../../pages/ReducedMotionDemo.tsx`, `./__tests__/ReducedMotion.test.tsx` | `client/src/components/advertise/` |

### RETAIN (1 file in `client/src/lib/accessibility/`)
Keep in place - relative links to sibling files.

| File | Relative Links | Referenced By |
|------|---------------|---------------|
| `client/src/lib/accessibility/QUICK_REFERENCE.md` | `./COLOR_CONTRAST_COMPLIANCE.md`, `./COLOR_CONTRAST_AUDIT_REPORT.md` | None (but has useful relative links) |

**Decision:** All QUICK_REFERENCE files should RETAIN in current locations. Moving them would break relative links and documentation navigation. This matches Codex guidance.

---

## NOTES

1. **`database-bundle-attribution-reachability-audit-s3b2.md`** and **`database-residual-utility-rooted-authority-audit-s3c6.md`** are referenced only by `docs/database-authority/migration-tree-authority.json` — classified as RETAIN.

2. **`LOCATION_AUTO_POPULATION_COMPLETE.md`** is referenced by `docs/architecture/location-geography-global-coverage-strategy-handoff.md` — classified as RETAIN.

3. **`EXPLORE_FRONTEND_REFACTOR.md`** is referenced by `client/src/lib/testing/PR_TEMPLATE_WITH_VISUALS.md` — classified as ARCHIVE (only referenced by another non-authority doc).

4. **`ISSUE_RESOLVED.md`** references `DEVELOPER_PROFILE_FIX.md` but both are unreferenced elsewhere — both DELETE.

5. Files in ARCHIVE category should be moved to `docs/history/` with subdirectory structure matching their cluster (e.g., `docs/history/advertise/`, `docs/history/explore/`).

---

## OUT OF SCOPE (Per Codex Guidance)

### Marketing/Boost (Separate Workstream)
- `server/marketingRouter.ts` — Live, registered in `routers.ts:155`, called by `client/src/pages/admin/MarketingCampaignsPage.tsx:44`
- `server/campaignBoost.ts` — Dynamically imported by `server/db.ts:1043`, used by search code
- `server/boostCampaignRouter.ts` — Commented out but has UI callers in `client/src/components/explore-analytics/BoostCampaignManager.tsx:29`
- `server/revenueCenterSync.ts` — Uses `as any` placeholders, imported by `marketingRouter.ts`

**Action Required:** Decommission or implementation decision needed. Not part of this cleanup.

### Location/Geography (Separate Authority Audit)
- `server/services/locationPagesService.ts` — Base service (603 lines), used by production
- `server/services/locationPagesService.improved.ts` — Has 13 TypeScript errors, excluded from tsconfig, imported by `locationPagesRouter.ts`
- `server/services/locationPagesServiceEnhanced.ts` — Google Places variant, used in tests
- `server/services/locationPagesService.backup.ts` — Fourth variant discovered by Codex

**Action Required:** Database authority check needed. Current local database is unreachable/quarantined. Cannot validate.

### Database Legacy Tests (Authority Decision)
- 5 skipped test files marked `[LEGACY]` — need retirement decision, not blanket deletion
- 1 E2E file (`nav-seo-architecture.spec.ts`) — has active test at line 10, not fully skipped

**Action Required:** Authority/retirement decision per database governance policy.

---

## VERIFICATION CHECKLIST

After execution:
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint:check` passes  
- [ ] `pnpm test` passes
- [ ] Root directory has ≤20 `.md` files
- [ ] All RETAIN files still have working references
- [ ] ARCHIVE files accessible via `docs/history/`
- [ ] No broken links in remaining documentation
