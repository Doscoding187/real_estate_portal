# Senior R2 recovery: existing cache timer and Redis client

The reviewed API shutdown fix is integrated as `57ea5f5e98ff031a4d0f0814998e60fe27a82b2b`. Its tree `d832836d40746d36401b6fb1a3603466e6660a00` matches candidate `60de638b8cf8326569f564a6612bfde3a2523d6a` and the successful first hosted CI attempt. That merge has not changed production.

This packet prepares recovery of the already-drained old API. It contains operational observers and offline fixtures; application startup never imports them. Technical recovery is senior-owned under Edward's delegation. A fresh attended window is still required: the previous two-hour runner/execution window expired. A 30-minute recovery-only window was requested on October 10; this packet does not claim attendance or authorize a database release by itself.

## Confirmed live state and correction to the pause diagnosis

Read-only observations on October 10 established:

- The exact original API deployment/instance/PID/start tick remains. Its HTTP listener, schedulers and pool have completed drainage; launchers 48/60/61 remain stopped. The child is alive.
- The original email child remains zombie `Z`, exit raw zero and zero descriptors, with stopped launchers. Lead cron remains absent and its deployment has zero running replicas.
- Both origins return the prepared 403 maintenance page.
- The protected database remains at `0096_user_founder_authority_unique.sql`, with no incomplete attempts, no migration lock, and the unchanged 15-migration schema-plan digest `d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d`. The globally visible session snapshot contained only Azure infrastructure and the observer, with no transactions. These are timestamped observations, not a continuous freeze.
- The existing `SimpleCache` singleton has a referenced 60,000-ms timer. A second `RedisCache` singleton is connected, open and ready. One non-Inspector TCP connection is established to that private Redis service on port 6379. This **corrects the earlier zero-TCP assumption**: releasing the timer alone would be insufficient. This finding adds no application database session and does not alter the future fix, which already closes both resources.

The final read-only Inspector pass traversed existing shutdown/router/resolver scopes to identify both original instances, without importing modules or invoking a customer operation. Source hashes, process bindings and launcher holds were verified. See [live inspection](evidence/api-cache-redis-live-final-inspection.json), [socket observation](evidence/api-owned-sockets-fresh.json), [API state](evidence/api-fresh-state.json) and [email exit](evidence/email-fresh-state.json).

## Overdue runner cleanup completed

The temporary runner `e519b6e7-6c52-47ca-99ec-3a0cd7994f8e`, deployment `5e8edb5a-6515-4528-b077-2fbeec12a4b4`, exceeded its two-hour lifetime during the interruption. This is a lifecycle-control failure; no claim is made that its USD 1 cost ceiling held.

After the read-only commands had ended, fresh exact-instance observation proved no active database command. Attempts, lock and global sessions were inspected. The accepted lifecycle gate permitted cleanup. The existing approved cleanup procedure deleted **only this runner in production**. Environment and project readbacks confirm absence and no pending work; original API/email/lead/Redis deployment IDs are unchanged. The updated private custody record records removal confirmation. No replacement runner was provisioned. See [cleanup gate](evidence/cleanup-gate.json), [deletion response](evidence/runner-delete-response.json), [environment readback](evidence/runner-removal-environment.json), [project readback](evidence/runner-removal-project.json) and [custody](evidence/runner-custody-after-cleanup.json).

## Reviewed technical recovery method

Artifacts:

- [cache-drain-session.cjs](cache-drain-session.cjs) follows named existing scopes to the `SimpleCache` and `RedisCache` objects. It checks completed HTTP/scheduler/pool drainage and exit code zero before any recovery operation.
- [bound-api-recovery.cjs](bound-api-recovery.cjs) runs as a separate SSH observer. It enforces exact hosting/source/PID/start-tick/parent bindings, stopped launchers, deployed file hashes, the original loopback Inspector and the specifically observed Redis socket. Any additional connection is a stop. It accepts only the two pinned client artifacts.
- [drain-session.original.cjs](drain-session.original.cjs) is the unchanged earlier client, SHA256 `e483eed8b9c14100850177aaefedef60812e7b0ecc414752131e9c3cfd9bba62`. It is retained as an observer dependency; original operational evidence/files are preserved.
- [source-binding.json](source-binding.json) and `SHA256SUMS` pin the reviewed artifacts and deployed sources.

On a fresh attended window, the operator performs one recovery attempt:

1. Recheck both maintenance origins, no provider replacement/pending rollout, exact original process/launcher identity and drain state. Run `inspect` on the same bound process with the frozen artifacts. A changed state requires review.
2. Record actual UTC start/end and Edward's current attendance. The wrapper refuses `release` outside that window; the proposed recovery reservation is 30 minutes, with a maximum envelope of two hours. No window is silently renewed.
3. Invoke `release` **once**. The existing healthy `RedisCache.disconnect()` is awaited first. Its ready client must become closed and disconnected. Only then does the existing `SimpleCache.destroy()` clear its own timer/cache. A marker is set before the first operation, so a lost response or failure never authorizes replay.
4. Disconnect the observer. Observe natural API child exit zero on the exact original start tick, zero owned descriptors, and no live database-owning descendant. Keep all launcher/ingress/cron holds. Neither the recovered API nor its launcher is restarted.
5. A failure, timeout, unknown acknowledgement, nonzero exit or remaining resource returns to R2. Retain containment and inspect; do not retry, force success, signal again, remove an alive application, or start a backup/DDL.

There are no target imports, new application resources, SQL, migrations, signals, forced target exits or provider removals in this recovery action. The 60-second observer ceiling terminates only the separate observer; it never kills PID 77. It does not certify a frozen database or reopen service.

## Validation and limits

[Seven offline tests](cache-drain-session.test.cjs) passed. The fixture uses the pinned old cache/Redis implementations, real Node Inspector sessions and real Redis-client TCP/QUIT against a local RESP peer restricted to client metadata and QUIT. The positive case gracefully closes the Redis connection and releases the timer, then exits naturally with code zero. Negative cases cover absent approval, mismatched process start tick, failed pool drain, ambiguous route, an already-recorded attempt and a Redis cleanup failure. The failure leaves the timer/process alive and forbids retry. Local fixture cleanup may kill a deliberately refused child after the assertion; it is never counted as successful recovery. See [raw test output](evidence/offline-tests.txt).

These tests prove the operational protocol and refusal behavior; they do not simulate production database-bearing jobs. The live pass is read-only. **No recovery mutation of the API has occurred at this packet checkpoint.** No new hosted CI cycle is needed for an observer-only evidence packet; application source already passed hosted CI.

## Subsequent release boundary

After natural exit, completed lead work, fresh global session visibility and the existing clean-email evidence, any removal of the old API/email/lead deployments follows the original handoff's exact identities and stop conditions. Preserve services/configuration. A fresh no-writer observation and frozen backup remain required before schema application; neither has started.

The merged shutdown source leaves the accepted migration manifest, Drizzle schema and operation policy unchanged. `57ea5f5e...` is the corrected compatible application source for subsequent separately approved deployment, after schema/reference verification. The applicable reference-data digest still awaits verified physical `0111`. Reference writes, application deployment, reopening, cron resumption, grants and payments remain held.

For any new release runner, obtain fresh independent custodian acknowledgement, absolute expiry, current network/authority proof and applicable budget gates before creation. Do not reuse the deleted runner or infer new custody from an old conversation.

## Record integrity

The earlier committed October 10 18:00–20:00 SAST approval and October 9 immediate 17:26–19:26 UTC record do not independently cover the actual October 9 23:18 UTC drain. The private execution record asserted a renewed 23:07 UTC window referencing Edward's later "ok lets proceed" and acknowledged custody. Preserve both records and this discrepancy; no retroactive timestamp or approval is invented here. This packet's requested attendance applies prospectively to recovery only.
