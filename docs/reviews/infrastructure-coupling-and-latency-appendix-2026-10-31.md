# Infrastructure coupling and request-latency appendix

**Static source audit, 2026-10-31.** No Railway operation, cloud read, production database access or workload measurement was performed. Engineer-days below are rough implementation estimates.

## Railway location and database delay

Railway’s current region page lists US West, US East, Amsterdam and Singapore, with no African deployment region. The Oct 7 retained API log records `edgeRegion=asia-southeast1-eqsg3a`, but Railway distinguishes the incoming edge point from the deployment region; that log omits `X-Railway-Upstream-Zone`, the header that identifies the region running the app. The project’s actual API/worker deployment region then and now is therefore unverified. The edge point does not move the service: a miss or uncached API request still goes to the deployed region. Cache safe public guide HTML and static data only; private responses, Set-Cookie responses and unheadered JSON stay dynamic. [Railway regions](https://docs.railway.com/deployments/regions), [edge vs deployment region](https://docs.railway.com/networking/edge-networking), [Railway CDN behavior](https://docs.railway.com/guides/cache-headers-cdn).

No current Railway-to-Azure South Africa North DB round-trip time was measured. Retained October auth.me observations with a Singapore-associated edge label range roughly 0.5–3.4 seconds, include a timeout, and are full HTTP request times—not DB RTT or proof of app location. They cannot prove current latency. See [retained request evidence](../architecture/launch-readiness-and-product-convergence/evidence/auth-me-latency-20261007/existing-http-observation.json).

Illustration only: at 100 ms database RTT, six dependent reads add about 0.6 seconds and fifteen add about 1.5 seconds; at 200 ms, they add about 1.2 and 3 seconds. This does not include API work, queueing or connection setup.

| Public endpoint | Code-derived serial DB stages | Why the count moves |
|---|---:|---|
| Canonical Place page | About 4–6 reads: selected Place, then relationship and parent reads per ancestry level; search projection adds batched ancestry and preferred names. | Parent depth varies. |
| Canonical manual search | About 15–18 serial stages under 250 candidates: Place projection, candidate select, public eligibility and ownership evidence, final page select. | Media checks run in parallel; development source also runs in parallel; each additional 250-row batch can add stages. |
| Listing detail | About 12 public eligibility stages plus the view-count write. | Image/media reads are parallel; identity and entitlement checks are dependent. |
| Development detail | About 5–7 reads: development, Place geography, review, units and optional publisher count. | Publisher count is conditional; Place ancestry varies. |
| Agent profile and inventory | Profile plus canonical areas about 3–5 reads; inventory is a concurrent API call with agent lookup, inventory and eligibility reads. | Inventory size and number of agent coverage Places change the count. |
| Property enquiry (property target) | About **18 serial DB phases before optional post-commit work**: 1 request-id lookup, about 12 public eligibility stages, then lead insert plus delivery idempotency/read/insert/lock and lead-summary update. | Recipient/context branches add reads or writes; notifications, counters and analytics run concurrently after commit. Replays take a different path. |

These are source-derived SQL stages, not a DB wire trace. Batches and Promise.all calls affect critical-path count; real p50/p95 and connection counts must be measured in an authorized Preview or disposable host. Relevant code: placeAuthorityRouter and placeDiscoveryService; canonicalPlaceSearchService and publicSearchService; propertySearchService and publicPropertyEligibilityService; publicDevelopmentDetailService; agentPublicProfileService; publicLeadCaptureService.

## Railway coupling inventory

I found no required Railway SDK. The app uses generic Node, tRPC, Drizzle and REDIS_URL interfaces, but runtime identity and worker admission are Railway-aware. Do not remove these checks until equivalent provider-neutral checks exist.

| Active coupling | Evidence and replacement | Estimate |
|---|---|---:|
| API/worker service definitions and commands | deployment/railway-api-service-settings.json, deployment/railway-worker-admission-service-settings.json, railway.email-worker.json, railway.lead-job.json; package build:railway is a no-op wrapper. The API manifest runs `node --import tsx server/_core/start.ts`, while server/README.md says `pnpm start:prod`; reconcile this documented startup-path mismatch. Replace startup, health, scaling and schedules with chosen host definitions. | 2–3 days |
| Worker admission identity | scripts/launchWorkerAdmissionCheck.ts requires Railway SHA, project, environment and service IDs. Replace with exact host/artifact identity and retain fail-closed admission. | 3–5 days |
| Environment and database authority | Runtime and safe local tools read Railway environment/name/domain/branch/SHA in runtimeBootstrap, hostedRuntimeConfiguration, securityRuntimeConfiguration, databaseAuthority/environment, worktreeIdentity, scripts/localEnvironmentAuthority.ts, scripts/localEnvironmentAuthorityContract.ts, scripts/print-db-target.ts, scripts/databaseAuthorityStatus.ts and scripts/localVisualJourney.mts. Preserve fail-closed remote-target detection and artifact proof for Azure. | 3–5 days |
| Health and diagnostics | Railway deployment/replica metadata, commit SHA and x-railway-request-id appear in hostedDatabaseReadinessMonitor, health, authMeTiming, commercialActivationPolicy and runSqlMigrations. Normalize safely. | 1–3 days |
| Web/API origin and deployment binding | vercel.ts proxies sitemap to the API domain; the production browser API URL and auto-deploy binding are account configuration, not read here. Repoint origins/CORS/build triggers and record rollback artifact. | 2–4 days |
| Redis/network | Runtime uses REDIS_URL; no production URL was found. If its value is Railway-private DNS, replace it and verify TLS/pool/failure behavior. | 1–3 days |
| Legacy deploy scripts and rehearsal | deploy.sh/.bat/.ps1 still reference Vercel/Railway. Replace only if still used; then rehearse API, email and lead workers together with queue/backlog and rollback. | 3–5 days |

**Total:** approximately 15–28 engineer-days (3–6 weeks for one engineer), excluding Next SSR. Unknown production configuration or a worker redesign can add time. The earlier “3–6 months” claim was not located in repository history, checked docs or GitHub issue search. Its source, task breakdown, staffing and assumptions could not be verified, so this estimate is a code-based counter-estimate rather than a proven schedule.
