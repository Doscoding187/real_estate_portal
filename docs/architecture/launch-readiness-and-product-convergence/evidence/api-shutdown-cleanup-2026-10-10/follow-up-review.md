# Follow-up review: cleanup failures and startup cancellation

This is the current review supplement to [the original resource audit](review-notes.md). The original audit and command evidence are preserved. The local, unpublished patch was amended to retain one reviewable commit directly on accepted release source `49a48572c24d1b122fcf17b025a76e5ab77f03a8`. Worktree and branch remain unchanged.

## Correction

`server/_core/index.ts` now attempts each independent cleanup even when an earlier one rejects. It records and logs each original error, retains the first error object for the final failure message, and exits nonzero whenever cleanup or startup failed. A core or Explore Redis shutdown failure no longer skips Google Places, the in-memory cache, or database cleanup.

Dependency ordering remains explicit. Shutdown immediately cancels both scheduler startups and initiates HTTP closure. It then waits for the API startup task, HTTP requests, both scheduler stops, and readiness assessments before database closure. If any consumer drain rejects, the database stays open and the existing referenced 20-second watchdog remains armed. A consumer that never finishes its await remains subject to that same bound. After all cleanup attempts settle with an independent-resource failure, the watchdog is retained with `unref()`: it still fires at 20 seconds if a surviving resource keeps the process alive, while a fully released process can exit naturally with code 1. Successful cleanup clears the watchdog. No deadline duration or readiness acceptance criterion changed.

Both schedulers track a pending start and a lifecycle generation. `stop()` invalidates the generation synchronously, cancels the existing interval, and waits for both pending startup and active work to settle. A cancelled startup continuation cannot install an interval or start the saved-search delivery job. Concurrent start calls share the same pending start. A later explicit new lifecycle may still start normally; the API shutdown flag prevents its bootstrap from doing so.

API startup checks the shutdown flag after each asynchronous stage and before listening. A pending Node listen has an abort signal; shutdown cancels an unbound listener while an already-listening server retains the awaited HTTP close. Optional router loading is allowed to finish its in-flight import, then cancels mounting and further startup. Shutdown waits for that startup task before closing resources it could have loaded.

Follow-up changed runtime files: `server/_core/index.ts`, `server/services/commercialTermNoticeScheduler.ts`, `server/services/savedSearchDeliveryScheduler.ts`. Follow-up tests: the existing child-process test and fixture plus both schedulers' focused tests. No SQL, database authority, schema, migration, readiness monitor, Explore routing/feed, or geography authority was changed.

## Regression proof

The final new regressions were run against the previous local patch `06be2a2b193d0f00cded692257bc23646e7548cf` by temporarily restoring only these three task-owned runtime files from HEAD and restoring the corrected contents in a finally block. **All six new regressions failed**: four API processes remained alive past the unchanged four-second harness exit bound, and two scheduler lifecycle assertions failed. The startup process logs specifically show the original API logging cleanup completion, then reopening its listener after the held startup resumed. See [before evidence](follow-up-regression-before.txt).

The final API fixture uses the real API graph, cache/Google timers, scheduler instances and Redis implementations. For failure tests it calls the real Redis cleanup method and then rejects with a distinctive original error. Natural exit code **1**, released cache/scheduler state, and the real database module's cleared test-mode state are all asserted. These tests exercise API error handling; they do not simulate a database-bearing production pool.

For API startup tests, the fixture holds startup after a real scheduler start, sends SIGTERM, and releases the startup await only after that signal. It verifies that database cleanup did not occur during the pending startup, that cleanup subsequently finishes, and that no listener opens. The scheduler unit regressions separately hold the actual first notice query and saved-search history query through `stop()`, proving cancellation of the late interval and waiting for database work. Child-process timers are never mocked or forcibly treated as success; a harness timeout records failure before killing a stuck child.

Final child-process outcomes (measured after shutdown request):

| Case | Exit code | Signal | Duration |
| --- | --- | --- | --- |
| Normal SIGTERM | 0 | none | 64 ms |
| Normal SIGINT | 0 | none | 80 ms |
| Redis unavailable, retries active | 0 | none | 2039 ms |
| Google Places already loaded | 0 | none | 42 ms |
| Core Redis cleanup rejects | 1 | none | 41 ms |
| Explore Redis cleanup rejects | 1 | none | 38 ms |
| Saved-search API startup pending | 0 | none | 72 ms |
| Commercial API startup pending | 0 | none | 61 ms |

All eight process cases passed with natural exit, released-resource assertions and original-error assertions where applicable. No `process.exit(0)` or forced success was added.

## Checks and scope

- Focused validation across 11 files covered **143 unique tests**. The first final run passed 140 and timed out three unchanged readiness-pipeline cases at their existing five-second test limit while scoped compilation also ran: [complete result](follow-up-lifecycle-validation.txt). With compilation finished, the isolated readiness file passed all five cases with the same limit and acceptance criteria: [isolated result](follow-up-readiness-isolated.txt). The concurrency explanation is an inference; both outcomes are preserved. All 143 checks passed across these runs.
- Application `pnpm check` exited 0: [output](follow-up-typecheck.txt). The final scoped TypeScript check included API runtime, fixture, new lifecycle tests and both scheduler tests, exited 0, and removed its temporary config: [exact configuration and result](follow-up-test-typecheck.json).
- ESLint over all 15 code/test files touched by the complete patch exited 0, with zero errors and 118 pre-existing warnings; the additional saved-search files expose formatting warnings that were outside the original touched-file lint set. No broad formatting cleanup was added: [output](follow-up-touched-file-lint.txt).
- `git diff --check` passed.
- Re-ran the read-only database-authority status before editing scheduler lifecycle code/tests: [status](follow-up-database-authority-status.txt). Same registered disposable-worktree fingerprint `9d2d31953e4b4a4e000ed094fcb60906e5450e2361394d2a3306de8fe1b7a2c9`; no service available, database/schema/attempt state unverified. Validation remains database-free and no target was provisioned or mutated. Canonical authority and the operating guide from the original review remain applicable.

The focused Vitest command is the original review's 11-file command, now including eight API cases and the two new scheduler cases. The before command selected the six new regressions with `-t 'finishes independent|waits for .*startup|does not install|waits for pending'`. All Vitest runs used `SKIP_DB_INIT=1`; captured output was normalized only for trailing whitespace and terminal blank lines.

The original notes about request-scoped finite cache timeouts and development Vite resources remain separate concerns. The production process, Inspector client, firewall, deployment configuration, database, workers and traffic were not changed. No push, merge or deployment occurred. Senior recovery remains separate; return the amended commit through Edward.
