# A3-A3 — Conversion Area Audit

| Field | Value |
| --- | --- |
| Slice | `A3-A3` (charter §4.3 Conversion) |
| Status | Draft area audit; synthesis input to A3-B1 |
| Core question | What stands between an interested agent and a verified, activated payer — and does every step respect the S1B prohibition boundary? |
| Evidence basis | Funnel inventory (`/advertise` → landing → select-package → EFT invoice → proof → finance verification) at main state `c035c7d5` |
| Runbook dependence | None direct (no conversion instrument in Q1–Q8); conversion-rate questions remain Unknown |

## 1. Existing inventory

### 1.1 The path into payment

Hub → landing → checkout chain: `/advertise` (hero stats "90 days / Once-off
/ No auto renewal"; TrustStrip "Manual EFT payment · Finance-verified
activation · No automatic renewal") → `SegmentationLayer` agent card →
`/advertise/sell/agents` landing (price always rendered from the canonical
catalog, never hardcoded; anti-overpromise banner "Launch Access does not buy
search priority, sponsored placement, guaranteed traffic or guaranteed leads";
8-question FAQ with FAQPage JSON-LD including the no-guarantee answer) →
`/agent/select-package`.

Checkout UX (`AgentPackageSelection.tsx`): 4-step activation strip ("Request
invoice → Pay by manual EFT → Submit proof → Finance verifies and activates"),
explicit "uploading payment proof does not activate access" callout, bank
detail grid, reference number, proof form with MIME/size validation, disabled
state when proof storage is unconfigured.

Server spine: `requestPaidLaunchAccessInvoice` (owner-row lock, outstanding-
invoice reuse, +7-day due), `submitPaidLaunchAccessPaymentProof` (hashed
private storage, `under_review`), super-admin finance queue with six decision
kinds, approval → `activatePaidLaunchAccessForOwner` starts the fixed term.

### 1.2 State truth after payment

`packageSelected` becomes true at **invoice request** (subscription row exists
in `pending_payment`) — but this is a UI-progress flag only. Real capability
gates are entitlement-based: `canPublishListings`/`canReceiveLeads` stay false
through `pending_payment` and `payment_under_review`
(`agentEntitlementService.ts:203–218`). Status-strip copy is accurate at every
state ("Invoice issued — payment outstanding", "Payment proof under review").

### 1.3 Friction and dead-ends found

| # | Finding | Severity |
| --- | --- | --- |
| F1 | Role preselection lost at peak intent: select-package routes unauthenticated users to **signin** mode; `registerRole` preselect applies only in register mode — a new agent must self-switch tabs at checkout entry | Medium |
| F2 | Rejected-proof deadlock: finance rejection leaves invoice `status:'submitted'`; `proofCanBeSubmitted` accepts only issued/partially_paid/overdue; re-request reuses the same invoice → panel permanently shows "already under review". Recovery requires off-product intervention | High |
| F3 | Agents get no billing notifications: invoice-issued/proof-received/verification-outcome branches notify agency owners only; agent feedback is toast-only on one page | Medium |
| F4 | No pending-verification destination: post-payment redirect fires only when status is `active`; a waiting agent has nowhere purposeful to land | Low-medium |
| F5 | Dead-ends by design: catalog-unavailable screen and unconfigured-proof-storage disablement are honest but terminal (Retry/Contact only) | Acceptable, noted |

Prohibition-boundary check: no surveyed surface adds proof, testimonials,
comparisons or performance claims — conversion persuasion relies entirely on
process clarity and honest limits, consistent with `PLT-PROP-10`.

## 2. Quality assessment

The assisted-EFT funnel is unusually well-truthed for a pre-scale product:
canonical price rendering, reuse-safe invoicing, auditable proof review, and
commercial-truth tests guarding the copy. The defects that exist are
concentrated exactly where intent is highest (checkout entry, rejection
recovery, waiting states). No e2e Playwright spec covers the conversion
journey end-to-end.

## 3. Agent value analysis

Core question answered: between interest and activation stand account creation,
a manual EFT round trip, and human finance verification — deliberate friction,
truthfully signposted at every step. What could silently lose a paying agent
is not doubt about the offer (the FAQ handles objections honestly) but process
traps: F2's unrecoverable rejection state and F3's silence during a multi-day
manual verification window. Conversion rate itself is Unknown — no funnel
instrument exists in the runbook; recorded, not estimated.

## 4. Decision-map row inputs (A3-B1)

| Field | Value |
| --- | --- |
| Existing | Complete assisted purchase path with canonical pricing and truthful objection handling |
| Quality | High integrity; three process traps (F1–F3) sit on the money path |
| Agent value | Clear expectations; risk of silent stalls during verification wait |
| Gap | F1–F5; no conversion measurement authority |
| Decision candidate | **Improve** — F1/F2/F3/F4 as small truth-restoring fixes routed through Agent product authority via AAE checklist; **Audit deeper** once any conversion data authority exists |

## 5. Implementation-slice candidates

Slice candidate: conversion-path repairs (register-mode handoff, rejected-proof
recovery route, agent billing notifications, pending-verification landing
state). All are existing-capability wiring, no new claims or offers; must pass
the AAE future-slice compliance checklist before backlog entry.

## 6. Evidence discipline

Funnel mechanics cited above from code/tests. Conversion rates, drop-off
points and time-to-activate are Unknown under current instruments.
