# R2 pause checkpoint — October 10 execution, API clean-exit gate failed

Recorded 2026-10-09 at 23:45 UTC (2026-10-10 01:45 SAST). The operating session paused at its token-budget boundary, as reported by the operator through Edward. Continuation requires Edward's attended extension/recovery decision per the approved handoff's **R2** procedure. No forced kill, provider removal, retry signal, frozen backup, DDL, reference write, deployment or payment activation was performed while pausing.

## Where the execution stopped

Stages 1–2 (preflight, maintenance) completed. Stage 3 (drainage) completed every step except its final gate:

- Maintenance ruleset active on both origins; safe GETs returned the prepared 403 maintenance response at 23:17 UTC and again at ~23:32 UTC ([maintenance-readback.json](maintenance-readback.json)).
- Lead cron `deploy.cronSchedule=null` committed with `skipDeploys=true`; no running lead-job replica; no replacement deployment.
- API (deployment `93b7b423-91ac-4855-b8a7-e8fb53a0f112`, instance `41e46a78-215c-4feb-9c7a-b0aa7d5faf50`, child PID 77, startTicks `755793067`): SIGUSR1 enable, inspect, arm, state polling, launcher SIGSTOP holds (48/60/61 → T) and one direct SIGTERM all completed. `HTTP_CLOSED`, both scheduler stops, `POOL_END_STARTED`/`POOL_END_COMPLETED` and Redis cache closure all logged at 23:18:52–23:19:01 with no failure flags (fresh `state` at 23:33 UTC unchanged: `api-state-*.json`).
- Email (deployment `4d18e7ce-084c-486a-87b1-39dca207bdde`, child PID 77): clean exit **zero** established — zombie `Z`, `/proc` field 52 raw exit `0`, `fdCount` 0, with its three launchers held so the ALWAYS-restart supervisor cannot restart a writer ([email-exit-1791587952641489706.json](email-exit-1791587952641489706.json), [email-shutdown-provider-logs.json](email-shutdown-provider-logs.json)).
- Database: global-visibility session inventories at 23:19:59 (preserved: [session-inventory-preserved-2026-10-09T23-19-59Z.json](session-inventory-preserved-2026-10-09T23-19-59Z.json)) and 23:40:35 ([session-inventory.json](session-inventory.json)) show **no application/worker session or transaction** — only Azure infrastructure `azure_superuser` sessions and the observer's own connection. The observer script overwrites its provenance file per run; the recorded provenance is the 23:40 run on runner deployment `5e8edb5a-6515-4528-b077-2fbeec12a4b4`.
- Schema: **untouched.** Head remains `0096_user_founder_authority_unique.sql`; the exact approved 15-migration plan/digest `d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d` re-read clean with `lock: null`, `applied: []` ([protected-schema-plan.json](protected-schema-plan.json)). **No backup was created; no DDL started.** The six-minute no-writer freeze was not run — it is gated behind the failed exit gate.

## The failed gate and root cause

The handoff requires **actual child exit zero** before provider removal, the freeze, backup and DDL. The API child did not exit. 23 minutes after SIGTERM it remains alive (`state S`, exitRaw `0`, identity unchanged) with **zero owned TCP connections** and 36 descriptors that are files/pipes/eventfds/non-TCP sockets ([api-stuck-process-observation-2026-10-09T23-41Z.json](api-stuck-process-observation-2026-10-09T23-41Z.json), [pause-deployment-readback.json](pause-deployment-readback.json)).

Static diagnosis of the deployed source `68f2c679eb423dd0da8cb2b5115a85d4620a10aa`, confirmed against the live process:

1. `server/_core/index.ts` `shutdown()` completed every await, set `process.exitCode = 0` and returned at 23:19:01. Node exits only when the event loop drains; it did not.
2. `server/lib/cache.ts` exports a module-scope singleton `cache = new SimpleCache()` whose constructor starts a **non-unref'd 60-second `setInterval`**. Only a never-called `destroy()` clears it, and no shutdown path calls it.
3. That module is statically imported through the running graph: `_core/index.ts` mounts `/api/explore` → `server/routes/exploreShorts.ts` → `server/services/exploreFeedService.ts` → `server/lib/cache.ts`. The timer has kept the loop open since startup and no approved or deployed code path stops it.
4. The email worker exits cleanly because it never imports this graph. `googlePlacesService` carries the same class of interval but is only dynamically imported by unmounted routers; it is not implicated in this instance.

**The API process will never exit on its own. Waiting cannot satisfy the gate.** This is a shutdown-design flaw in the deployed source, not an incomplete drain: the process is fully drained and owns no database or network connection.

**Fix-forward requirement:** the accepted release source `49a48572c24d1b122fcf17b025a76e5ab77f03a8` contains the identical flaw (`server/lib/cache.ts` unchanged; its shutdown list stops only the Redis cache, DB pool and rate-limit stores). Any future compatible deployment would wedge identically on drain. The senior's next-deployment review must require stopping or unref'ing this interval in shutdown (and auditing `googlePlacesService.ts`/other module-scope timers) before deployment approval.

## Current held state (safe to hold indefinitely)

All writer containment remains effective: maintenance on both origins, lead cron paused, email supervisor held with a clean-zero exited worker, API instance held (outer pnpm alive, three launchers SIGSTOP'd, drained child alive with no connections), no database sessions/transactions, schema at 0096 with no lock. The wedged API process performs no work and owns no descriptors that can write. Provider artifacts unchanged: API `93b7b423` SUCCESS, email `4d18e7ce` SUCCESS, lead `19a8fac1` SUCCESS, runner `5e8edb5a` SUCCESS.

## Record-integrity note for the senior review

The committed approval ([EDWARD-APPROVAL.md](../geography-containment-amendment-2026-10-09/EDWARD-APPROVAL.md)) records the window as **10 October 2026, 18:00–20:00 SAST (16:00–18:00 UTC)** and states it does not authorize execution before the window. This execution's maintenance and drain mutations occurred **9 October ~23:10–23:20 UTC** under the prior operating session's in-conversation senior direction, which is not recorded in the repository. The senior review should attest the attendance/window authority for the actual execution clock, or record the deviation explicitly, before treating this evidence chain as approval-complete.

## Edward's decision options (presented, not chosen)

1. **Hold as-is and resume in a separately approved window** after a reviewed containment amendment. The current state is stable; nothing degrades while held.
2. **Reviewed containment amendment to complete the API exit**: a senior-reviewed revision of the approved loopback-Inspector drain client that stops the remaining timer(s) (for example calling the singleton's `destroy()` or clearing the interval through its own scope) on the same verified binding, letting the drained process exit naturally with code zero. The current approved client is hash-pinned (`e483eed8…`), so this requires a new reviewed amendment and Edward approval — not an improvised in-session edit.
3. **Reviewed provider-removal scope** acknowledging the child is drained-but-alive: `deploymentRemove` for the API deployment (and then email/lead per the checklist) with the exit gate satisfied by amended evidence. The handoff reserved removal for after clean exits, so this also needs explicit approval.
4. Any resumption must re-verify, freshly: maintenance on both origins, exact process bindings, launcher holds, no-writer session inventory, schema head 0096, clear attempts, and the unchanged plan digest.

Whichever path is chosen, the six-minute no-writer freeze, frozen backup (`pl-geog-pre0111-20261009`), one-time schema apply and physical verification remain sequenced exactly as in the approved handoff; none of them has started.

Also pending Edward's decision at this pause: cleanup of the temporary runner deployment `5e8edb5a` under the existing approved cleanup scope (created 23:09:30 UTC; two-hour attended lifetime and USD 1 incremental-cost ceiling apply; do not leave it orphaned, and do not kill it while any approved operation depends on it).
