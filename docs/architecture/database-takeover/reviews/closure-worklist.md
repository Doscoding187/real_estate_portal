# Database takeover closure worklist

Status: incomplete. This is a prioritized execution index, not a replacement
for the acceptance requirements in `../implementation-plan.md`.

## Immediate validation work

1. Recover the complete failing-test inventory. **Resolved:** the corrected
   server authority run reports 359 suites and 2,220 tests passed, with 9
   suites and 67 tests skipped. The prior failures were closed in commits
   `9f4dc914` and `c9b86a06`.
2. Verify the checkout/approval snapshot correction (`02b9ab57`) with the
   broader billing packet. Six focused physical tests passed; the owner lock
   now precedes the ordinary billable-account lookup for every owner type.
3. The stale grace-deadline and retirement-head tests were corrected in
   `c7872bdd`; 13 focused tests passed. Grace access requires a future deadline.
4. Repair `server/services/__tests__/propertySearchService.property.test.ts`:
   **Resolved:** fixtures use a canonical owner, fail setup errors, align
   suburb ordering with the canonical projection, and clear the search-cache
   namespace.
5. Capture subsequent broad results to a persistent report before inspecting
   console summaries. **Resolved:** terminal evidence is recorded at
   `/tmp/takeover-server-results-20260912-rerun.json`.

## Required domain closure

- P2: complete crash/replay, reconciliation, worker authorization and consumer
  coverage; produce final packet review.
- P3: complete writer census and cross-supply projection lifecycle evidence.
- P4: close account and credential lifecycle coverage beyond accepted tenant
  and principal tests.
- P5: finish broader billing lifecycle review and distinguish provider-ledger
  tests from actual PayFast integration evidence.
- P6: complete commission settlement, referral and canvassing lifecycles beyond
  the accepted offer-acceptance race.
- P7: finish public journey, Commercial economics concurrency and provider
  evidence.
- P8: finish retention/abuse controls and retained projection/query evidence.
  Media and Explore aggregate rebuild proofs already exist; do not repeat
  their historical open status without checking the later evidence.
- P9: reconcile historical packet summaries and the table coverage register;
  verify every original acceptance requirement, required build/lint/test gate,
  and public/private journey against the final review commit.

A passing subset, schema congruency, or migration head alone cannot close P9.
