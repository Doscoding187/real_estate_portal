# B14 operating-schedule reconciliation proposal

**Status: REVIEW REQUIRED — proposal only.** This record proposes bounded
changes to the B14 operating procedure for Edward's confirmed support and
billing/payment monitoring schedule. It does not edit the operating procedure
or runtime, perform a rehearsal, publish customer copy, change configuration,
or authorize database/provider/production work. B15 and B16 remain open.

## Review identity and source boundary

| Item | Identity |
| --- | --- |
| B14 review branch / worktree | `docs/b14-schedule-reconciliation-review` / `/home/edwardspc/Desktop/Dev/worktrees/property-listify-b14-schedule-reconciliation-review` |
| Local review-anchor commit / tree | `a05868c66f493e3cbc972a119074c91a10797777` / `b21f454e215d8b02129e4daa14ba6f8d338406d1` |
| Parent of anchor | B16 review commit `f3f99f806ea9ae6be3132e093ce1cf1a6f185a32`; the anchor preserves the exact accepted B03–B07/B16 source tree and is not a merge or integration decision. |
| B15 schedule/contact authority | `B15-FOUNDER-REVIEW-0.3`, SHA-256 `d2925868819a8614b95eee3cd7b3aebf437bbde084681c1b83f055d33165c368`. |
| Existing B14 worktree preserved | `/home/edwardspc/Desktop/Dev/worktrees/property-listify-b14-b18-launch-operations`, branch `docs/b14-b18-launch-operations`, HEAD `c409cb8393b8281199737ffafb94e75ff3dd4abb`; its older procedure predates the accepted founder-only model and was not used as the proposal base or changed. |

The proposal is based on accepted tree `b21f454e…`, whose B14 procedure is
`docs/architecture/launch-readiness-and-product-convergence/19-first-customer-operating-procedure.md`.
The accepted source file identities are:

| Source | SHA-256 |
| --- | --- |
| B14 operating procedure | `a90db2d822fd2400350bb9a0a066d1fb0a39c3ee84e142b8e765cbbe5e19f6d0` |
| `server/services/commercialActivationPolicy.ts` | `8701e7b11289e806b2f8bb5500e34640755c61c44931945af566199b37d55f20` |
| `server/services/billingFoundationService.ts` | `17b97169516a50d271d2da9bac18b4f80e17f866aa051a9831450377d70fa715` |
| `server/services/__tests__/paidMvpSalesPause.test.ts` | `ff4b4ee6658beb240ad1e5f330fd0fa804e0faa589ae38942a4abe58b386265e` |
| `server/__tests__/integration.launch-readiness-walkthrough.test.ts` | `f884ed4f95889a64c62e5eb0f1ac68d1e8aaacf7ec4e7b5e398bcee7370467d3` |
| `server/__tests__/commercial-launch-access-s4.integration.test.ts` | `77654aea28e0cab232d579e219c41b113896a369f809cc6c345bbe1418f6c1d6` |

## Findings

The accepted B14 procedure already preserves the central safeguards: Edward is
the sole founder-operated finance/support contact for the first cohort; finance
matches actual received funds to invoice, payer, owner, amount and reference;
proof alone never activates access; a finite `PAID_MVP_SALES_OPEN_UNTIL` window
is renewed only after due work is owned; missing or expired windows fail
closed; planned absence uses `PAID_MVP_SALES_PAUSED=true`; pending invoices and
proofs remain recorded; and paid access continues while new sales are paused.

The mismatch is procedural. The accepted runbook says “daily weekday” and
“next staffed weekday check,” and uses “one business day,” but does not define
the confirmed hours or exclude South African public holidays. It also does not
say what to do when the next actual operating check lies beyond the existing
runtime window limit.

The accepted runtime has an exact UTC `PAID_MVP_SALES_OPEN_UNTIL` deadline and
manual `PAID_MVP_SALES_PAUSED` control. Missing windows pause sales. Deadlines
are validated against the existing weekday-specific next-check limit, capped
at 72 hours; expiry is checked when policy is read, without waiting for a
scheduled worker or restart. `requirePaidMvpSalesOpen` guards invoice requests,
manual-EFT checkout and finance approval. The sales-pause control is separate
from enabled product keys: existing paid access remains available. Existing
tests include deadline expiry, missing-window fail-closed behavior, the
Friday-to-Monday bound and product availability while paused; the joined
walkthrough also contains an active-Agency pause scenario.

The runtime does **not** know the South African public-holiday calendar or
enforce 09:00–17:00 South Africa time. It accepts a manually supplied exact UTC
deadline. While the sales window remains open, invoice and checkout routes can
accept requests outside monitoring hours; the B15 wording says those requests
are handled during the next operating period.

## Proposed B14 procedure changes for review

These are proposed text/operating changes only. They do not alter the accepted
runtime limit or product access boundary.

1. **Define the operating period.** Replace unqualified “daily weekday” and
   “staffed” references in the founder-only workflow with “operating day” and
   “operating period”: Monday–Friday, 09:00–17:00 South Africa time, excluding
   South African public holidays. Requests may be submitted at any time;
   support and billing/payment requests received outside that period are
   monitored and answered during the next operating period. This remains
   founder-managed support and makes no call-centre, voice-line or immediate
   WhatsApp-response claim.

2. **Finance checks and activation target.** During each operating day, Edward
   reviews the finance queue, private proofs and actual bank receipts, records
   the match/decision time and audit reference, and processes valid matched
   payments within the one-business-day target. A proof alone is never enough.
   Count business days as Monday–Friday excluding South African public
   holidays. For a match made outside an operating period, begin finance
   processing in the next operating period and record the target against that
   business-day calendar. Keep unmatched, partial, duplicate, excess and
   unreadable payments pending for manual resolution. If current queue load or
   absence makes the target unreliable, pause new sales before accepting more
   payable onboarding.

3. **Sales-window renewal over weekends and public holidays.** After checks
   and ownership of due items, select the next actual operating check using
   the South African calendar. Set an exact UTC deadline for no later than
   that check, subject to the runtime's existing weekday-specific bound and
   72-hour maximum. A Friday-to-Monday 09:00 SAST check may be covered by the
   existing 72-hour Friday bound when its exact UTC deadline passes validation.
   If a South African public holiday or longer closure makes the next actual
   check later than the runtime allows, do not extend the limit: let the
   deadline expire and keep new sales paused until Edward resumes checks and
   issues a fresh bounded window. Requests and existing invoice or proof
   records remain queued; no pending finance decision is auto-approved. A
   missed renewal remains a fail-closed sales pause.

4. **Planned absence.** Before a planned absence longer than one business day,
   or any shorter absence that would cause the next required finance check or
   one-business-day activation target to be missed, reconcile or explicitly
   record due obligations. Set `PAID_MVP_SALES_PAUSED=true` through the
   reviewed runtime configuration and restart. Verify that new invoice/checkout
   requests and finance approvals reject, the operator status reports paused,
   pending invoices/proofs remain recorded, and an existing paid customer's
   access still works. Keep the enabled product list unchanged. Add no nominal
   backup; if the bounded founder-only model repeatedly misses its promises,
   B14 must narrow the offer or appoint an actually authorized operator before
   reopening.

5. **Unplanned absence and resumption.** The last bounded sales window expires
   automatically even without a restart. On return during an operating period,
   review readiness and the oldest open support, security/privacy, customer
   access, payment and lead obligations; match bank receipts and handle overdue
   proofs before reopening. Record and communicate any missed customer target,
   resolve/refund where applicable, and do not reopen while due obligations
   lack an owner or the schedule is not credible. Only then set
   `PAID_MVP_SALES_PAUSED=false` with a fresh exact UTC window inside the same
   bound, restart, and verify status plus controlled invoice and finance
   approval behavior. Keep products enabled so existing paid customers retain
   access throughout the pause.

## Runtime decision

**Recommendation: procedure changes suffice for the requested B14
reconciliation; no runtime change is demonstrated or proposed now.** The
existing manual deadline/pause controls already provide a fail-closed path,
guard the relevant new-sale and approval mutations, and preserve paid access.
The safe procedure is to let the window close early whenever a weekend/holiday
calendar would require exceeding the existing bound, then reopen only after
the next attended operating-period review. Do not add holiday lookups, change
the weekday limit, extend the 72-hour maximum, or toggle enabled products in
this scope.

A runtime change would be a separate reviewed requirement only if the owner
requires the application itself to automatically enforce South African
operating hours/public holidays, or if a future decision proposes windows
longer than the current bound. Such work would need focused fake-clock tests
for holiday/weekend deadlines and direct checks that invoice/approval guards
remain fail-closed while existing paid access remains available.

## Review evidence and limits

This is source inspection only. No test suite was run, no procedure/runtime
file was modified, and no Database Authority, provider, staging, production,
publication, merge or deployment operation was performed. Existing test
source covers the current bounded pause behavior but does not establish
South-African-holiday-aware runtime behavior or an operating rehearsal.

Proposed acceptance mapping:

| Requested area | Proposal coverage | Status |
| --- | --- | --- |
| Mon–Fri 09:00–17:00 SAST, excluding South African public holidays | Define operating day and next-period response; founder-managed contact boundary retained. | Proposed procedure update |
| Finance checks and one-business-day target | Daily queue/reconciliation record, valid-match rule, business-day calendar and overload pause. | Proposed procedure update |
| Weekend/public-holiday sales-window renewal | Use the next actual operating check; retain exact UTC deadline, existing bound and fail-closed gap. | Proposed procedure update; no runtime calendar |
| Planned/unplanned absence, pause and resumption | Explicit pause/verification, queue preservation, return triage and bounded fresh window. | Proposed procedure update |
| Existing safeguards and paid-customer access | No cap increase or enabled-product change; preserve active access while sales paused. | Existing runtime/tests support this boundary; not rerun here |

B15's customer-facing address, privacy-request route and remaining
disclosure/privacy decisions remain unresolved. B15/B16 remain open. No
publication, merge, deployment or production activation is authorized.
