# Governed national Place search measurement

Runtime source **04821fe7ae6401e781925adce099a93ead08490a**, tree **9839a1d085edd6fcdc4786125cba54e4c29fd4ef** (accepted #594 merge). Runtime, schema, migrations and admission files are unchanged; only opt-in measurement/postflight harnesses and this evidence packet were added.

**Result: outcome checks pass; read and connection budgets fail under bounded concurrency. Production performance acceptance is not established.**

| Clients | Read p50 ms | Read p95 ms | Read p99 ms | Acquisition p95 ms | Graph/name p95 ms | Inventory p95 ms | HTTP requests/s | RSS p95 GiB | Unexpected errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 604.91 | 703.04 | 828.45 | 12.51 | 590.91 | 141.55 | 2.09 | 1.293 | 0 |
| 5 | 1606.09 | 2545.79 | 2893.74 | 179.31 | 1593.57 | 1523.36 | 3.58 | 1.632 | 0 |
| 20 | 7440.53 | 10355.47 | 10449.13 | 1134.44 | 4194.43 | 6022.95 | 3.2 | 1.850 | 0 |

The agreed general-read comparison is p95 ≤750 ms and p99 ≤2,000 ms, with connection acquisition p95 ≤250 ms and no exhaustion. Both latency limits fail at 5 and 20 clients; acquisition fails at 20. The 200 ms discovery figure is a proposal, not an accepted gate. No limit was weakened. These limits are sourced from the [B17 baseline](../../24-paid-mvp-launch-closure-execution-plan.md); this short closed-loop diagnostic is not its 10,000-listing/24-hour capacity acceptance. Zero unexpected application or outcome errors occurred in 220 final HTTP calls; this sample does not statistically prove a long-running <0.1% error SLO.

## Dataset and publication

The governed `admitted-national-non-osm-only-v1` release subset is 16,944 Places, 25,618 names, 16,935 relations, 79,189 reference evidence rows and 19,042 mappings. Registry/package/desired/held digests are retained in the prepare and verify outputs. All 720 held OSM-only identities and their dependent rows remain absent. Two valid operational coverage signals are separate from the reference-evidence cardinality; final governed verification accepts those operational signals and verifies reference assertions unchanged.

There are exactly 120 active synthetic house listings and matching available public projections: 72 Buy, 48 Rent. Distribution is 42 North Riding, 18 Bryanston, 12 exact Johannesburg city assignments and 48 listings across admitted localities in all nine provinces, with Buy and Rent in every province. Creation, submission, review and public projection used the existing domain services and genuine publication checks. Canonical reference/foundation/Search-to-Lead fixtures supplied a controlled disposable owner and its existing entitlements; the agency profile was completed through the normal API and current typed branding fixture. No payment API or commercial production activation was invoked.

All 120 source/projection pairs are independently audited as published/approved and available with matching Place identity and no fabricated numeric geography handles. Buy province scope is covered in the timed HTTP run; Rent for every province has separate positive membership/count/card-label proof in `postflight.json`. Exact locality queries find North Riding, exclude published Bryanston, retain canonical identity and public label, paginate and support Buy/Rent. Exact Johannesburg scope does not widen into localities. North Riding detail eligibility is proved through the actual public detail procedure. Competing geography is rejected before inventory SQL; development inventory explicitly reports unsupported Place assignment.

The former disposable Gauteng Soweto fixture (`pl-place-01-99b91be60755ea1f09bf6349`) belongs to the held 720 and is correctly absent from the national release subset. The exact-city national proof therefore uses admitted Johannesburg (`pl-place-01-21f154cd5d0954c29ec7525f`) instead. No release override was introduced.

Setup exposed fixture assumptions about publication readiness, the public `suburb` card field, domain slug suffixes and Buy/Rent distribution. Discarded setup/overlapping timing runs are excluded from final timing evidence. Duplicate own synthetic copies were archived through the normal domain lifecycle; the final physical census is 333 listing rows and 333 public-property rows, including 205 archived synthetic source rows and 204 archived synthetic projection rows. These archived rows are explicitly part of the physical query environment, not active customer inventory. The whole target has now been disposed.

## Measurement boundaries

Final timing window: 2026-10-08T14:30:01.814Z to 2026-10-08T14:31:25.944Z. There are 20 first HTTP observations, 20 warm-up calls and 60 measured calls each at concurrency 1, 5 and 20. Each measured window has 54 real reads and 6 expected rejection/unsupported cases; those cases are excluded from read latency percentiles. Raw observations are in `observations.jsonl`, with per-scenario p50/p95/p99, graph and inventory wall time, query count/duration/returned-row count, acquisition latency, response-size/serialization estimate, errors and memory snapshots. Each scenario has few samples; p99 often equals its maximum, and no stable production-tail estimate is claimed.

First observations follow fixture preparation. They are not a cold InnoDB or OS-cache boot. First-read p95/p99 are 735.96 ms (18 reads); warm-up p95/p99 are 694.24 ms (18 reads). Public inventory bypasses cached payloads and reloads authoritative graph/name projection on every request; Redis is the existing local in-memory mode. No shared MySQL restart or cache flush was performed. There is no parallel typecheck/build/load task in the final measurement window.

The local host is AMD Ryzen 3 3200G, 4 logical CPUs, 14576717824 bytes host RAM; Node v22.22.3 and MySQL 8.0.46-0ubuntu0.24.04.3. The existing runtime pool limit remains 10. RSS is process memory measured after responses, not a Railway/Azure allocation or full memory-capacity acceptance; no cgroup allocation limit was available at the conventional cgroup-v2 files. SQL CPU credits and production-storage headroom are not measured.

A representative warm North Riding query performs 17 database operations and transfers 50,941 rows to the driver, including 16,944 Place nodes, 16,935 containment edges and 16,644 preferred-name rows. The graph/name projection accounts for most sequential latency; concurrency also increases publication/inventory work and acquisition queueing. `maxQueuedAcquisitions` in the report means maximum pending acquisition callbacks (78), including callback scheduling, not a independently observed server connection count. Query duration includes acquisition/execution/transfer. Transferred rows are measured; physical rows examined are not. Serialization is a separate superjson estimate; client HTTP latency includes actual serialization and parsing.

No optimization or geography redesign was performed. A bounded performance correction should first address request-time graph/name loading and concurrent query work while preserving the approved identity, containment and mixed-authority contract. Any runtime correction changes the accepted source and needs its own source review and hosted CI.

## Customer and release separation

This diagnostic exercises actual discovery and inventory HTTP procedures, not the homepage browser journey or the private three-image upload. `EnhancedHero` still supplies legacy location IDs; the actual homepage Browse CTA is a possible entry path that remains to be proved with canonical selection after release. Homepage migration is not certified. The private North Riding draft/image/customer enquiry journey, IKaya organisation and pending-review state remain separate controlled customer checks. No founder-login, logout or Developer-registration correction was reopened.

No protected/remote database was accessed. No production schema/reference apply, deployment, payments opening or launch acceptance occurred. Production release application still needs Edward’s separate concrete approval; this packet reports a performance NO-GO, not release permission.

## Reproduction and lifecycle

Task category: database consumer/fixture measurement. Authority: AGENTS.md, database-authority skill and entry contract, manifest, canonical modular Drizzle/active SQL, database policy and compatibility register. Branch `measure/national-place-search-20261008`, owned worktree `property-listify-national-place-search-measurement-20261008`. Disposable target fingerprint **03e11127da916a0ba379166a75d55d8f790991724a06312d43a6ea4ae9e1d64b**.

Provision a new task-owned worktree/target through Database Authority; use the exact accepted source plus these harnesses. Resolve status/context, provision, plan and apply the fresh `none → 0111` migration transition once, prove congruency, then prepare and verify canonical reference, release-preview and foundation; prepare the isolated Search-to-Lead scenario. Never substitute the full 17,664-Place storage fixture. Regenerate `release-preview-verify.txt` for the new owned target before executing the harness.

```sh
NATIONAL_PLACE_BENCHMARK=1 SKIP_DB_INIT=1 pnpm test:authority -- --project=server scripts/__tests__/nationalPlaceSearch.measurement.test.ts
NATIONAL_PLACE_POSTFLIGHT=1 SKIP_DB_INIT=1 pnpm test:authority -- --project=server scripts/__tests__/nationalPlaceSearch.postflight.test.ts
```

Both opt-in suites pass. Touched-file lint has zero errors (10 warnings). Production typecheck passed once; test harnesses are excluded from its existing configuration. No unchanged broad local suite was repeated. Reverify the release subset, resolve the exact final owned context, emit its disposal acknowledgement and dispose that target only. The already-running shared MySQL service was preserved and remains available. All 112 canonical migrations were applied exactly once in this owned lifecycle; there was no failed migration, ledger repair or retry.

The report engine-version field was normalized from the observed mysql2 row/metadata tuple into its version string after measurement; `engine-version-observation.json` preserves that raw driver observation and pre-normalization report digest. No timing, count or error value changed. Evidence hashes in `SHA256SUMS` cover this complete packet.

Integration formatting removed trailing blank lines from four console captures; substantive command output, observations and report values are unchanged.
