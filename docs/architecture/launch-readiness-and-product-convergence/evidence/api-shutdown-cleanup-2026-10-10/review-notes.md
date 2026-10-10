# API shutdown cleanup review evidence — 2026-10-10

Task branch: `fix/api-shutdown-cache-cleanup-20261010`.
Task worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-api-shutdown-cache-cleanup-20261010`.
Integration base and accepted geography release source: `49a48572c24d1b122fcf17b025a76e5ab77f03a8` (verified against remote main before creating the worktree). The commit is a direct child of that source and can be reviewed/cherry-picked independently. No Explore routing, ranking, feed, geography authority, database query, schema or release acceptance changes.

## Confirmed defect and ownership

Read-only review used the senior worktree `/home/edwardspc/Desktop/Dev/worktrees/property-listify-national-place-search-senior-20261008` and its existing `docs/architecture/launch-readiness-and-product-convergence/evidence/geography-runner-execution-2026-10-10/` evidence: `RECOVERY-PAUSE-R2.md`, `api-shutdown-provider-logs.json`, `api-state-1791589042567890887.json`, and `api-stuck-process-observation-2026-10-09T23-41Z.json`. Those files were preserved in place.

Recorded evidence shows HTTP closed, schedulers stopped, readiness assessment finished, Redis closure logged, pool end completed without failure flags, and the API still alive with zero owned TCP connections. Raw exit field zero in a living process is **not** proof of exit. This patch makes no claim to have inspected or repaired the live process.

Both deployed source `68f2c679eb423dd0da8cb2b5115a85d4620a10aa` and accepted release source contain identical `server/lib/cache.ts` (Git blob `7df23fc13e51ff869908c51c177abaffc9d16297`). Its module singleton starts a referenced repeating 60-second interval. API startup loads it through `/api/explore` → `routes/exploreShorts.ts` → `services/exploreFeedService.ts` → `lib/cache.ts`; the shared discovery cache also uses this singleton. Neither source calls its `destroy()` during API shutdown. Setting `process.exitCode = 0` cannot drain this timer. It is a sufficient, reproduced cause of the failed exit gate.

The neighbouring audit distinguished additional source omissions from proven live causes:

| Resource | Actual ownership/load path | Bounded correction |
| --- | --- | --- |
| Explore in-memory cache | Existing module singleton, reached during API boot | Call its existing `destroy()` after HTTP/scheduler drain; clear and null its interval, making repeat cleanup explicit |
| Explore Redis singleton | `index.ts` → `routers.ts` → `cacheRouter.ts` → `lib/redis.ts`; constructor connects when REDIS_URL exists | Await its disconnect; QUIT ready clients, cancel opening/reconnecting clients, await initializer unwinding, share repeat-close promise |
| Core Redis manager | API `initializeCache()` | Track/cancel its connection-check timeouts; block rearming after close, including a late failed ping; close once; release socket and propagate QUIT failures |
| Google Places singleton | Location procedures dynamically import it after a request; neither boot alone nor shutdown needs to instantiate it | Register only the loaded singleton in a small lifecycle module; destroy it at shutdown without eager import; cancel both repeating housekeeping and outstanding session-removal timers |
| Saved-search scheduler | API start; existing async `stop()` already waits for its current run | Await the existing stop before proceeding to pools |
| Commercial notice scheduler | API start; prior stop only cancelled the interval | Track the current tick and await it at stop; keep all three notice windows and notification behavior |

Google Places is not established as a contributor to the recorded live stall. Static review of **both source SHAs** shows the location routers mounted through tRPC, with Google Places imported only inside certain procedures. This is more precise than the recovery note's description of those routers as unmounted. The separate Redis client's omission and the core retry-timeout omission are confirmed source defects; no recorded evidence establishes them as surviving resources in that particular drained process.

Housekeeping `unref()` was considered. These intervals remain referenced, with explicit destruction, so the process regression directly detects missing cleanup without depending on an unref safeguard. No essential job's reference behavior was changed. The 20-second API drain deadline, error exit behavior, HTTP close await, readiness stop await, auth/public-lead/founder Redis cleanup, and canonical database pool cleanup remain. Cleanup failures are logged and result in nonzero exit; new Redis close code preserves rejected QUIT errors rather than reporting success.

## Regression and validation

Captured command outputs retain their content; trailing whitespace and terminal blank lines were normalized for Git whitespace checks.

`server/_core/__tests__/apiShutdown.test.ts` spawns the actual Node process with the real API entrypoint and route graph. Its fixture loads the existing cache singleton, inserts a sentinel, optionally loads real Google Places and its session timer, and checks released cache/scheduler state at natural `beforeExit`. All relevant timers and both Redis client implementations are real in this child. The Redis-unavailable case waits for both clients' real failure/retry paths before requesting shutdown. The parent sends SIGTERM or SIGINT only after startup and verifies **code 0, no exit signal, and natural termination within four seconds**. There is no `process.exit(0)`, forced success or mocked timer. A failed harness deadline marks failure before SIGKILL solely to reap a stuck test child.

The child deliberately uses a minimal environment, `NODE_ENV=test`, no DATABASE_URL, and imports `index.ts` directly to avoid loading workstation credentials through the environment bootstrap. The repository's existing database-free test mode is the only database substitution. Startup emits its existing mock-database probe/notice errors; these are unrelated to resource exit, preserved in the baseline log, and not repaired or interpreted as readiness acceptance. No live database, schema, connection pool or database readiness acceptance is exercised by this child test.

| Check | Result |
| --- | --- |
| Final four process cases against original runtime files restored from release source | **4 failed**, each still alive beyond the four-second shutdown bound; command exit 1; [raw evidence](regression-before.txt) |
| Focused lifecycle validation | **137 passed across 11 files**, command exit 0; [raw evidence](lifecycle-validation.txt) |
| Final process regression after stronger scheduler-state assertions | **4 passed**, each cleanup-completion log and `SHUTDOWN_RESOURCES_RELEASED` observed, then code 0 with no signal; [raw evidence](natural-exit-final.txt) |
| `pnpm check` | Exit 0; [output](typecheck.txt) |
| Additional scoped TypeScript check including new child/fixture and affected lifecycle tests | Exit 0; temporary config extended `tsconfig.check.json`, included the process test, fixture, Redis lifecycle/connection tests and commercial scheduler test with no excludes and no incremental output; config removed afterward |
| Touched-file ESLint | Exit 0; **0 errors, 36 existing warnings** (formatting, any and unused variables in pre-existing code); new test files have no warnings; [output](touched-file-lint.txt) |
| `git diff --check` | Passed |

Final natural-exit timings measured from the shutdown request:

| Case | Exit code | Exit signal | Shutdown duration |
| --- | --- | --- | --- |
| SIGTERM, normal startup | 0 | none | 38 ms |
| SIGINT, normal startup | 0 | none | 30 ms |
| SIGTERM, Redis unavailable with retry paths active | 0 | none | 1661 ms |
| SIGTERM, Google Places already loaded | 0 | none | 34 ms |

Focused command (all run with `SKIP_DB_INIT=1`):

```sh
pnpm exec vitest run --config vitest.server.config.ts server/_core/__tests__/apiShutdown.test.ts server/_core/cache/redis.connection.test.ts server/lib/redis.lifecycle.test.ts server/services/__tests__/googlePlacesService.test.ts server/services/__tests__/savedSearchDeliveryScheduler.test.ts server/services/__tests__/commercialTermNoticeScheduler.test.ts server/_core/readinessSnapshotMonitor.test.ts server/_core/hostedDatabaseReadinessMonitor.pipeline.test.ts server/_core/authRateLimitStore.test.ts server/_core/founderGoogleIdentity.test.ts server/services/__tests__/publicLeadRateLimitService.test.ts
```

The regression-before run temporarily substituted **only this task's six changed runtime files** with exact HEAD contents and restored the patch in a finally block. No other worktree or evidence was changed. Unit coverage additionally proves repeated cleanup, cancellation of opening Redis connections, suppression of retries after an in-flight ping fails, propagation of Redis QUIT failures, cancellation of Google session timers, and waiting for an in-flight commercial notice run. Readiness recovery/fail-closed tests remain passing.

## Database procedure and remaining concerns

Applied the repository database-authority operating guide and read its entry contract, playbook, policy and exception register because scheduler lifecycle code and its mocked tests are involved. Classification: bounded runtime resource lifecycle, **no database target for validation**. `pnpm db:authority:status` ran read-only before edits: registered disposable-worktree identity, fingerprint `9d2d31953e4b4a4e000ed094fcb60906e5450e2361394d2a3306de8fe1b7a2c9`, manifest head `0111_properties_canonical_place_reference_fk.sql`, service unavailable; ledger/attempt state not evaluated. No database provisioning, migration, data mutation or protected access occurred.

Separate, unchanged lifecycle concerns: the core cache's request-scoped `fetchWithTimeout()` leaves a finite one-shot timeout after a fast fetch; this may delay exit up to that timeout but is not a boot-created repeating resource or the recorded indefinite stall. Vite development middleware owns watcher/socket resources in the frontend-development path; production serves static files, and this test uses backend-only mode. Request-scoped Google API retry delays and asynchronous usage logging were not redesigned. Third-party Express memory-store housekeeping already uses unref. This patch does not prove live-process recovery or a database-bearing production drain; the senior still owns that separate recovery and release review.

Changed runtime files: `server/_core/index.ts`, `server/_core/cache/redis.ts`, `server/lib/cache.ts`, `server/lib/redis.ts`, `server/services/commercialTermNoticeScheduler.ts`, `server/services/googlePlacesService.ts`, and new `server/services/googlePlacesServiceLifecycle.ts`. Tests: new process test/fixture and Redis singleton lifecycle test, plus bounded additions to existing Redis manager, Google Places and commercial scheduler tests. This directory contains review evidence only.

No push, merge, deployment, Inspector/client edit, firewall/configuration change, worker resumption, deployment removal or traffic reopening was performed. Return this commit to the senior through Edward.
