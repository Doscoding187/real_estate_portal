# Distribution Document Model Redesign (2026-05-02)

## 1) Current-State Diagnosis

### What exists now
- Requirement/template registry is stored in `development_required_documents` with:
  - `category` (`developer_document` vs `client_required_document`)
  - `document_code`, `document_label`
  - optional `template_file_url` / `template_file_name`
  - `is_required`, `is_active`, `sort_order`
  - Source: [distribution.ts](/c:/Dev/real_estate_portal_clone/drizzle/schema/distribution.ts:340)
- Deal-level checklist state is stored in `distribution_deal_documents` with:
  - `deal_id`, `development_required_document_id`, `status`
  - file submitted fields + review fields
  - Source: [distribution.ts](/c:/Dev/real_estate_portal_clone/drizzle/schema/distribution.ts:625)
- Event/audit stream is modeled as `distribution_deal_events` (router depends on it heavily for snapshots/timeline).
  - Source: [distribution.ts](/c:/Dev/real_estate_portal_clone/drizzle/schema/distribution.ts:698), [distributionRouter.ts](/c:/Dev/real_estate_portal_clone/server/distributionRouter.ts:1073)
- Admin configuration UI already mixes three concepts in one editor:
  - developer application templates (required)
  - supporting files (optional)
  - buyer application docs
  - Source: [PartnerDevelopmentOnboardingDrawer.tsx](/c:/Dev/real_estate_portal_clone/client/src/components/admin/distribution/PartnerDevelopmentOnboardingDrawer.tsx:1437)

### Core diagnosis
- `documentsComplete` for pipeline is currently derived from referral snapshot checklist booleans parsed from event metadata, not from `distribution_deal_documents`.
  - Source: [distributionRouter.ts](/c:/Dev/real_estate_portal_clone/server/distributionRouter.ts:1061), [distributionRouter.ts](/c:/Dev/real_estate_portal_clone/server/distributionRouter.ts:7309)
- Manager checklist and referrer checklist therefore can diverge by design.
- The current schema conflates:
  - reusable development assets
  - application requirements
  - per-deal requirement fulfillment status

## 2) Schema Gap Analysis

### Gaps vs desired model
1. Missing first-class development document bank table.
2. `development_required_documents` currently mixes:
   - requirement definition
   - developer template/source file reference
3. No explicit requirement provider (`buyer`, `referrer`, `manager`, `developer`).
4. No explicit accepted file types per requirement.
5. No explicit requirement->asset link model.
6. No explicit `waived` status in deal requirement state.
7. No canonical persisted readiness rollup based solely on requirements + statuses.
8. Event metadata used as operational completeness signal (should be audit-only).

### Additional drift risk
- Environment-level drift already observed around `distribution_deal_events` availability in earlier investigation, while runtime assumes it.

## 3) Proposed Canonical Data Model

### A. `development_documents` (development-level bank)
- `id` (PK)
- `development_id` (FK -> developments)
- `title`
- `document_type` (enum, e.g. `price_list`, `house_plan`, `brochure`, `site_map`, `spec_sheet`, `availability_sheet`, `other`)
- `category` (enum: `sales_asset`, `technical_asset`, `legal_asset`, `application_template`, `other`)
- `storage_key`
- `file_url`
- `mime_type`
- `file_size_bytes`
- `visibility` (enum: `internal`, `manager`, `referrer`, `public`)
- `downloadable` (bool)
- `required_for_application` (bool, derived convenience flag; true when linked to required active requirement)
- `active` (bool)
- `version` (int)
- `replaced_by_document_id` (nullable self FK)
- `uploaded_by` (FK -> users)
- `created_at`, `updated_at`

### B. `application_requirements` (development-level checklist definition)
- `id` (PK)
- `development_id` (FK -> developments)
- `label`
- `description`
- `required` (bool)
- `provider` (enum: `buyer`, `referrer`, `manager`, `developer`)
- `document_code` (nullable legacy bridge, keep for migration)
- `accepted_file_types_json` (array of MIME/extensions)
- `linked_development_document_id` (nullable FK -> development_documents)
- `sort_order`
- `active` (bool)
- `created_by`, `updated_by`
- `created_at`, `updated_at`

### C. `deal_requirement_statuses` (per-deal fulfillment)
- `id` (PK)
- `deal_id` (FK -> distribution_deals)
- `requirement_id` (FK -> application_requirements)
- `uploaded_file_storage_key` (nullable)
- `uploaded_file_url` (nullable)
- `uploaded_file_name` (nullable)
- `linked_development_document_id` (nullable FK -> development_documents)
- `status` (enum: `missing`, `uploaded`, `rejected`, `verified`, `waived`)
- `submitted_by` (nullable FK -> users)
- `submitted_at` (nullable)
- `reviewed_by` (nullable FK -> users)
- `reviewed_at` (nullable)
- `rejection_reason` (nullable text)
- `notes` (nullable text)
- `created_at`, `updated_at`
- unique constraint: (`deal_id`, `requirement_id`)

### D. Readiness computation (canonical)
- Per deal:
  - required active requirements = all `application_requirements` where `required=1` and `active=1` for deal’s development
  - requirement satisfied when status in (`verified`, `waived`)
  - completeness = satisfied required count / required count
- Event metadata is excluded from readiness; event stream remains audit/timeline only.

## 4) Migration Plan

### Phase 0: Prep and backfill-safe additions
1. Add new tables: `development_documents`, `application_requirements`, `deal_requirement_statuses`.
2. Add indexes on (`development_id`, `active`, `required`, `status`, `sort_order`), and unique (`deal_id`, `requirement_id`).
3. Keep old tables untouched.

### Phase 1: Backfill
1. Backfill `application_requirements` from `development_required_documents`.
2. For rows with `category='developer_document'` and template file URL/name:
   - create `development_documents` row.
   - set `application_requirements.linked_development_document_id`.
3. Backfill `deal_requirement_statuses` from `distribution_deal_documents`:
   - map statuses: `pending->missing`, `received->uploaded`, `verified->verified`, `rejected->rejected`.
4. Preserve IDs in migration map table for reconciliation.

### Phase 2: Dual-write
1. Update write paths to write new model and legacy model in same transaction.
2. Add drift detector job/endpoint comparing legacy vs new counts/state.

### Phase 3: Read cutover (feature flag)
1. Behind `FEATURE_DISTRIBUTION_DOCS_V2_READS`, switch:
   - referrer completeness
   - manager checklist reads
   - partner requirement views
   to `application_requirements` + `deal_requirement_statuses`.
2. Maintain legacy read fallback for emergency rollback window.

### Phase 4: Cleanup
1. Remove event-metadata completeness logic.
2. Remove legacy checklist reads after stable window.
3. Optionally deprecate legacy tables in final migration.

## 5) Backend Service Changes

### New/updated services
1. `distributionDevelopmentDocumentBankService`
- CRUD for `development_documents`
- versioning, visibility, and downloadable policy

2. `distributionApplicationRequirementService`
- CRUD for `application_requirements`
- enforce provider + accepted type rules
- optional link to development asset

3. `distributionDealRequirementStatusService`
- upsert/review status rows in `deal_requirement_statuses`
- enforce workflow transitions:
  - `missing -> uploaded -> verified/rejected`
  - allow `waived` by manager/developer-admin only

4. `distributionDealReadinessService` (new canonical)
- computes required counts and completeness from new tables only
- returns split metrics:
  - `uploaded_required_count`
  - `verified_required_count`
  - `waived_required_count`
  - `missing_required_count`

### Router changes
- `distribution.referrer.myPipeline`: replace `hasCompleteDocuments(snapshot)` with readiness service.
- `distribution.referrer.submitDeal`: keep `referralContext` metadata for audit, but do not use for readiness.
- `distribution.getDealChecklist` / `updateDealDocumentStatus`: rebase onto `deal_requirement_statuses`.
- Add admin/developer endpoints for document bank + requirement config.

## 6) Frontend UX Changes

### Admin/Developer
Current UI already has three sections in onboarding drawer; split into two explicit modules:
1. Development Document Bank
- upload/manage reusable assets
- set visibility/downloadable/active/version
2. Application Requirements
- define required/optional docs
- provider + accepted types
- optionally link an existing development document

Affected component:
- [PartnerDevelopmentOnboardingDrawer.tsx](/c:/Dev/real_estate_portal_clone/client/src/components/admin/distribution/PartnerDevelopmentOnboardingDrawer.tsx:1437)

### Manager
- Checklist panel shows per requirement:
  - provider
  - linked development doc vs uploaded deal file
  - status lifecycle (`missing/uploaded/rejected/verified/waived`)
  - rejection reason + reviewed fields
- Keep bulk verify actions only for eligible statuses.

Affected components:
- [ManagerDealChecklistPage.tsx](/c:/Dev/real_estate_portal_clone/client/src/pages/distribution/ManagerDealChecklistPage.tsx:215)
- [ManagerDealChecklistPanel.tsx](/c:/Dev/real_estate_portal_clone/client/src/components/distribution/manager/ManagerDealChecklistPanel.tsx:70)

### Referrer/Partner
- Separate labels and KPIs:
  - “Uploaded” vs “Verified”
  - do not show single ambiguous “documents complete”
- Submission page:
  - shows requirements grouped by provider + requiredness
- Referral detail page:
  - upload actions for provider-owned requirements
  - explicit manager verification feedback and rejection reason

Affected components:
- [PartnerSubmitReferralPage.tsx](/c:/Dev/real_estate_portal_clone/client/src/pages/distribution/PartnerSubmitReferralPage.tsx:454)
- [PartnerReferralDetailPage.tsx](/c:/Dev/real_estate_portal_clone/client/src/pages/distribution/PartnerReferralDetailPage.tsx:130)
- [ReferrerDashboard.tsx](/c:/Dev/real_estate_portal_clone/client/src/pages/ReferrerDashboard.tsx:71)

## 7) Tests Needed to Prevent Drift

### Schema/migration tests
1. New tables exist + indexes + constraints.
2. Backfill integrity:
  - counts between legacy and new mappings
  - requirement linkage to development docs

### Service tests
1. Readiness computation uses only requirements + statuses.
2. Status transition guard tests.
3. Waive authorization tests.
4. Linked asset requirement behavior tests.

### Contract/integration tests
1. `myPipeline` completeness reflects verified/waived required docs, not metadata booleans.
2. `submitDeal` metadata present for audit but ignored in readiness.
3. Manager verify/reject updates reflected in referrer detail.
4. Missing `distribution_deal_events` does not break readiness API paths.

### UI tests
1. Referrer: uploaded vs verified counters displayed separately.
2. Admin: can configure bank and requirements independently.
3. Manager: rejection reason and reviewed fields render correctly.

## 8) Safe Rollout Plan (No Existing Deal Breakage)

1. Additive schema only first.
2. Backfill all existing legacy records.
3. Dual-write enabled by default after backfill validation.
4. Read cutover behind feature flag per surface:
   - manager first
   - partner detail second
   - referrer pipeline last
5. Run reconciliation monitors daily:
   - required counts, verified counts, and status distributions by deal
6. Rollback strategy:
   - disable V2 reads flag instantly
   - keep dual-write to avoid data loss
7. Exit criteria:
   - zero drift for 7 days in reconciliation
   - no P1/P2 document readiness incidents
   - migration guard updated to include all runtime-critical document tables

## Implementation Defaults Chosen
- Canonical readiness statuses accepted as complete: `verified`, `waived`.
- Event metadata remains audit-only and timeline-only.
- Existing `development_required_documents` and `distribution_deal_documents` are treated as legacy compatibility layers during transition.
- New model supports linked development assets as first-class references rather than overloading template fields.
