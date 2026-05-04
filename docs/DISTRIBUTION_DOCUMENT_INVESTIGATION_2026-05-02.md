# Distribution Document Persistence Investigation (2026-05-02)

## Summary
This is a no-fix, evidence-only investigation of distribution document persistence from submission through referrer dashboard rendering.

Primary requested target was production. Direct production DB credentials were not available in this workspace at investigation time. Evidence was collected from:
- runtime code paths in `server/distributionRouter.ts`, `server/services/distributionDealDocumentsService.ts`, `server/services/distributionRequiredDocumentsService.ts`, and `client/src/pages/ReferrerDashboard.tsx`
- live DB connectivity to configured `listify_test` TiDB target
- schema and table introspection against that target

## Findings (Ordered by Severity)

### 1) Critical: runtime depends on `distribution_deal_events`, but connected DB lacks this table
Impact:
- timeline reads (`distribution.referrer.dealTimeline`) and referral snapshot extraction used by `documentsComplete` are hard-coupled to `distributionDealEvents`.
- submit flow (`distribution.referrer.submitDeal`) writes event metadata (including `referralContext.documentChecklist`) into `distributionDealEvents`.

Evidence:
- Code reads/writes `distributionDealEvents` extensively:
  - `server/distributionRouter.ts:1073` (`getReferralSubmissionSnapshotByDealIds`)
  - `server/distributionRouter.ts:1120`+ (`buildDealTimelinePayload`)
  - `server/distributionRouter.ts:7120`+ (`submitDeal` inserts event with `referralContext`)
- DB introspection:
  - `distribution_deal_events` does **not** exist
  - `distribution_deal_document_statuses` exists (legacy/alternate-looking structure)

Failure boundary:
- any code path expecting event-based metadata and timeline cannot fully operate on this schema shape.

### 2) High: verification script does not guard runtime-critical event table
Impact:
- `pnpm db:verify:distribution` returns OK even when runtime can still fail on missing event table.

Evidence:
- `scripts/db-verify-distribution-schema.ts` validates only:
  - required tables: `distribution_brand_partnerships`, `distribution_development_access`, `distribution_programs`, `development_manager_assignments`, `development_required_documents`
  - selected columns only
- `distribution_deal_events` is not checked there.
- Run output: `[db:verify:distribution] OK` despite missing `distribution_deal_events`.

### 3) High: dual document signal model can diverge by design
Impact:
- referrer dashboard pipeline `documentsComplete` is computed from submission snapshot checklist booleans in event metadata, not from manager-verified checklist records in `distribution_deal_documents`.
- users can see “documents complete” while required manager verification is incomplete.

Evidence:
- `documentsComplete` in pipeline:
  - `server/distributionRouter.ts:7283` gets referral snapshots
  - `server/distributionRouter.ts:7309` uses `hasCompleteDocuments(...)`
  - `hasCompleteDocuments` logic uses `documentChecklist` booleans (`idUploaded`, `payslipsUploaded`, `bankStatementsUploaded`, optional additional docs flag)
- manager checklist persistence is separate:
  - `server/services/distributionDealDocumentsService.ts` reads/writes `distribution_deal_documents` tied to `development_required_documents`.

### 4) Medium: environment contains zero distribution deal data, blocking incident replay there
Impact:
- no incident-level replay was possible on currently configured DB target.

Evidence:
- counts:
  - `distribution_deals = 0`
  - `distribution_deal_documents = 0`
  - `development_required_documents = 0`

## Canonical Flow Map (As Implemented)

1. Referrer submission:
- `distribution.referrer.submitDeal` accepts `referralContext.documentChecklist`
- normalizes checklist fields
- inserts deal row
- inserts event into `distribution_deal_events` with metadata containing `referralContext`

2. Manager checklist persistence:
- required templates sourced from `development_required_documents`
- status rows persisted in `distribution_deal_documents`
- checklist state mutated via `distribution.updateDealDocumentStatus`

3. Referrer dashboard rendering:
- `myAccess`: development/program/access metadata
- `myPipeline`: deals + computed `documentsComplete` from referral event metadata snapshot
- `dealTimeline`: timeline/events/viewings/validations/commissions (event-table dependent)

## Expected vs Actual Matrix

| Layer | Expected | Actual Evidence | Status |
|---|---|---|---|
| DB schema for event metadata | `distribution_deal_events` exists | table missing on connected target | FAIL |
| DB schema for manager docs | `distribution_deal_documents` + `development_required_documents` exist | both exist | PASS |
| Submission snapshot source | checklist persisted in event metadata | code writes to `distribution_deal_events.metadata` | BLOCKED by missing table |
| Pipeline document completeness signal | derived from snapshot checklist | code confirms this (`hasCompleteDocuments`) | PASS (logic), RISK (divergence) |
| Manager verification signal | derived from `distribution_deal_documents` verified statuses | code confirms separate flow | PASS |
| Migration guard | verifier catches runtime-critical table gaps | verifier does not validate `distribution_deal_events` | FAIL |

## Incident Anchor and Scope Notes
- Requested anchor: single posted persistence/migration incident.
- Direct incident-row replay could not be executed in configured DB target due zero deal data and missing event table.
- Investigation therefore isolated failure boundaries and drift points that would affect that incident class end-to-end.

## Root-Cause Hypothesis Clusters
1. Migration drift:
- runtime expects `distribution_deal_events`; environment missing it.
- potential legacy replacement table (`distribution_deal_document_statuses`) indicates partial/parallel migration state.

2. Read-model mismatch:
- pipeline completeness uses snapshot booleans, not manager-verified checklist records.

3. Verification gap:
- current schema verification script does not validate all runtime-critical distribution tables.

## No-Code Remediation Backlog (Prioritized)
1. Add runtime-critical schema guards:
- extend distribution schema verifier to include `distribution_deal_events` (and core columns used by router).

2. Add startup/runtime capability checks for referrer paths:
- fail fast (or degrade explicitly) when event table is unavailable instead of silent/late failure.

3. Define single source of truth for “documents complete” in referrer UX:
- decide whether completeness should represent buyer self-declaration, manager verification, or both.
- align UI labels to chosen semantic model.

4. Add drift-focused integration tests:
- test missing `distribution_deal_events` behavior for `myPipeline`, `dealTimeline`, and `submitDeal`.
- test divergence scenarios between snapshot checklist and manager checklist statuses.

5. Recover incident reproducibility:
- obtain production read-only DB target or incident export containing deal id + timestamps + user id scope.

## Evidence Appendix

### A) Schema table existence/count probe (connected TiDB target)
```json
{
  "distribution_deals": { "exists": true, "count": 0 },
  "distribution_deal_documents": { "exists": true, "count": 0 },
  "distribution_deal_events": { "exists": false, "count": null },
  "distribution_deal_document_statuses": { "exists": true, "count": 0 },
  "development_required_documents": { "exists": true, "count": 0 }
}
```

### B) Distribution verification script scope
- `scripts/db-verify-distribution-schema.ts` does not include `distribution_deal_events` in required tables.
- command output still returns:
  - `[db:verify:distribution] OK`

### C) Key code references
- Snapshot extraction: `server/distributionRouter.ts:1073`
- Pipeline completeness calc: `server/distributionRouter.ts:1061`, `server/distributionRouter.ts:7309`
- Submission metadata write: `server/distributionRouter.ts:7120`
- Timeline event read: `server/distributionRouter.ts:1120`
- Manager checklist persistence: `server/services/distributionDealDocumentsService.ts`
- Referrer dashboard consumers: `client/src/pages/ReferrerDashboard.tsx:71`, `:75`, `:76`

## Decision Log
- Chosen mode: no-fix investigation only.
- Used non-mutating actions only (search, schema introspection, read-only SQL).
- Production-first intent preserved; blocked by missing direct production DB credentials in workspace.
- Completed with concrete failure-boundary evidence and remediation backlog.
