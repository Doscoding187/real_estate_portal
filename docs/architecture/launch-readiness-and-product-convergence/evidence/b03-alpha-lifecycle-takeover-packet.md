# B03 Alpha Lifecycle Takeover Packet

| Field | Record |
| --- | --- |
| Recorded at | 2026-09-18T11:22:10Z |
| Worktree | `/home/edwardspc/Desktop/Dev/worktrees/property-listify-b03-alpha-lifecycle` |
| Branch | `fix/b03-alpha-lifecycle` |
| Starting HEAD | `c51041acd626e3973cbdc88080bb0074d8c95313` |
| Starting HEAD tree | `3ba026f82c9666e1cc431c3618b0eaeba87fca63` |
| Worktree state | Uncommitted implementation slice; eight tracked source/test files were present at takeover. This packet is added to record the verified snapshot. |
| Governing policy | [LRC-PAY-001 B01 decision](../03-launch-register.md#lrc-pay-001-b01-founder-commercial-and-operating-decision--2026-09-17), especially its payment-exception rule and B03 handoff. |
| Database authority | Canonical manifest head `0090_retire_disconnected_boost_campaigns.sql`; exact worktree-owned disposable target only, identified by sanitized target hash `756945f80a1e92be`. No protected or remote database was accessed. |

## Scope and decision

This is a bounded B03 implementation and verification packet for the Paid Launch
Access payment/term lifecycle. It is not a closure claim for LRC-PAY-001, B03,
or release readiness.

The slice corrects the B01-noted overpayment treatment and early-renewal conflict,
makes finance review an explicit integer-cent reconciliation action, prevents a
second proof for an already-paid invoice from being silently approved, and makes
fixed-term timestamp handling deterministic across canonical database timestamps.

Normal-runtime commercial activation remains gated. Nothing in this slice enables
payment collection, changes public paid claims, accesses a bank/provider, applies
a migration, or deploys an environment.

## Implemented behaviour

- Finance approval requires an explicit, safe positive integer amount in minor
  units. The API schema and service reject an omitted, fractional, non-positive,
  or unsafe value.
- An overpayment remains under review unless finance explicitly confirms
  reconciliation and supplies a non-empty audit note. The invoice retains the
  excess amount, reconciliation flag, note, and the
  `reconciled_overpayment_activates` rule.
- A second proof on an already-paid invoice cannot be approved again. Finance
  must record it as a duplicate, unmatched payment, or rejection; the duplicate
  decision requires a note and cannot extend entitlement.
- The gated finance UI now requires a verified-cent amount and reconciliation
  note for approval, and exposes a recorded duplicate-proof action.
- Active same-plan Launch Access can issue an early renewal. Approval preserves
  the current paid end as the next term start, retains the original current-period
  start, and records whether paid days were preserved.
- Paid terms use exact 90 × 24-hour durations and one canonical timestamp parser
  for MySQL-style UTC values, ISO values, and explicitly offset values. An expired
  term starts a fresh 90-day period after verified payment.

## Authority-claim records

### Explicit finance reconciliation and duplicate containment

| Field | Record |
| --- | --- |
| Claim | A proof cannot activate Paid Launch Access without a positive integer verified amount; an overpayment requires explicit reconciliation plus a finance note; an already-paid invoice cannot be approved a second time. |
| Mechanism | `billingRouter.ts` validates the request boundary. `billingFoundationService.ts` enforces amount/reconciliation conditions under the invoice/payment transaction locks and writes finance/audit metadata. `SubscriptionManagementPage.tsx` collects the same information behind the existing activation gate. |
| Sequence | Submitted proof → finance decision → amount/reconciliation and paid-invoice guards → verified/rejected payment state and invoice metadata/audit event → activation only for the one eligible full-payment transition. |
| Evidence | Static source inspection and the observed `commercial-launch-access-s4.integration.test.ts` execution on 2026-09-18: 6/6 tests passed, including unreconciled overpayment, reconciliation, duplicate-proof, concurrent approval, and three-owner lifecycle paths. |
| Boundary | The test uses a disposable worktree database and simulated proof data. It does not prove a live bank match, operator training, legal refund disposition, or production runtime. |
| Authority owner | B03 commercial access/billing-finance implementation; B15 retains legal wording and legal/accounting review. |
| Status | Verified for the stated local implementation/test sequence. |
| Next gate | Human finance rehearsal and B14/B15 operating/legal evidence before runtime activation or release. |

### Fixed-term renewal and expiry semantics

| Field | Record |
| --- | --- |
| Claim | An early same-plan renewal preserves already paid time rather than replacing it, while a post-expiry payment begins a fresh fixed term. |
| Mechanism | `activatePaidLaunchAccessForOwner` reads the canonical billable-account subscription, chooses its still-future end only for a matching active plan, and writes a deterministic 90-day term using the canonical commercial timestamp parser. |
| Sequence | Active paid term → early invoice/proof → one verified approval → existing end becomes next start → preserved original period start and extended end; expired term → invoice/proof/verified approval → current activation time becomes new start. |
| Evidence | Static source inspection; observed `commercial-launch-access-s4.integration.test.ts` execution (6/6); observed `commercialTerm.test.ts` execution (8/8) covering repeated UTC round trips, fixed-duration arithmetic, offsets, and invalid timestamps. |
| Boundary | This proves canonical subscription/payment state in the owned test target. It does not prove public-inventory expiry sweep, every public enquiry route, term-notice delivery, or an external customer journey. |
| Authority owner | B03 implementation, with expiry/public-journey follow-on shared with B04, B05, and B06. |
| Status | Verified for the stated local implementation/test sequence. |
| Next gate | B04/B05/B06 route and expiry-sweep evidence; B10 notification/scheduler evidence, including developer organisations. |

### Existing billing behaviour remains covered

| Field | Record |
| --- | --- |
| Claim | The amended review semantics did not regress the repository's focused persisted agency EFT acceptance flow. |
| Mechanism | The existing billing foundation acceptance integration exercises privileged review, proof protection, activation, replay idempotency, rejection/correction, and partial-payment completion. |
| Sequence | Test harness prepares the owned disposable target → executes the persisted acceptance workflow → asserts state and access results → exits successfully. |
| Evidence | Observed `billing.foundation.acceptance.integration.test.ts` execution on 2026-09-18: 2/2 tests passed against target `756945f80a1e92be`. |
| Boundary | It is targeted agency acceptance coverage, not a full repository suite, browser acceptance, production check, or human finance rehearsal. |
| Authority owner | B03 commercial access/billing-finance implementation. |
| Status | Verified for the stated local test sequence. |
| Next gate | Current-head review and broader required checks once this worktree is committed and proposed. |

## Validation snapshot

| Command | Observed result | Boundary |
| --- | --- | --- |
| `pnpm db:authority:status` | Canonical manifest head ready; worktree classified as its exact disposable target. | Authority classification only; no production/protected target was inspected. |
| `pnpm db:migrate:plan` | No pending migrations for the owned target. | Does not apply a migration or prove another environment. |
| `pnpm test:authority -- server/__tests__/commercial-launch-access-s4.integration.test.ts` | Passed: 1 file, 6 tests. | Focused DB integration scope only. |
| `pnpm test:authority -- server/__tests__/billing.foundation.acceptance.integration.test.ts` | Passed: 1 file, 2 tests. | Focused persisted billing acceptance scope only. |
| `pnpm exec vitest run --config vitest.server.config.ts server/services/__tests__/commercialTerm.test.ts` | Passed: 1 file, 8 tests. | Unit/controlled server-test scope only. |
| `pnpm exec vitest run --config vitest.server.config.ts` for the three commercial authority contracts | Passed: 3 files, 19 tests. | Static contract scope only; it does not exercise a payment provider or normal runtime. |
| `pnpm check` | Passed (`tsc --noEmit`). | Does not prove runtime behaviour. |
| `pnpm build` | Passed (`vite build`). | Bundle success does not prove browser or production behaviour. |
| `pnpm lint:check` | Exited 0 with existing repository warnings and no lint errors. | Warning baseline is repository-wide and is not represented as a clean-lint claim. |
| `git diff --check` | Passed for the implementation snapshot. | Does not constitute review, merge, CI, or deployment evidence. |

## Explicitly not closed by this packet

- Public paid-inventory expiry sweep and every public-enquiry path, including the
  B01-noted verified/badged-agent exception.
- Developer organisation term-notice scheduler coverage.
- Legal/accounting-approved cancellation, refund, dispute, invoice, VAT, Terms,
  Privacy, and customer-facing wording (B15).
- Human finance/support rehearsal, backup coverage, and release operations (B14).
- Browser or production verification, provider/bank integration, deployment,
  pull-request review, merge, or founder acceptance.

## Current review handoff

Before a pull request, review the current patch and rerun required checks against
the committed head and its exact base. A passing local test target or a source
snapshot must not be treated as deployment, production, legal, or release
acceptance evidence.
