# Controlled production cutover checkpoint — 2 October

[Sanitized checkpoint](cutover-checkpoint.json) records completed review/merge,
bindings, worker artifacts, containment and the failed API health gate. Private
provider responses, signing/storage credentials, mailbox addresses and runtime
logs remain outside the repository; evidence hashes preserve provenance.

PR #584 passed all five required checks at approved `fbdfb5f68` and merged as
`51802b7d3`. The unchanged reviewed role payloads and existing signing secrets
were applied while deployments were held, with independent readback and canonical
authorization. Email and lead workers succeeded at accepted M. Both API attempts
failed; their replicas were removed. No frontend deployment or hosted account
journey was started. Payment intake is closed and TiDB writers remain stopped.

The single unchanged diagnostic retry returned localhost HTTP 200 with the
correct Azure fingerprint, canonical 0094, physical schema congruency and
commercial foundation. Readiness took 12,167 ms, exceeding the joined probe's
8,000 ms timeout, and cache mode was memory. Full schema verification latency is
a plausible contributor to provider health failure; a particular provider
per-request timeout was not proven. Database readiness does not certify hosted
journeys or Redis readiness.

The proposed correction keeps every canonical SQL check and approval boundary.
One background assessment serves concurrent readiness requests. Until it passes,
or when its result expires, fails or belongs to another target/configuration,
the route remains unready. Result age is bounded to 30 seconds including assessment
duration; refresh starts five seconds after completion. Shutdown drains the
assessment before closing the database. Hosted cache uses the reviewed
`REDIS_URL`, opens the connection and verifies PING; memory/disconnected cache
fails readiness. No schema, migration, geography, role grant, storage policy,
credential payload or admission setting changes.

Initial validation at `aa9519b4d`: 15 focused readiness/cache/liveness regressions passed;
11 canonical readiness tests passed; the full database authority static gate
passed 442 tests and its utility/schema/inventory/lifecycle checks. TypeScript
passed. The Railway backend build command passed but is a documented no-op
because the backend runs directly through tsx. Fresh CI must certify the new PR
head; prior storage CI cannot certify this source correction.

Senior review at `aa9519b4d` requested a P2 correction: lifetime Redis error
telemetry made health permanently unhealthy after eleven failures, including
after a successful PING. The added mocked-transport HTTP regression reproduced
503 after recovery before the fix. Cache status now reflects current connection
and fallback state; the cumulative error counter is retained unchanged for
telemetry. On one server and one cache/client instance, the regression verifies
ready → eleven outage responses (503) → recovered Redis (200), then a second
outage/recovery. The counter remains eleven after recovery and twelve after the
second outage; no process/cache restart or telemetry reset is used.

After this correction, all 16 focused readiness/cache/liveness tests and
TypeScript passed. Touched ESLint passed with zero errors and six existing
warnings. Canonical SQL checks and their test sources are unchanged; the prior
11/442-test evidence is retained rather than attributed to the correction head.
Fresh exact-head CI and independent re-review are required.

This correction is not deployed or an accepted replacement for
`cbc18c8fdfb0a900c7255ca695da56bd9a7660c3`. Independent review and explicit acceptance
of the corrected application source are required by the exact-M directive before
deployment resumes. Then verify backend target/readiness and worker health before
manual frontend deployment and unpaid journeys. Frontend production value
readback remains pending: the screenshot establishes keys/scopes, not hidden
values. Hosted proof-owner checks, recovery, monitoring and operating obligations
remain open; paid admission requires its separate review.
