# Account-information delay — diagnosis and timing review plan

Status: timing-only candidate for senior review; no performance correction or deployment.
Production stays on `51cfb989aec18bc8051d76dbec86e570fad559cd`.

## What existing evidence establishes

The ordinary fresh login returned HTTP 200. Its subsequent account-information GET, using the normally issued browser session through Playwright APIRequestContext, exceeded the unchanged 8,000-ms limit. The native cleanup revoked that session; replay was confirmed unauthenticated. The initial real browser account-information calls had succeeded. Google proof and the logout correction are separate, established outcomes; this timeout does not demonstrate their failure.

[Existing provider HTTP observation](evidence/auth-me-latency-20261007/existing-http-observation.json) adds the previously missing edge evidence. At 17:11:15.220 UTC, the only `GET /api/trpc/auth.me` failure in the selected window reports HTTP 499, `totalDuration=8000` and `upstreamRqDuration=8000`, on the accepted API deployment. The preceding login reports HTTP 200 with 5,649-ms upstream duration. Earlier account-information calls report roughly 3.4 seconds; unauthenticated/revoked contexts were shorter. This points to upstream waiting for this candidate failed request, rather than proving an eight-second browser-only delay. It does not distinguish application work, queueing, database work or upstream network delay.

Original application request ID correlation is unavailable: the failing test supplied no explicit ID and received no response headers. The Railway edge ID `Yzmaway8TvebD25xipRofQ` is not the application's `x-request-id`. Existing application logs record login outcomes and expected access denials, but do not time successful account-information phases. The earlier 238–242-ms canonical user lookup used a separate diagnostic process/pool and cannot locate the eight seconds in the live HTTP process.

The real path is `createContext → authenticateRequest → auth.me`: verify session; look up session user; check session version/role and founder binding where applicable; check Agent availability; update last-sign-in; project entitlements; project distribution identities; serialize/complete the response. Entitlements themselves perform multiple canonical reads and may update profile completion under their existing conditions. No standalone user lookup substitutes for this path.

## Proposed temporary instrumentation

The candidate adds a request-scoped recorder and small call-site wrappers. Disabled configuration leaves driver methods untouched. Enabled instrumentation preserves query/execute choice, statement/options/values, connection authority, TLS, session checks, roles, query results, exceptions and existing fallbacks. No SQL, schema, grants, entitlement rules, readiness limits or deployment holds change.

Only exact `GET /api/trpc/auth.me` requests with a configured UUID are recorded. The window must expire within 30 minutes; at most eight one-shot request IDs are admitted per API process. Requests outside that scope produce no timing output. Configure only the Production API after separate review and attendance:

```
AUTH_ME_TIMING_REQUEST_IDS=<up to eight preallocated diagnostic UUIDs>
AUTH_ME_TIMING_EXPIRES_AT=<absolute UTC expiry within 30 minutes>
```

Values are prepared immediately before a separately accepted diagnostic rollout; this document has not applied them. A replica/process restart could admit a listed ID once again before the same absolute expiry, so the operator must keep the planned request budget and avoid restarts.

Records contain only the fixed route, validated request ID/source SHA, phase name, monotonic elapsed/duration, outcome, database operation index, statement hash and HTTP completion state. No cookie, token, SQL text, bound value, email, user object, exception message or stack is logged. The statement hash comes from the executed statement without bound values. Output is capped at 128 intermediate events per selected request, with a terminal response event retained. Logging failures cannot replace authentication results or exceptions.

The initial `arrived` record also captures the incoming `x-railway-request-id` as `railwayRequestId`, alongside the application's `requestId`, before authentication or response headers. [Railway documents this header for correlating requests with network logs](https://docs.railway.com/networking/public-networking/specs-and-limits). This recorder admits only a single string of 1–128 ASCII letters, digits, underscores or hyphens; this is a local logging bound, not a claim about a documented provider format. Missing, duplicate/array, oversized or malformed values are omitted without changing authentication. No other incoming headers are captured. The value is a correlation hint, never authentication authority.

Timing covers session verification, session user lookup, founder binding, Agent account availability, last-sign-in update, entitlements, distribution identities, canonical database access/initialization, individual database operations, and obtaining their existing pool connections. Pool leasing includes queueing or establishment of a physical connection; it does not isolate pure queue delay from connection/TLS setup. Operation timing includes leasing and driver/database round trips; do not sum nested durations. A disconnected client is recorded separately from a successful completed response, and later operation completion remains observable. A status code on `closed-before-finish` is not proof the client received that response.

The pool is instrumented only after creation by the canonical connection authority, before the existing Drizzle instance is published. No new connection factory or direct driver import is introduced. Unit simulations hold a lease beyond the client disconnect to prove the recorder can distinguish that failure from normal query completion. They establish instrumentation behavior, not a production bottleneck.

A local HTTP regression aborts the client after the request reaches the route but before response headers are sent. It verifies that the initial record already retains both IDs and that the application ID joins the subsequent disconnect record. Invalid/missing-provider-ID cases retain normal execution. These checks do not establish a live provider correlation or explain production latency.

## Attended diagnostic execution after review

1. Keep general customer testing paused. Obtain refreshed attendance for only the bounded diagnostic. Any diagnostic artifact must satisfy the existing exact-source review, acceptance and required CI gates; this local candidate is neither merged nor deployed. Maintain an explained release identity throughout any separately approved diagnostic rollout; do not bypass component agreement to enable logs.
2. Preserve approved Azure target/runtime credentials, owner binding, storage/Redis bindings and all other settings. Keep sales paused, admission/deadline absent, automatic deployments held and production TiDB writers stopped. Preserve unrelated Testing and staged changes. No schema apply or production dependency disruption is part of this plan.
3. Use only the existing consenting controlled Agent and normal login in an isolated browser. For up to three account-information requests, supply the preallocated UUID via `x-request-id`; retain that application ID in the browser evidence and API timing records. The API's initial record maps it to the separate incoming Railway ID; retrieve the provider HTTP observation by that Railway ID. The join is **browser → application ID → Railway ID → provider log** and does not depend on receiving response headers. Record browser monotonic start/end, response status and selected public response IDs. If browser network timing is collected, retain only phase durations; never persist raw CDP events/headers, cookies or token-bearing URLs. Do not generate an artificial session or grant a role.
4. Keep the 8,000-ms request limit. On a failed diagnostic request, stop dependent checks, retain the initial two-ID mapping, started/unfinished phases and provider request identity, then clean up the controlled session through normal logout. Do not automatically replay the failed customer journey, restart a pool/service or change a timeout.
5. Compare client elapsed time, provider upstream timing and the API's arrived/completed/disconnected timeline using that explicit two-ID join. An absent/invalid Railway ID or missing provider row is a correlation gap: report it without substituting the application ID or claiming time/path coincidence proves a match. Do not broaden header capture or the request budget. Within the API, attribute the delay to a measured phase and database operation/lease. A difference outside API timing includes browser/network/proxy work and is not automatically pure network delay. Map any slow statement hash to the existing canonical query; no statement/parameter dump is needed.
6. Return the measured bottleneck and only then propose a bounded correction. Validate that correction locally against its demonstrated cause and authentication invariants before submitting one complete candidate to required CI. If the small diagnostic does not reproduce the delay, report that limit rather than declaring it fixed.
7. Let the absolute window expire and remove only the two diagnostic settings through a separately approved configuration reconciliation. Retain evidence. Subsequent removal of temporary source instrumentation belongs to the reviewed correction/cleanup sequence, without changing authentication policy.

## Authority and current boundary

Classification: database consumer diagnostics; phase: inspect/plan/review. Database Authority entry, playbook, manifest, policy and compatibility register govern the unchanged consumers. Local status resolves an owned disposable worktree at port 3307; the local service remains stopped and was not provisioned. Tests use mocked dependencies with `SKIP_DB_INIT=1`. No database schema authority changed. Remote access in this phase was read-only provider HTTP log retrieval; no live database or new customer mutation was performed.

The candidate and this plan are a concrete reviewable diagnostic, not a claim that the delay is fixed. Founder login, founder repeat login/durable uniqueness, founder logout replay and the remaining unpaid journeys stay held until the authenticated account-information gate is established. Paid admission retains its separate approval.
