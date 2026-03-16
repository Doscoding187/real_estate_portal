# Referral Distribution Gap Report (2026-02-25)

Source reference: `c:\Users\Edward\.gemini\antigravity\brain\d5e7e142-f105-4a66-ab22-029b3d2a8163\walkthrough.md.resolved`

## Scope
This report maps the walkthrough gap list (`G1` to `G15`) to the current implementation state in this repository.

## Executive Summary
- Completed: `G2`, `G3`, `G5`, `G10`, `G12`
- Improved but not fully closed: `G1`, `G4`, `G6`, `G8`, `G9`, `G14`
- Still open: `G7`, `G11`, `G13`, `G15`

## Gap-by-Gap Status

### G1: No audit logging
Status: `Partial (improved)`

What was added:
- Referral lifecycle audit writes:
  - `referral.create`
  - `referral.reassess`
  - `referral.send_upload_link`
  - `referral.document_uploaded`
  - `referral.submit_to_development`
- Distribution manager/referrer submission audit write:
  - `distribution.referrer.submitDeal`

Evidence:
- `server/distributionQualificationRouter.ts`
- `server/distributionRouter.ts`

Remaining:
- No dedicated referral audit table yet; current implementation uses shared audit logging.

---

### G2: No consent versioning
Status: `Done`

What was added:
- Structured consent fields on referral documents:
  - `consent_template_id`
  - `consent_template_version`
  - `consent_captured_at`
- Migration + backfill for existing consent-confirmed rows.
- Upload flows now persist template/version explicitly.

Evidence:
- `drizzle/schema/referrals.ts`
- `server/migrations/0041_add_referral_document_consent_versioning.sql`
- `server/distributionQualificationRouter.ts`

---

### G3: Commission snapshot not locked
Status: `Done`

What was added:
- Submission-gate snapshot lock behavior:
  - deal-level commission track snapshot
  - `snapshotVersion`
  - `snapshotSource = 'submission_gate'`
  - metadata marker `commissionSnapshotLocked: true`
- Submission-created deals now enter `application_submitted`.

Evidence:
- `server/distributionQualificationRouter.ts`
- `server/distributionRouter.ts`

---

### G4: Test coverage critically thin
Status: `Partial (improved)`

What was added:
- New focused tests for manager submission queue and decision audit mapping.

Evidence:
- `server/__tests__/distribution.manager.submission-queue.test.ts`

Constraint:
- Vitest execution in this environment is blocked by `spawn EPERM` and Node version mismatch (`22.x` expected, `20.x` current). Typecheck passes.

---

### G5: No manager review queue
Status: `Done`

What was added:
- Manager API queue for submission gate:
  - `manager.listSubmissionQueue`
- Manager UI:
  - Submission review queue card
  - Approve/reject actions
  - queue age + risk signaling
- Submission decision audit feed:
  - `manager.listSubmissionDecisionAudit`
  - UI panel with decision/actor/timestamp/reason
  - decision filters + date filters + actor filter + CSV export

Evidence:
- `server/distributionRouter.ts`
- `client/src/pages/distribution/DistributionManagerDashboard.tsx`

---

### G6: Stage transition validation is loose
Status: `Partial (improved)`

What changed:
- Stronger submission gate semantics and snapshot enforcement at submission threshold.
- Manager flow still uses transition maps and guard clauses.

Remaining:
- No formal standalone state machine module yet.

Evidence:
- `server/distributionRouter.ts`

---

### G7: ReferrerDashboard monolith
Status: `Open`

Notes:
- Cockpit functionality improved, but component size/complexity remains high.

Evidence:
- `client/src/pages/ReferrerDashboard.tsx`

---

### G8: Duplicate affordability calculation
Status: `Partial (improved)`

What changed:
- Referrer quick qual now calls backend `distribution.qualification.previewQuick`.
- UI uses preview response for affordability/match display.

Remaining:
- Some local fallback calculations still exist for resilience and historical behavior.

Evidence:
- `client/src/pages/ReferrerDashboard.tsx`

---

### G9: Parallel qualification codepaths
Status: `Partial`

What changed:
- Referrer flow aligned closer to qualification router contracts.

Remaining:
- Agent and referrer still have separate UX entry surfaces and orchestration paths.

Evidence:
- `client/src/components/agent/ReferralQualificationWidget.tsx`
- `client/src/pages/ReferrerDashboard.tsx`

---

### G10: Nearby match group not surfaced
Status: `Done`

What changed:
- Referrer quick-qual rendering now shows match buckets:
  - `Preferred`
  - `Nearby`
  - `Other`

Evidence:
- `client/src/pages/ReferrerDashboard.tsx`
- `server/distributionQualificationRouter.ts`

---

### G11: PDF generation is HTML-only
Status: `Open`

Notes:
- Current flow still stores/returns HTML template output.

Evidence:
- `server/distributionQualificationRouter.ts`

---

### G12: Upload link expiry timezone edge cases
Status: `Done`

What changed:
- Expiry validity is now enforced in SQL (`CURRENT_TIMESTAMP`) during token lookup.

Evidence:
- `server/distributionQualificationRouter.ts`

---

### G13: affordabilityConfig underutilized / no admin UI
Status: `Open`

Notes:
- Service/config exists, but full admin configuration UX is still pending.

Evidence:
- `server/services/affordabilityConfigService.ts`
- `client/src/pages/admin/DistributionNetworkPage.tsx`

---

### G14: Commission ledger/override write paths limited
Status: `Partial (improved)`

What changed:
- Snapshot hardening implemented.
- Override/audit scaffolding in place and used in workflow.

Remaining:
- Full accounting lifecycle and reconciliation UX breadth still not complete.

Evidence:
- `server/distributionRouter.ts`
- `server/services/distributionCommissionService.ts`
- `server/migrations/0040_harden_distribution_commission_snapshots.sql`

---

### G15: No email/notification on upload link generation
Status: `Open`

Notes:
- Upload link generation exists but no end-to-end outbound notification delivery was added in this cycle.

Evidence:
- `server/distributionQualificationRouter.ts`
- `server/_core/email.ts` (available infra, not wired to this flow)

## Additional Changes Delivered in This Cycle
- Manager decision audit panel now supports:
  - decision filtering
  - actor filtering
  - date range filtering
  - CSV export
- Submission queue now works as operational gate aligned to submitted-stage review.

## Verification Summary
- `pnpm check` (TypeScript no-emit): passed
- Vitest: blocked in this environment (`spawn EPERM`, Node engine mismatch)

## Operational Next Steps
1. Apply DB migration:
   - `server/migrations/0041_add_referral_document_consent_versioning.sql`
2. Re-run tests in Node `22.x` environment to execute new vitest coverage.
3. Close remaining high-priority opens:
   - formal stage state machine (`G6`)
   - dashboard decomposition (`G7`)
   - real PDF generation (`G11`)
   - notifications for upload link/document events (`G15`)
