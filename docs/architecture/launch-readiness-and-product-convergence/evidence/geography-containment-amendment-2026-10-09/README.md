# One amendment: drain existing runtime children before Railway removal

**Senior-corrected operational candidate; separate containment approval remains required. Not executed on production.**

The [senior correction review](SENIOR-REVIEW.md) supersedes the original client proof for execution. Original provider and method evidence remains historical; use the revised client hashes and `senior-method-result.json` for this revision. The investigation establishes that a saved Railway grace interval is insufficient for the running artifacts. This amendment replaces provider-first removal with an attended, process-specific drain. It requires temporary loopback Inspector access, an observation wrapper around the existing pool's `end`, scheduler quiescence, and holding three intermediate launchers. These are additional operational changes; the previous schema approval does not implicitly approve them.

Codex operates; Edward attends and owns incident/recovery decisions. Attendance for the October 9 window has not been confirmed. **Propose October 10, 2026, 18:00–20:00 SAST / 16:00–18:00 UTC**, subject to explicit acceptance, refreshed prerequisites, and attendance. No production action follows from elapsed time or from this packet's creation. The October 9 approval is recorded in the [preflight stop](../geography-schema-stage-preflight-stop-2026-10-09/README.md); this proposal does not silently extend it.

## Unchanged protected authority

| Binding | Exact value |
| --- | --- |
| Accepted schema source | `49a48572c24d1b122fcf17b025a76e5ab77f03a8` |
| Accepted source tree | `f0db8b4f4b964346f28282f9616d0e59d3e673e0` |
| Schema plan | `d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d` |
| Target | Azure MySQL `propertylistify-mysql/propertylistify_database` |
| Target fingerprint | `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced` |
| Transition | 0096 → 0111; the same 15 approved DDL statements |
| Manifest digest | `600ccfc5ae5ddc480fe0274edc8a5e3624c2bab32aa3da65f314acd3803cef3c` |

No schema, migration, runtime query, released reference input or accepted application source changed. The [original execution packet](../geography-attended-execution-2026-10-09/README.md), its exact migration inventory, independent runner, preservation and schema-compatible deployment remain the downstream plan. Its Azure region prose is corrected by the stop record: **South Africa North**. The pre-schema reference digest remains null; this task does not generate or apply reference data.

## Effective Railway behavior and signal delivery

[Provider probe](provider-probe.json) binds a credential-free disposable service/environment in the same project. The decisive direct-Node deployment started with a zero-second manifest, was RUNNING, then its service grace field was changed to 30 seconds with `skipDeploys=true`. Readback retained the same running deployment ID. Removal delivered SIGTERM to Node PID 1 at **16:07:31.899Z**; HTTP closed, and the five-second marker appeared. Railway recorded **Stopping Container at 16:07:42.567082977Z**, about **10.668 seconds later**. The prepared 12- and 20-second completion markers did not appear. [Raw provider logs](provider-removal-logs.json) preserve the events.

Therefore the **tested removal path did not retrofit a 30-second graceful interval**. It is unsafe to infer graceful removal of the old API/email deployments from a saved setting. This does not claim a universal Railway timing rule, prove grace on a future deployment, or test a production stop. The removed ALWAYS-policy probe had no replacement active deployment in the subsequent observation. [Cleanup readback](probe-cleanup-readback.json) confirms the disposable service/environment are gone; the original three environments/four services remain. No production configuration was changed for the probe.

[Current process bindings](current-process-bindings.json), read at approximately 16:29:44 UTC, show each real command has this chain:

```text
PID 1 global pnpm launcher
  └─ PID 48 pnpm 10.4.1
       └─ PID 60 sh -c tsx ...
            └─ PID 61 tsx CLI
                 └─ PID 77 actual Node 22.23.3 application
```

These PIDs are observations, **not reusable command constants**. Re-resolve the exact instance, full ancestry, argv, file hashes and `/proc/<pid>/stat` start ticks before every operation. Stop on any drift or extra replica. The API starts `pnpm start:hosted:api`; email starts `pnpm email:supervisor`.

[Corrected ESM wrapper fixture](wrapper-fixture-result.json) uses the installed versions, deployed package type and exact command strings. SIGTERM to its outer pnpm did not reach either synthetic application during the 3.5-second observation. The fixture sends no signals to production. This bounds signal propagation evidence; it is not a production batch or DB-drain proof.

Railway documents service configuration as affecting subsequent deployment behavior; its teardown documentation does not substitute for this removal observation. [Teardown](https://docs.railway.com/deployments/deployment-teardown), [restart policy](https://docs.railway.com/deployments/restart-policy).

## Exact proposed artifacts and scope

- [drain-session.cjs](drain-session.cjs): operator-only Inspector client. `inspect` resolves existing singleton references and validates shapes/PID without quiescing them. `arm` requires the explicit amendment approval marker, observes the **original** pool `end` completion and, for API only, stops both existing scheduler timers, closes the HTTP listener gracefully and observes current requests/jobs before SIGTERM. `state` returns only drain/activity flags. It creates no pool, imports no target application module, runs no SQL, sends no signal and makes no provider change.
- [method-fixture.cjs](method-fixture.cjs), [result](method-fixture-result.json): DB/provider-free ESM proof using the actual installed Node/pnpm/tsx. Existing-scope discovery, timer cancellation, mocked current work, HTTP close, original mocked pool-end completion and child exit zero passed for both roles. Three intermediate ancestors were stopped; the outer launcher remained sleeping/alive. Only fixture-owned process groups were cleaned up. Temporary files were removed. This verifies the mechanism, not actual customer requests, batches, connections or production closure.
- [wrapper-fixture.cjs](wrapper-fixture.cjs): the focused command-wrapper signal check. Earlier diagnostic bodies omitted the ESM package boundary; the attached final result corrects it. No unrelated tests or unchanged performance/build/typecheck cycle was repeated.
- Existing [maintenance edge rule](../geography-attended-execution-2026-10-09/maintenance-edge-rules.json), [independent release runner](../geography-attended-execution-2026-10-09/release-runner.railway.json), protected schema inventory and compatible-deployment manifest remain the reviewed artifacts. Hashes of this amendment's artifacts are in [SHA256SUMS](SHA256SUMS).

Inspector access allows code execution inside the process and is therefore an explicit part of the amendment's approval scope. Bind only to **127.0.0.1**, connect through SSH in that exact container, expose no domain/proxy, copy no credentials and take no heap dump. Do not change application source, restart it to enable inspection, add an HTTP administration route or register a persistent agent hook. [Node 22 Inspector authority](https://nodejs.org/docs/latest-v22.x/api/inspector.html), [Node debugging access](https://nodejs.org/en/learn/getting-started/debugging).

If the pinned runtime does not expose the exact existing references expected by the client, **stop before any application SIGTERM**. There is no import/cache/schema fallback or inferred second singleton. Inspector discovery and real drain telemetry are execution gates, not already-completed production evidence.

## Bound operations, in order

Railway project `8cdd7515-ddd2-4252-bbee-df5a5c209d4b`; production environment `63070d99-357a-40ba-99c3-6d1368f61652` only. Preserve absent Git triggers, Vercel `main` automatic-deployment hold, Redis and all payment holds. Re-read the IDs below before the attended window; changed artifacts require an updated reviewed binding.

| Writer | Service / deployment / instance |
| --- | --- |
| API | `db88a720-2d1f-4afc-a3a8-6228b6b08d3e` / `93b7b423-91ac-4855-b8a7-e8fb53a0f112` / `41e46a78-215c-4feb-9c7a-b0aa7d5faf50` |
| Email | `59c0d8f8-abe2-4696-ad9c-de1037723b66` / `4d18e7ce-084c-486a-87b1-39dca207bdde` / `247f1dd2-351f-4eca-9e9d-848aad046f9e` |
| Lead cron | `e1e32aa8-0b85-4c91-af18-843f1bc52d9f` / `19a8fac1-b750-4a8f-8f5d-1d94e725f460` |

1. Confirm Edward's amendment/window/attendance, exact source/digest/target, existing recovery artifacts and independent runner connectivity. Confirm approved read-only inspection can see **all relevant target sessions/transactions**, not merely its own account. If visibility is insufficient, stop; no grant change is approved. Edward accounts for all admin/import/other-environment writers. Take no frozen-state backup yet.
2. Install and verify the existing all-request edge block on **both** API origins. Commit the lead service's cron-null patch with `skipDeploys=true`; record the workflow completion, effective readback and unchanged deployment. Allow its current one-shot to finish normally. A field readback alone does not prove scheduling stopped: later verify zero instances/no new execution across the observation period. No lead restart/removal while a job is active.
3. In each exact API/email instance, resolve the live application and its ancestors. Verify Node/options do not redirect Inspector to a public address and that its loopback port is unused. After approved scope validation, send **SIGUSR1 to the actual application child**, not pnpm. Verify the Inspector listener is only 127.0.0.1; discover its actual WebSocket UUID through loopback. No breakpoint/pause/CPU profiling/heap dump. A binding or address mismatch stops.
4. Copy the checksum-verified client to an owned mode-0700 temporary directory. Create a private mode-0600 binding file containing the actual loopback endpoint, `role`, freshly resolved `pid`, `/proc/<pid>/stat` field-22 `startTicks` as a decimal string, unique operation `token`, and `approval: "EDWARD_APPROVED_ATTENDED_CONTAINMENT_AMENDMENT"`. It contains no credentials. Run `node drain-session.cjs <binding-file> inspect` for each role; require the exact live singleton interfaces before `arm`. Run `arm` once, never automatically retry an uncertain arming result. Every inspect/arm/state checks PID and start ticks; state also requires the matching role and token. Each Inspector connect/command/disconnect has a five-second observer deadline, with a 60-second whole CLI ceiling. These deadlines close/exit only the observer, never cancel the target operation. After interruption, use a fresh read-only state observation on the exact binding and report uncertainty; do not re-arm. Success is printed only after the Inspector client disconnects.
5. API: `arm` stops both timers synchronously and calls the existing HTTP server’s graceful `close`, without a forced-close timer. Use `state` until `httpClosed=true`, `savedStopCompleted=true`, both schedulers have `running=false` and `timerActive=false`, and neither close/stop nor logging failed. Budget **120 seconds** for requests and scheduler work; an overrun stops for an attended extension while the application remains alive, not a kill. Recheck immediately before API SIGTERM; maintenance excludes manual API scheduler triggers. The 20-second native API deadline begins only after requests and scheduler work have finished; the native handler skips the already-closed HTTP listener and performs its remaining awaited cleanup.
6. Hold **only the three intermediate launchers** (pnpm child, shell, tsx CLI) with SIGSTOP, nearest application ancestor first, verifying state T and unchanged start ticks for every one. **Leave namespace PID 1, the application child, esbuild and the SSH/controller processes running.** Do not signal a process group. PID 1 remains alive waiting on its stopped child; the frozen launchers cannot reap/relaunch the application. Both API ON_FAILURE and email ALWAYS must therefore have no container exit to restart during drainage. A failed hold, launcher change or provider instance replacement stops before SIGTERM.
7. Send **one SIGTERM directly to each verified application child**. API: require already-proven graceful HTTP closure, followed by original pool-end completion within its existing **20-second** cleanup deadline, no deadline-exceeded/failure log and clean exit zero. Email: allow **up to 15 minutes** for its current batch and awaited pool-end completion; its handler aborts future batches and its supervisor awaits the current batch before closing. Observe its terminal batch aggregate if one was active. A provider call has no timeout: 15 minutes is an **operator stop/escalation boundary**, not authority to kill, remove, retry sends or treat a ten-minute claim lease as completion. API and email may drain concurrently after their respective prerequisites.
8. Retain token-bound `HTTP_CLOSED` (API), `POOL_END_STARTED`, `POOL_END_COMPLETED`, scheduler flags, email terminal batch/idle evidence and absence of failures. Disconnect any Inspector observer before waiting for process exit: an attached debugger can itself hold exit open. Require the bound child to exit **zero**; while the parent is held, a matching-start-tick zombie with `/proc/stat` raw exit code zero is acceptable exited-process evidence, with no file descriptors/TCP ownership. A lost session without these markers/exit evidence is **unknown**, not completion. Verify no live descendant owns a database socket and the independently visible MySQL session/transaction inventory has no application/worker writer. No SQL kill or forced child signal.
9. Only after both real drains and lead completion are proven, invoke provider `deploymentRemove(id: <exact deployment>)` for API, email and the completed lead artifact. Preserve service configuration, domains and variables; **do not delete the services**. Provider cleanup may terminate the now-stopped launchers only after their application has cleanly exited and owns no work/connections. Poll exact deployments/instances until REMOVED/`deploymentStopped=true`, zero running/crashed replacement replicas, no applying/pending deploy or Git-trigger work. Removal is not the drainage mechanism.
10. Observe all writers for **six continuous minutes**, exceeding the recorded five-minute lead cadence. Require no new instance, request/job work, database writer session or transaction; maintenance and cron-null must remain effective throughout. A restarted writer resets the freeze decision and stops before backup/DDL. Record the freeze timestamp **after** this gate, not at ingress installation or first SIGTERM.
11. Only then create the already-approved frozen-state Azure backup. Require Ready/completion after freeze, then re-plan the protected schema: the exact digest must still equal the approved one. Apply that plan once under the original schema approval in the accepted attended window; verify 0111 physically. Generate the **applicable** reference-data plan using the SELECT-only inspector and return its digest for separate approval. No reference application, grant, compatible deployment, reopening or payment operation follows automatically.

The estimated containment reservation is **25 minutes**: two minutes API request/scheduler pre-drain, up to fifteen minutes email, bounded provider cleanup and six-minute no-restart observation. The main portions overlap where safe. This replaces the original ten-minute containment reservation; it does not enlarge any forced-stop allowance. Reserve runner/setup 10 minutes, containment 25, backup 15, schema application 15 and verification/reference planning 15; keep the remaining 40 minutes for incident/approval discussion. No DDL starts if the attended window cannot safely cover the remaining sequence. No unapproved application deployment is needed to test old drainage.

## Completion evidence required before backup/DDL

The final execution record must contain **all** of the following, bound to the exact real service/deployment/instance/PID/start ticks and operation token:

- Verified maintenance on both origins; completed cron pause and absent deploy triggers; full writer inventory and sufficient independent DB-session visibility.
- API scheduler terminal state and awaited saved-search stop; graceful HTTP close **before** SIGTERM; native cleanup deadline not exceeded.
- Email batch finished or demonstrated idle-at-abort; no new batch after abort. Awaited pool-end completion and clean exit zero prove supervisor closure follows its batch boundary. Unknown provider outcome/expired lease is not accepted.
- Canonical original pool-end completion for both processes, clean exit zero, no live socket-owning descendants and no remaining target application/worker connections or transactions. A missing log or lost Inspector connection cannot be replaced by a timeout assumption.
- Exact deployment removals, zero replicas/replacements and six-minute writer-free observation. Only this establishes the frozen state on which the backup and DDL depend.

[Production status after investigation](production-status-after-investigation.json) instead shows the original API/email still live and the lead job still scheduled. **These completion gates have not been performed in production.** All files here are review inputs, not a freeze certificate.

## Stop and recovery

On any prerequisite failure, do not remove an active application, create a freeze-labelled backup or start DDL. No SIGKILL, forced close, deadline extension inside the application, grants, retry of uncertain delivery or fall-through deployment is approved.

Before application SIGTERM, a binding failure leaves the application alive; keep maintenance and report exactly whether timers/observers/launcher holds were applied. If the amendment has already quiesced it, do not restart schedulers or resume access implicitly. If a batch exceeds its budget, leave the held launchers and application alive to finish; report the operation token and obtain an attended extension/recovery decision. Keep the independent observer available; do not abandon frozen launchers silently.

If an application exited cleanly but provider removal/observation fails, retain ingress/cron holds and inspect the exact artifacts. Any replacement process makes the frozen state invalid. Do not repeatedly remove newly discovered artifacts or patch restart settings as an unreviewed substitute.

For recovery **before any DDL**, require fresh proof that head remains 0096 and there are no incomplete attempts, then Edward can separately approve restoring the recorded old API/email/lead artifacts and original scheduling. If an existing application remains alive and only parents were held, recovery can resume the verified three parents; restoring stopped API schedulers or reopening its closed HTTP listener is a separate service recovery/reopening decision. The same protected source, deployment IDs/configuration and data are the recovery record; no guessed/new source.

For **partial or complete DDL**, retain maintenance and worker holds; preserve durable attempt evidence and use the original packet's schema-compatible forward recovery or separately approved in-region PITR/new-target plan. Never resume the old 0096 runtime as a rollback after schema transition. The accepted 49a48572 compatible deployment stays prepared and held pending its own approval.

Diagnostic logging is guarded and cannot prevent original pool closure or replace its result/error. A `logFailed` flag or missing required completion evidence still prevents acceptance; observer isolation does not waive the freeze gate.

No real application signal, production stop/redeploy/configuration change, backup creation, DDL, reference application, grant, service reopening, customer write or payment activation occurred during this investigation. Only disposable provider probes and owned synthetic fixtures were run and cleaned up. This amendment closes the investigation with one proposed method; production execution still requires the named approval and real completion evidence.
