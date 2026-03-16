# Referral Alignment Sprint Board (2026-02-25)

Objective: Close blueprint gaps without breaking current referral flow (quick qual, PDF generation, upload link, submit to development).

## Non-Negotiable Guardrails

1. Additive schema only.
2. Do not edit already-applied migration `0034_create_referral_qualification_layer.sql`.
3. Do not refactor existing referral assessment versioning logic.
4. Keep current quick-qual flow working during entire sprint.
5. Feature-flag behavior-changing gate changes until manager validation is done.

## Execution Order (What To Do First)

Wave 1 (start immediately, parallel, low risk):
- T1 Affordability config table + admin API/UI
- T2 Confidence level enum + UI labels
- T3 Three match groups (preferred, nearby, other)
- T8 PDF watermark + QR code

Wave 2 (compliance foundation):
- T4 Immutable consent versioning
- T7 Document access audit logging (depends on T4)

Wave 3 (ops workflow):
- T5 Document lifecycle state machine (depends on T4)
- T6 Manager review queue UI (depends on T5)

Wave 4 (behavior change, high risk):
- T9 Submit-to-development gate to verified by default + manager override (depends on T2 and T5)

Wave 5 (stability closeout):
- T10 End-to-end integration tests (after T1-T9 merged)

## Dependency Map

| Task | Depends On | Unblocks |
|---|---|---|
| T1 | None | T10 |
| T2 | None | T9, T10 |
| T3 | None | T10 |
| T4 | None | T5, T7, T10 |
| T5 | T4 | T6, T9, T10 |
| T6 | T5 | T10 |
| T7 | T4 | T10 |
| T8 | None | T10 |
| T9 | T2, T5 | T10 |
| T10 | T1-T9 | Done |

## Task Cards (Priority-Ordered)

### T1 - AffordabilityConfig (LOW)
Scope:
- Add config table for affordability assumptions.
- Add service read with fallback defaults.
- Add super-admin routes to read/update config.
- Add admin UI panel.

Files likely touched:
- `server/migrations/*_add_affordability_config.sql`
- `drizzle/schema/*`
- `server/services/referralQualificationService.ts`
- `server/adminRouter.ts`
- `client/src/pages/admin/*`

Live risk:
- Low if seeded defaults exactly match current hardcoded values.

Acceptance:
- Same input returns same affordability output before/after migration (snapshot test).
- Admin can change config; only new assessments reflect change.

---

### T2 - Confidence Level Enum + Labels (LOW)
Scope:
- Add `confidenceLevel` on assessment records (`low|medium|high|verified`).
- Derive from score thresholds and return in APIs.
- Show badge and plain-language hint in UI and PDF.

Files likely touched:
- `server/migrations/*_add_confidence_level.sql`
- `server/services/referralQualificationService.ts`
- `server/distributionQualificationRouter.ts`
- `client/src/components/agent/ReferralQualificationWidget.tsx`
- `server/services/referralQualificationService.ts` (PDF template section)

Live risk:
- Low/medium. Existing records may have null level; UI must fallback gracefully.

Acceptance:
- Boundary tests for 39/40/69/70/89/90.
- Existing referrals render without errors.

---

### T3 - Add Nearby Match Group (LOW)
Scope:
- Expand match bucketing from 2 groups to 3:
  - preferred_area
  - nearby_area
  - other_area
- Update rank logic and match reason copy.
- Update UI tabs/sections and PDF grouping.

Files likely touched:
- `server/migrations/*_expand_match_bucket.sql`
- `drizzle/schema/referrals.ts`
- `server/services/referralQualificationService.ts`
- `server/distributionQualificationRouter.ts`
- `client/src/components/agent/ReferralQualificationWidget.tsx`

Live risk:
- Low. If city data is missing, nearby group can be empty without breaking flow.

Acceptance:
- Preferred beats nearby, nearby beats other in deterministic tests.
- UI and PDF both show 3 groups.

---

### T8 - PDF Watermark + QR (MED)
Scope:
- Add watermark (`reference + agent`) on both pages.
- Generate QR for active upload link token.
- Keep disclaimer wording unchanged.

Files likely touched:
- `server/services/referralQualificationService.ts`
- Optional helper service for QR generation

Live risk:
- Medium. Rendering differences across HTML/PDF renderer must be validated.

Acceptance:
- PDF HTML preview shows watermark and QR when token exists.
- Fallback text shown when no token exists.

---

### T4 - Immutable Consent Versioning (LOW)
Scope:
- Add consent records table (immutable).
- Store verbatim consent text + version + timestamp + token linkage.
- Persist consent linkage per uploaded document.

Files likely touched:
- `server/migrations/*_add_referral_consent_records.sql`
- `drizzle/schema/*`
- `server/distributionQualificationRouter.ts`
- `client/src/pages/ReferralUpload.tsx`

Live risk:
- Low if upload flow remains additive.

Acceptance:
- Upload fails atomically if consent record write fails.
- Consent rows are write-once (no update/delete path).

---

### T7 - Document Access Audit Log (MED)
Scope:
- Log every doc access event (agent, manager, admin, PDF generation).
- Add read-only manager/admin audit view.

Files likely touched:
- `server/migrations/*_add_document_access_log.sql`
- `drizzle/schema/*`
- document retrieval routes/services

Live risk:
- Medium. Logging must be non-blocking so document access never fails due to log write.

Acceptance:
- Access events recorded for all entry paths.
- Log failure does not block document fetch.

---

### T5 - Document Lifecycle State Machine (MED)
Scope:
- Formal states and transitions:
  - requested -> uploaded -> under_review -> verified
  - rejection paths with notes
- Add transition history table.
- On verified completion, create new assessment version in verified mode.

Files likely touched:
- `server/migrations/*_document_status_lifecycle.sql`
- `server/services/*document*.ts`
- `server/distributionQualificationRouter.ts`

Live risk:
- Medium. Must not mutate prior assessment versions.

Acceptance:
- Transition guard tests reject invalid jumps.
- Verified transition creates a new assessment version.

---

### T6 - Manager Review Queue UI (MED)
Scope:
- Manager queue page for awaiting/under-review referrals.
- Detail pane for document review and status transitions.
- Notification count for pending reviews.

Files likely touched:
- manager dashboard routes/components
- manager-scoped TRPC endpoints

Live risk:
- Medium. Access control must be strict.

Acceptance:
- Agent cannot access manager review routes.
- Manager can complete full review cycle on staging.

---

### T9 - Verified Gate + Override (HIGH)
Scope:
- Default block submit when referral is not verified.
- Add manager override fields and route.
- Surface clear disabled-state messaging in agent UI.

Files likely touched:
- `server/migrations/*_submission_override_fields.sql`
- `server/distributionQualificationRouter.ts`
- `client/src/components/agent/ReferralQualificationWidget.tsx`

Live risk:
- High. This changes live agent behavior.

Mitigation:
- Deploy behind feature flag `FEATURE_REFERRAL_SUBMIT_VERIFIED_GATE`.
- Enable only after T5/T6 are in production and manager team is ready.
- Pre-announce to agents before enablement.

Acceptance:
- Quick qual submit blocked without override.
- Manager override allows submit and writes audit event.

---

### T10 - Integration Test Suite (LOW)
Scope:
- Full pipeline tests:
  - create referral
  - compute/match
  - generate PDF
  - upload with consent
  - lifecycle to verified
  - submit to development
- Add negative tests for gate and override paths.

Files likely touched:
- `server/services/__tests__/referralQualification.integration.test.ts`

Live risk:
- Low. Test-only.

Acceptance:
- Suite passes in CI on test DB.
- No flaky cross-test state leakage.

## Production Deploy Sequence (Safe)

1. Deploy Wave 1: T1, T2, T3, T8
2. Deploy Wave 2: T4, then T7
3. Deploy Wave 3: T5, then T6
4. Deploy Wave 4: T9 (flag off), validate, then flag on
5. Deploy Wave 5: T10 (CI gate)

## Risk Areas That Touch Live Functionality

1. T9 verified gate:
- Can block current quick submit behavior.
- Requires comms + feature flag rollout.

2. T5 lifecycle triggers:
- Incorrect transition logic could stall referrals.
- Must test transition matrix and rollback plan.

3. T8 PDF rendering:
- QR/watermark CSS may render differently in production renderer.
- Validate with real generated artifacts before release.

4. T2 confidence level back-compat:
- Existing rows may be null; UI fallback required.

## Definition of Done

1. Blueprint gaps closed for config, scoring tiers, 3-group matching, compliance/audit, manager ops, and verified gate.
2. Existing quick-qual flow still works for creation, preview, PDF generation, and upload link.
3. Verified path works end-to-end: upload -> review -> verified -> submit to development.
4. Integration suite passes and is required in CI.
