# Hosted canonical search and national-dataset measurements

Status: actual hosted execution not run. The compatible API is offline and maintenance blocks API origins. The accepted load proves 16,944 admitted Places / 157,728 assertions and 720 held Places/dependants excluded; it does not prove API speed, positive inventory inclusion or homepage/other-domain geography.

`performance-evidence-status.json` preserves the earlier source `04821fe7ae6401e781925adce099a93ead08490a` local diagnostic: read p95 703.04ms at concurrency 1, 2545.79ms at 5 and 10355.47ms at 20. Concurrency 5/20 failed existing budgets; concurrency 20 also exceeded acquisition p95. These are historical measurements on a local 120-listing synthetic fixture, not the intended Railway/TiDB runtime or B17 capacity acceptance. No local synthetic-fixture test is permitted against production.

The baseline remains read p95 ≤750ms, p99 ≤2000ms, acquisition p95 ≤250ms, unexpected errors <0.1%, from the B17 execution-plan reference in that report. The proposed discovery 200ms number is not an agreed gate. Report confidence/sample size and every failing threshold; do not adjust the budgets to make a pass. B17's full 10,000-listing/24-hour acceptance remains separate from this bounded proof.

## Semantics before timing

Use the actual intended production API, exact pinned SHA, accepted fingerprint/head/reference policy and production resource configuration. Do not substitute a new runner, local loopback router, mocked DB, stale frontend, or an external database tunnel. Refresh source/config/deployment/readiness and dataset cardinalities through senior-owned access.

- Discover and explicitly select North Riding canonical locality, then execute its exact scope. Match canonical ID `pl-place-01-6a145c6d642ba208a2c12de7` and retain factual context.
- Search sale/rent/house/pagination using that single canonical authority. Compare every returned card to eligible existing inventory assigned to the exact approved locality. Exclude unrelated Bryanston canonical locality `pl-place-01-f175328139bb845a4645b9d4`, mixed-authority inputs, private drafts, retired/nonsearchable/held Places and an impossible-price result. Exclusion cannot be inferred only from a total count.
- Use admitted Johannesburg city and nine evidenced provinces with their existing declared scope; do not infer descendant membership, broaden locality to city, or treat Search Area membership as factual containment. All Land work remains subject to the Land journey contract and `LAND_PUBLIC_CLASSIFICATIONS`; this house proof does not certify Land/Explore/development/homepage/other-domain discovery.
- Positive public inclusion needs real existing eligible canonical inventory plus independent source/reference evidence. Empty results can prove a bounded exclusion, not inclusion. Do not publish the private draft or insert synthetic public inventory to manufacture a positive case. Missing positive inventory remains an explicit senior decision/blocker.
- No-result/ambiguous `placeAuthority.discover` writes governed coverage signals by design. It is not a harmless read-only benchmark. Perform such cases only in authorised application/proof scope and preserve the signal evidence. Do not disable instrumentation or mutate providers to obtain a benchmark.

## Bounded timed cycle and receipt

The prepared `hosted-search-probe.mjs` runs only query procedures after strict API source/readiness/target guards. It measures inventory HTTP requests (North Riding sale/rent/pagination/empty, Bryanston, exact city and all nine provinces), verifies mixed authority refusal and representative held-Place refusal, and records request distributions. It uses no fixture setup, authenticated customer mutation, discovery coverage write, publish, payment, migration or direct DB credential. Review the cases and operation scope before senior execution. It has not been run live.

From the packet directory, at the attended window, with task-private output:

```sh
umask 077
HOSTED_SEARCH_API_ORIGIN=https://api.propertylistifysa.co.za \
HOSTED_SEARCH_CONCURRENCY=1 HOSTED_SEARCH_REPEATS=4 \
node hosted-search-probe.mjs > /path/to/private/hosted-search-c1.json
```

If the first cycle passes and the senior permits the intended load, repeat at concurrency 5; concurrency 20 is a further explicitly reviewed capacity step, not an automatic escalation. Stop on semantic/source/readiness/error/budget failures. No default loop retries failures. Prefix/discovery latency and customer browser end-to-end timing require separate attended observations; this inventory harness does not claim them. Fewer requests cannot statistically establish the error rate threshold; report raw counts and sample size.

For each approved window, record start/end and first-observation/cache condition, concurrency, samples, warm-up policy, request IDs, per-case p50/p95/p99/max, errors/refusals, response sizes and card totals. Bind Railway deployment/region/CPU/memory limits, observed CPU/RSS/queue/connection pressure, TiDB topology/network/TLS/SQL version, pool limit, accepted reference counts and actual eligible inventory counts. Capture query/acquisition timing or explicitly mark it unmeasured; HTTP timing alone cannot prove the acquisition budget. Avoid claiming cold-cache results unless the actual cache condition establishes them; do not reset production caches for this preparation.

A sanitized final receipt must distinguish semantic inclusion/exclusion, actual hosted HTTP performance, backend acquisition/resource measurements and remaining capacity limits. The senior reviews all once before an unpaid reopening decision. Failed measurements remain evidence and route to application/recovery investigation without undoing the accepted data.
