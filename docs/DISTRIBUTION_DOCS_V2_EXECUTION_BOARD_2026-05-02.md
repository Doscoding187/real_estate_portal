# Distribution Docs V2 Execution Board

## EPIC 1: Database & Migration (`DISTDOC-EP1`)

### Story `DISTDOC-101` - Add V2 schema (additive)
- Story points: 8
- Owner: Backend Engineer
- Risk: Medium
- Feature flag: `FEATURE_DISTRIBUTION_DOCS_V2_SCHEMA`
- Dependencies: None

Tasks:
1. `DISTDOC-102` Create `development_documents` in [distribution.ts](/c:/Dev/real_estate_portal_clone/drizzle/schema/distribution.ts) and SQL migration in `server/migrations/*`.
- Risk: Medium
- Dependency: None

2. `DISTDOC-103` Create `application_requirements` in [distribution.ts](/c:/Dev/real_estate_portal_clone/drizzle/schema/distribution.ts) and SQL migration.
- Risk: Medium
- Dependency: `DISTDOC-102`

3. `DISTDOC-104` Create `deal_requirement_statuses` with status enum (`missing`,`uploaded`,`pending_review`,`verified`,`rejected`,`waived`).
- Risk: High
- Dependency: `DISTDOC-103`

4. `DISTDOC-105` Add indexes, unique (`deal_id`,`requirement_id`), FKs, and audit columns.
- Risk: Medium
- Dependency: `DISTDOC-104`

Acceptance criteria:
1. Migrations are additive only and succeed in dev/test/staging.
2. New schema objects visible and validated by migration tests.
3. No behavior change in legacy reads/writes.

---

### Story `DISTDOC-110` - Backfill V2 data model
- Story points: 13
- Owner: Backend Engineer
- Risk: High
- Feature flag: `FEATURE_DISTRIBUTION_DOCS_V2_BACKFILL`
- Dependencies: `DISTDOC-101`

Tasks:
1. `DISTDOC-111` Implement `scripts/backfill-distribution-docs-v2.ts`.
- Risk: High
- Dependency: `DISTDOC-105`

2. `DISTDOC-112` Backfill `application_requirements` from `development_required_documents`.
- Risk: High
- Dependency: `DISTDOC-111`

3. `DISTDOC-113` Backfill `development_documents` from developer template/source rows and link requirements.
- Risk: High
- Dependency: `DISTDOC-112`

4. `DISTDOC-114` Backfill `deal_requirement_statuses` from `distribution_deal_documents` with fixed mapping `received -> pending_review`.
- Risk: High
- Dependency: `DISTDOC-112`

5. `DISTDOC-115` Produce reconciliation + mapping report (legacy IDs to V2 IDs).
- Risk: Medium
- Dependency: `DISTDOC-113`, `DISTDOC-114`

Acceptance criteria:
1. Reconciliation is 100% clean.
2. No orphaned requirement or status rows.
3. Backfill rerun is idempotent.

---

### Story `DISTDOC-120` - Schema guard + degraded mode readiness
- Story points: 5
- Owner: Backend Engineer
- Risk: High
- Feature flag: `FEATURE_DISTRIBUTION_DOCS_V2_SCHEMA_GUARD`
- Dependencies: None

Tasks:
1. `DISTDOC-121` Update [db-verify-distribution-schema.ts](/c:/Dev/real_estate_portal_clone/scripts/db-verify-distribution-schema.ts) to include runtime-critical tables (`distribution_deal_events` included).
- Risk: Medium
- Dependency: None

2. `DISTDOC-122` Add runtime mode detection in bootstrap path (`healthy` vs `degraded`).
- Risk: High
- Dependency: `DISTDOC-121`

Acceptance criteria:
1. Missing event table no longer silently passes as healthy runtime.
2. Degraded mode can serve readiness/checklist APIs without timeline.

---

## EPIC 2: Backend Services & API (`DISTDOC-EP2`)

### Story `DISTDOC-201` - Build V2 services
- Story points: 13
- Owner: Backend Engineer
- Risk: High
- Feature flag: `FEATURE_DISTRIBUTION_DOCS_V2_WRITE`
- Dependencies: `DISTDOC-110`

Tasks:
1. `DISTDOC-202` Create `distributionDevelopmentDocumentBankService.ts` in `server/services/`.
2. `DISTDOC-203` Create `distributionApplicationRequirementService.ts` in `server/services/`.
3. `DISTDOC-204` Create `distributionDealRequirementStatusService.ts` in `server/services/`.
4. `DISTDOC-205` Create `distributionDealReadinessService.ts` in `server/services/` with strict `DealReadiness` contract.

Service-level guard rules (`DISTDOC-204`):
1. Verify allowed only from `pending_review`.
2. Reject allowed only from `uploaded` or `pending_review`.
3. Upload blocked when `verified` unless explicit reset action.
4. Waive allowed only for manager/developer admin.

Acceptance criteria:
1. All transition rules enforced only in service layer.
2. Readiness computed only from V2 requirement/status tables.
3. API returns:
`uploadComplete`, `verificationComplete`, `requiredTotal`, `uploadedCount`, `verifiedCount`, `waivedCount`, `pendingReviewCount`, `rejectedCount`.

---

### Story `DISTDOC-210` - Router integration + dual-write
- Story points: 13
- Owner: Backend Engineer
- Risk: High
- Feature flags: `FEATURE_DISTRIBUTION_DOCS_V2_DUAL_WRITE`, `FEATURE_DISTRIBUTION_DOCS_V2_READS`
- Dependencies: `DISTDOC-201`, `DISTDOC-115` (hard gate)

Tasks:
1. `DISTDOC-211` Add document bank + requirement endpoints in [distributionRouter.ts](/c:/Dev/real_estate_portal_clone/server/distributionRouter.ts).
2. `DISTDOC-212` Rebase manager checklist endpoints to service layer and dual-write legacy + V2 in one transaction.
3. `DISTDOC-213` Replace referrer pipeline completeness source with readiness service.
4. `DISTDOC-214` Keep event metadata for audit/timeline only; remove readiness fallback logic.
5. `DISTDOC-215` Add explicit degraded timeline response shape when runtime mode is degraded.

Acceptance criteria:
1. No dual-write until backfill reconciliation is 100%.
2. Dual-write can be disabled instantly by flag.
3. Pipeline and checklist work without metadata completeness.

---

## EPIC 3: Admin/Developer UI (`DISTDOC-EP3`)

### Story `DISTDOC-301` - Split onboarding editor into two modules
- Story points: 8
- Owner: Frontend Engineer
- Risk: Medium
- Feature flag: `FEATURE_DISTRIBUTION_DOCS_V2_ADMIN_UI`
- Dependencies: `DISTDOC-211`

Tasks:
1. `DISTDOC-302` Refactor [PartnerDevelopmentOnboardingDrawer.tsx](/c:/Dev/real_estate_portal_clone/client/src/components/admin/distribution/PartnerDevelopmentOnboardingDrawer.tsx) into:
- Development Document Bank
- Application Requirements

2. `DISTDOC-303` Add requirement controls:
- provider
- accepted file types
- linked development document selector

3. `DISTDOC-304` Render derived required-for-application badge (computed via linked active requirements; not stored).

Acceptance criteria:
1. Admin can manage assets and requirements independently.
2. Requirement records never carry direct file payloads.
3. Derived linkage indicators are visible and accurate.

---

## EPIC 4: Manager Workflow (`DISTDOC-EP4`)

### Story `DISTDOC-401` - V2 manager checklist lifecycle
- Story points: 8
- Owner: Frontend Engineer + Backend Engineer
- Risk: Medium
- Feature flag: `FEATURE_DISTRIBUTION_DOCS_V2_MANAGER_READS`
- Dependencies: `DISTDOC-212`

Tasks:
1. `DISTDOC-402` Update [ManagerDealChecklistPanel.tsx](/c:/Dev/real_estate_portal_clone/client/src/components/distribution/manager/ManagerDealChecklistPanel.tsx) for new statuses incl. `pending_review` and `waived`.
2. `DISTDOC-403` Update [ManagerDealChecklistPage.tsx](/c:/Dev/real_estate_portal_clone/client/src/pages/distribution/ManagerDealChecklistPage.tsx) bulk actions to align with service transition rules.
3. `DISTDOC-404` Add explicit auto-satisfied visibility:
- `status=verified`
- `verified_by=SYSTEM`
- `source=linked_development_document`

Acceptance criteria:
1. Manager cannot execute invalid transitions.
2. Rejections capture and display reasons.
3. Auto-verified items are auditable and visible.

---

## EPIC 5: Referrer Experience (`DISTDOC-EP5`)

### Story `DISTDOC-501` - Referrer/partner document UX split
- Story points: 8
- Owner: Frontend Engineer
- Risk: Medium
- Feature flags: `FEATURE_DISTRIBUTION_DOCS_V2_REFERRER_READS`, `FEATURE_DISTRIBUTION_DOCS_V2_PIPELINE_READS`
- Dependencies: `DISTDOC-213`

Tasks:
1. `DISTDOC-502` Update [PartnerSubmitReferralPage.tsx](/c:/Dev/real_estate_portal_clone/client/src/pages/distribution/PartnerSubmitReferralPage.tsx) to display grouped requirements by provider/requiredness.
2. `DISTDOC-503` Update [PartnerReferralDetailPage.tsx](/c:/Dev/real_estate_portal_clone/client/src/pages/distribution/PartnerReferralDetailPage.tsx) with per-requirement statuses and rejection messaging.
3. `DISTDOC-504` Update [ReferrerDashboard.tsx](/c:/Dev/real_estate_portal_clone/client/src/pages/ReferrerDashboard.tsx) to show upload vs verification readiness separately.

Acceptance criteria:
1. No ambiguous single “documents complete” label remains.
2. Referrer sees upload vs verification states distinctly.
3. Pipeline uses readiness contract only.

---

## EPIC 6: Rollout & Safety (`DISTDOC-EP6`)

### Story `DISTDOC-601` - Shadow compare, staged rollout, rollback controls
- Story points: 13
- Owner: Backend Engineer + QA Engineer + DevOps
- Risk: High
- Feature flags:
  - `FEATURE_DISTRIBUTION_DOCS_V2_SHADOW_COMPARE`
  - `FEATURE_DISTRIBUTION_DOCS_V2_MANAGER_READS`
  - `FEATURE_DISTRIBUTION_DOCS_V2_REFERRER_READS`
  - `FEATURE_DISTRIBUTION_DOCS_V2_PIPELINE_READS`
  - `FEATURE_DISTRIBUTION_DOCS_V2_SCHEMA_GUARD`
- Dependencies: `DISTDOC-210`, `DISTDOC-401`, `DISTDOC-501`

Tasks:
1. `DISTDOC-602` Internal shadow mode: compute legacy and V2 readiness in parallel, log diffs only (no UI cutover).
2. `DISTDOC-603` Roll out reads by stage:
- Stage 0 internal shadow
- Stage 1 manager
- Stage 2 referrer detail
- Stage 3 pipeline/dashboard
3. `DISTDOC-604` Add degraded timeline banner copy and handling:
- "Timeline temporarily unavailable"
4. `DISTDOC-605` Publish rollback runbook per stage (which flags to disable, validation checks).
5. `DISTDOC-606` Add daily reconciliation monitor for counts and status drift.

Acceptance criteria:
1. Shadow diffs reach agreed threshold (target zero critical mismatches) before user cutover.
2. Stage rollback tested in non-prod.
3. Missing event-table scenario keeps readiness/checklist functional.

---

## Test Board (Cross-Epic)

### `DISTDOC-T701` Schema tests
- Owner: Backend Engineer
- Risk: Medium
- Dependency: `DISTDOC-105`
- Validate table existence, constraints, indexes.

### `DISTDOC-T702` Backfill integrity tests
- Owner: Backend Engineer
- Risk: High
- Dependency: `DISTDOC-115`
- Validate counts, mappings, idempotency.

### `DISTDOC-T703` Service transition tests
- Owner: Backend Engineer
- Risk: High
- Dependency: `DISTDOC-204`
- Enforce transition guards and role authorization.

### `DISTDOC-T704` Readiness contract tests
- Owner: Backend Engineer
- Risk: High
- Dependency: `DISTDOC-205`
- Assert no metadata fallback usage.

### `DISTDOC-T705` Integration tests
- Owner: QA Engineer
- Risk: High
- Dependency: `DISTDOC-213`, `DISTDOC-402`, `DISTDOC-503`
- Pipeline/detail/checklist consistency.

### `DISTDOC-T706` Degraded mode tests
- Owner: QA Engineer
- Risk: High
- Dependency: `DISTDOC-215`, `DISTDOC-604`
- Remove/disable timeline table in test env; confirm graceful behavior.

---

## Hard Gates
1. `GATE-1`: No dual-write enablement before `DISTDOC-115` reconciliation = 100% clean.
2. `GATE-2`: No manager read cutover before service transition tests pass.
3. `GATE-3`: No referrer pipeline cutover before shadow diff reports stable.
4. `GATE-4`: No production rollout without degraded mode test pass.

## Suggested Sprint Sequence
1. Sprint A: EPIC 1 + schema guards (`DISTDOC-EP1`)
2. Sprint B: EPIC 2 core services + dual-write scaffolding (`DISTDOC-EP2`)
3. Sprint C: EPIC 3 + EPIC 4 UI cut-in (`DISTDOC-EP3`, `DISTDOC-EP4`)
4. Sprint D: EPIC 5 referrer cutover + EPIC 6 staged rollout (`DISTDOC-EP5`, `DISTDOC-EP6`)
