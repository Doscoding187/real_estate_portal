# Database takeover closure worklist

Status: incomplete. This is a prioritized execution index, not a replacement
for the acceptance requirements in `../implementation-plan.md`.

## Immediate validation work

1. Recover the complete failing-test inventory. The last complete run reported
   six failed tests, 4,119 passed, and 67 skipped. Its console output was
   truncated; only three failing suites were identified reliably. Do not claim
   all remaining failures are stale fixtures.
2. Verify the checkout/approval snapshot correction (`02b9ab57`) with the
   broader billing packet. Six focused physical tests passed; the owner lock
   now precedes the ordinary billable-account lookup for every owner type.
3. The stale grace-deadline and retirement-head tests were corrected in
   `c7872bdd`; 13 focused tests passed. Grace access requires a future deadline.
4. Repair `server/services/__tests__/propertySearchService.property.test.ts`:
   fixture setup inserts projection rows with a hard-coded owner, catches any
   failure, and makes test bodies return successfully. Use canonical source
   fixtures and fail setup when an explicitly configured database fails.
   Require non-empty exercised results where a property otherwise passes
   vacuously. Cleanup failures must remain visible.
5. Capture subsequent broad results to a persistent report before inspecting
   console summaries. A server-only run was started with output at
   `/tmp/takeover-server-results.json` and log `/tmp/takeover-server-run.log`;
   these are temporary local artifacts, not committed acceptance evidence.

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
