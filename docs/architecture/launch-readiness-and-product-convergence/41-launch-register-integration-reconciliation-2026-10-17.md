# Launch register integration reconciliation

17 October 2026. Evidence reconciliation of the complete LRC register against the
integrated production source. Corrects stale integration statuses only; grants
no release, hosted, commercial or protected action. B08–B18, the paid-opening
NO-GO and every owner-blocked item retain their existing dispositions.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `LAUNCH-REGISTER-RECON-2026-10-17` (launch-readiness packet 41) |
| Register | [`03-launch-register.md`](03-launch-register.md) — remains the register authority |
| Status | Reconciliation complete within the evidence boundary; LRC records updated to `integrated verified`; hosted/protected gates remain OPEN |
| Exact source inspected | `main` at `da6c21bae4c151acca0714b49189b911333b29d9`, tree `9bfeb0fb883c311721a56610c4f66aa769c35f32` |
| Evidence used | Git containment checks against `main`, current-main source inspection, GitHub required-check results, targeted test files |
| Boundary | No protected database, hosted environment, provider, payment, entitlement activation, deployment or production data was accessed. No post-integration runtime execution was performed for this reconciliation. Nothing here is production verification or a release approval. |
| Reviewer action | Spot-check cited containment and mechanisms; accept the status correction under the register integrity rules. |

## Why the register was stale

The complete LRC records were last written while each correction was still a
candidate branch. The accepted corrections were integrated to `main` on
30 September 2026 by merge `5c3f7eab4` ("Integrate accepted Paid MVP source
`a05868c6`", tree `b21f454e2`, parents `4e012b304`, `a05868c66`) and promoted by
PR #583 (merge `cbc18c8fd`, merged 2026-10-01T08:37:55Z, head
`feat/paid-mvp-integrated-release-20260930`). Required checks passed: Lint &
TypeCheck, Unit & Integration Tests (17m14s), DB Contract Verification, Location
Authority, Build Application, Build Frontend. The failed Vercel preview is the
founder-accepted non-gating exception already recorded in the register release
boundary. The Land public-search supplement entered later through PR #632
(merge `15c719435`, 2026-10-16; checks passed including Vercel).

Every repository commit cited by the LRC complete records was re-checked with
`git merge-base --is-ancestor <sha> main`: 95 of 96 are contained. Ninety-two
entered through the accepted integration merge `5c3f7eab4` (the accepted Paid
MVP source `a05868c6`, promoted by PR #583, merge `cbc18c8fd`); three
(`43243be47`, `90d46bcef`, `846f0b540`) entered through PR #632's merge chain.
The single uncontained commit, `a9dbb7ee9`, is the senior-audit documentation
reference cited in the PAY-001 record — evidence, not a correction. No new
code, migration or configuration is introduced by this packet.

## Per-finding reconciliation

Register status vocabulary: `Open, authorised, in progress, integrated verified,
production verified, deferred, closed`. Every row below moves `in progress` (or
the PAY supplement's `OPEN — senior review failed`) to `integrated verified`,
and the register's `Production verification` field remains `Pending`.
Containment legend: **A** = contained via `5c3f7eab4` (PR #583); **B** =
contained via PR #632 (`15c719435`).

| Record | Prior status | Reconciled status | Containment | Current-main mechanism inspected this pass | Residual |
| --- | --- | --- | --- | --- | --- |
| LRC-AUTH-001 — account recovery | in progress | integrated verified | A | `server/_core/email.ts` fails closed for an unconfigured deployed runtime (`:87`) and throws on provider failure for verification (`:196-204`) and reset (`:289-297`) | Real provider delivery unproved (B10) |
| LRC-AUTH-001 supplement — administrator-review route | in progress | integrated verified | A | `/admin/review/:id` mounted inside the registered admin guard (`client/src/App.tsx:255-256`); guard test `client/src/pages/admin/__tests__/adminReviewRoute.guard.test.ts` | Hosted admin access unproved (B18) |
| LRC-PUBLISH-001 — listing publication preflight | in progress | integrated verified | A | Submission preflight at `server/listingRouter.ts:1510` | Hosted behaviour unproved |
| LRC-PAY-001 — billing/activation containment | in progress | integrated verified | A | Product-scoped paid access: `server/services/commercialActivationPolicy.ts:239,337`, `planAccessService.ts:257`; product-less owner gate `billingFoundationService.ts:70-83` | Production activation remains policy-gated |
| LRC-PAY-001 supplement — enabled-release containment (product-less gate) | OPEN — senior review failed | integrated verified | A (`f3f99f806`) | Product-less `paid_mvp_release` activation is rejected (`commercialActivationPolicy.ts:337`); regression test `server/__tests__/commercial-launch-access-s4.integration.test.ts:738` | Production verification pending |
| LRC-MEM-001 — agency affiliation, private work and public recommendations | in progress | integrated verified | A | Membership authority `server/services/agencyMembershipService.ts:64`, consumed at `planAccessService.ts:345` and `agentEntitlementService.ts:158` | Hosted data state unproved |
| LRC-MEM-001 supplement — public-recommendation authority | in progress | integrated verified | A | Same canonical membership authority; containment verified, supplement behaviour not separately re-executed this pass | Hosted publication unproved |
| LRC-AGY-001 — agency entitlement and lead access | in progress | integrated verified | A | `agentEntitlementService.ts:212`; gated public profiles `agentPublicProfileService.ts:514,550` | Hosted agency journey unproved |
| LRC-AGY-001 direct-profile entitlement supplement | in progress | integrated verified | A | Containment verified; covered by the same entitlement authority cited above | Hosted flow unproved (B14/B18) |
| LRC-AGY-001 viewing UTC wire-boundary supplement | in progress | integrated verified | A | Containment verified; supplement boundary retained in integrated source (not separately re-executed this pass) | Hosted flow unproved (B14/B18) |
| LRC-AGY-001 client operating-date and viewing-input supplement | in progress | integrated verified | A | Containment verified; not separately re-executed this pass | Hosted flow unproved (B14/B18) |
| LRC-AGY-001 public preparation-entry supplement | in progress | integrated verified | A | Containment verified; pre-payment boundary retained via commercial activation policy | Hosted flow unproved (B14/B18) |
| LRC-AGY-001 authenticated billing-route supplement | in progress | integrated verified | A | Containment verified; billing routes retain canonical commercial boundary | Hosted flow unproved (B14/B18) |
| LRC-AGY-001 acquisition continuity and candidate review supplement | In progress: local acquisition gap closed with explicit fixtures | integrated verified | A | Integrated through `5c3f7eab4` (PR #583); local acquisition run recorded in the record's own evidence boundary | Consolidated hosted acceptance outstanding (B14/B18) |
| LRC-INVITE-001 — deferred agency invitation validity | in progress | integrated verified | A | `server/services/agencyInvitationDeliveryService.ts:12,68-82` gates delivery on canonical paid access; onboarding queues while activation is unavailable (`:193-233`) | Real email delivery unproved (B10/B14) |
| LRC-INVITE-002 — queued invitation acceptance containment | in progress | integrated verified | A | Same delivery/acceptance boundary; containment verified via `agencyInvitationDeliveryService.ts` | Real email delivery unproved (B10/B14) |
| LRC-GEO-001 — agent coverage identity | in progress | integrated verified | A | `server/services/agentCoverageAreaService.ts:39-43` — typed canonical labels only; browser input never trusted | Hosted onboarding unproved |
| LRC-COMMERCIAL-001 — commercial lead generic viewing boundary | in progress | integrated verified | A | Commercial boundary `commercialActivationPolicy.ts`; custody enforced per `publicLeadCaptureService.ts:549-586` | Hosted workflow unproved |
| LRC-COMMERCIAL-001 public-entitlement/custody supplement | in progress | integrated verified | A | Containment verified; public entitlement path re-inspected through the same lead-capture boundary | Hosted workflow unproved |
| LRC-LEAD-001 — platform-custody recovery audit | in progress | integrated verified | A | `server/services/leadRoutingCorrectionService.ts:50,126,277,443`; contract test `server/__tests__/contract.system-lead-routing-correction.test.ts` | Hosted operations unproved |
| LRC-LAND-001 — land public visibility containment | in progress | integrated verified | A | `shared/landLaunchPolicy.ts:27,31,42,67`; `landPublicService.ts:152,245`; `publicDevelopmentEligibility.ts:201` | Activation remains policy-gated |
| LRC-LAND-001 supplement — public specialist search entry | in progress | integrated verified | B | `server/landPublicRouter.ts:30,33` gates public search/detail; publication containment retained | Hosted search unproved |
| LRC-SUPPORT-001 — assisted support and disclosures | in progress | in progress (unchanged) | — | No correction integration exists to verify; remains blocked on owner-supplied support channel and final legal authority | Owner input required |
| LRC-AGENT-001 — Independent-Agent public onboarding truthfulness | in progress | integrated verified | A | Pre-payment boundary via commercial activation policy; public profile gates `agentPublicProfileService.ts:514,550` | Hosted presentation unproved |
| LRC-AGENT-001 preparation-lock wording supplement | in progress | integrated verified | A | Containment verified; covered by the same public presentation boundary | Hosted presentation unproved |
| LRC-ADVERTISE-001 — shared public advertising and Developer preparation entry | in progress | integrated verified | A | `isCommercialActivationAvailable` boundary (`commercialActivationPolicy.ts:239`) used by public-facing services; publication entitlement `listingPublicationEntitlementService.ts` | Hosted entry unproved |
| LRC-ADVERTISE-001 legacy activation-route supplement | in progress | integrated verified | A | Containment verified; legacy activation route retained under the same canonical boundary | Hosted entry unproved |
| LRC-DEV-001 — developer approval and trust-control truthfulness | in progress | integrated verified | A | `developerPublicationAccess.ts`; `publicDevelopmentEligibility.ts`; authoring gate `developerRouter.ts:1246` | Hosted approval flow unproved |
| LRC-DEV-001 authenticated subscription-route supplement | in progress | integrated verified | A | Containment verified; authenticated subscription route retained under the same entitlement authority | Hosted approval flow unproved |
| LRC-DEV-001 legacy authoring-route supplement | in progress | integrated verified | A | Containment verified; legacy authoring route retained under the same publication gate | Hosted approval flow unproved |

## September B01 dependency reconciliation

The B01 founder decision (2026-09-17) stays CLOSED and untouched. Its recorded
remaining implementation dependencies (register, "Remaining implementation and
operating dependencies") were re-checked against current `main`:

| Recorded dependency | Current state | Evidence inspected | Residual |
| --- | --- | --- | --- |
| Overpayment path marked `overpayment_activates` before explicit manual reconciliation | Addressed in source | `billingFoundationService.ts` requires `overpaymentReconciled === true` plus a note and records `reconciled_overpayment_activates`; covered in `commercial-launch-access-s4.integration.test.ts` | Hosted finance flow unproved (B14) |
| Expiry/public-enquiry boundaries; lead capture permitted badged agents without a current paid term; early renewal conflicted with an active term | Addressed in source | `isPaidMvpLaunchAccessSubscriptionEntitled` (`planAccessService.ts:257`) enforced across `publicPropertyEligibilityService.ts:426,470`, `publicLeadCaptureService.ts:549-586`, `agencyInvitationDeliveryService.ts`, `agentPublicProfileService.ts`, `demandEngineService.ts`; early renewal now extends from `currentPeriodEnd` with reason `active_early_renewal` (`billingFoundationService.ts:306-334`) | Hosted enforcement unproved |
| Developer term-notice recipients missing (scheduler queried agent/agency owners only) | Addressed in source | `commercialTermNoticeScheduler.ts:116-140` includes developer recipients | Hosted cron unproved (B13) |
| PPRA wording and external identity claims | Unchanged | Register B01 identity-terminology decision; B15 owns copy/legal proof | Owner/legal input (B15) |
| Genuine agency email invitation delivery and post-expiry agency operation | Code integrated; hosted delivery pending | `agencyInvitationDeliveryService.ts` | Real email (B10/B14) |
| Sole finance/support operator continuity rehearsal | Unchanged | None this pass | Hosted rehearsal (B14) |
| Invoice/payment/VAT/Terms/Privacy wording and legal links | Unchanged | Packet 40 prepares controlled installation only | Owner/legal input (B15) |

## Remaining gates (unchanged)

| Gates | State | Blocked on |
| --- | --- | --- |
| B08, B09, B10, B11, B13, B16, B17, B18 | OPEN — required remaining execution unchanged | Protected access, hosted environment and/or deployment spend |
| B14 hosted contacts/queues, delivery, pause/resumption | ACTIVE per 2026-10-13 progression; hosted cases outstanding | Hosted environment |
| B15 controlled installation and hosted acceptance | EVIDENCE INCOMPLETE | Exact-source integration execution, canonical install, hosted acceptance |
| LRC-SUPPORT-001 owner support channel and final legal authority | in progress | Owner input |
| Paid opening | **NO-GO** | Separate founder paid GO; unchanged |

## Boundary and acceptance checklist

Reproduction commands (read-only):

```
git merge-base --is-ancestor <cited-sha> main && echo CONTAINED
git log --merges --ancestry-path --format='%h %ad %s' --date=short <cited-sha>..main | tail -1
gh pr checks 583
gh pr checks 632
gh run list --branch main --limit 2
```

- [ ] 95 of the 96 cited repository commits are contained in `main`: 92 via
      `5c3f7eab4` (PR #583) and 3 via PR #632's merge chain; the lone
      uncontained commit is the acknowledged senior-audit reference
      `a9dbb7ee9`.
- [ ] PR #583 required checks are green; the failed Vercel preview matches the
      founder-accepted non-gating exception in the register release boundary.
- [ ] Cited source mechanisms exist at the inspected SHA paths/lines.
- [ ] Register integrity holds: compact index and complete records both read
      `integrated verified`; `Production verification` stays `Pending`; no
      accepted scope is reopened and no new scope is added.
- [ ] Unchanged: B08–B18 OPEN, B01 CLOSED, LRC-SUPPORT-001 in progress,
      paid-opening NO-GO.

No deployment, protected connection, paid activation or hosted execution is
authorised by this packet.
