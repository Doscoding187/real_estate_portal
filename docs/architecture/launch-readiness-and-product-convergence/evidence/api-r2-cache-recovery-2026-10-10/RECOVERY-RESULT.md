# Senior recovery completion — 10 October 2026

**ACCEPTED: the original API shutdown blocker is recovered.** The exact old API exited naturally with code zero after its existing Redis client and referenced cache timer were released. This closes the failed clean-exit step; it does not claim completion of the geography release or reopen production.

Edward confirmed a prospective 30-minute recovery window, **09:43:01–10:13:01 UTC (11:43:01–12:13:01 SAST)**. Following the interruption, he directed continuation. The one reviewed recovery attempt ran at **10:01:28.632 UTC** using operations commit `191c0edfdd609f4b98557ea780ab8aefda4de7a6`. There was no repeated signal, forced application exit, retry, new deployment or SQL command.

The [pre-release bound inspection](evidence/pre-release-bound-inspect.json) confirmed the original source, deployment, instance, PID, start tick, held launchers, completed drain and precisely observed Inspector/Redis sockets. The [single-attempt result](evidence/recovery-single-attempt-result.json) confirms graceful closure of the already-loaded Redis client, followed by destruction of the cache's existing interval. The separate observer disconnected and removed its temporary files.

The [API exit observation](evidence/api-after-recovery-exit.json), at **10:02:36.634 UTC**, proves PID 77/start tick 755793067 is zombie `Z`, raw exit zero, **zero descriptors**, and no live child. `Z` means the process has exited and its held parent has not reaped it; it cannot execute work or own connections. Intermediate launchers remain stopped. The former esbuild child is also exited. Remaining live processes are the outer launcher, held intermediates and the read-only observer. Historical unreaped zombies are preserved in the evidence; they are not running writers.

The [email observation](evidence/email-after-recovery-exit.json) independently confirms the original email child remains exited with code zero, zero descriptors and held launchers. The [provider readback](evidence/environment-after-recovery.json) confirms the original four services/deployments, no replacement or pending operation, zero lead replicas and absence of the previously removed temporary runner. Provider `Online` refers to the held outer containers and does not certify customer-facing availability. [Both origins](evidence/maintenance-after-recovery.json) still return the prepared 403 maintenance response.

## Next senior-owned sequence

The last governed database inspection remains the pre-recovery observation at head `0096_user_founder_authority_unique.sql`, no incomplete attempts and no lock. The approved 15-migration digest remains `d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d`. Recovery made no database command and does not substitute that earlier snapshot for fresh release evidence.

1. Prepare fresh runner custody, absolute expiry, effective networking and a release window satisfying the existing time-budget gates. The removed runner must not be reused.
2. Re-establish governed global session visibility and current schema/attempt/lock readbacks. Complete any old deployment removal only under the original exact-identity checklist and applicable containment evidence.
3. Establish the six-minute no-writer freeze, frozen backup and recovery proof before the one-time schema application. Verify physical `0111` before producing the applicable reference-data digest for its separate approval.
4. Use integrated shutdown correction `57ea5f5e98ff031a4d0f0814998e60fe27a82b2b` for the subsequent compatible application release. Do not redeploy an old source with the same shutdown leak.
5. Reference writes, application deployment, reopening, grants, cron resumption and payments remain held at this recovery checkpoint.

The senior retains production execution and management reporting. A junior may prepare the next read-only checklist and independently acknowledge cleanup custody; this completion record is not authorization to create a runner or start DDL.

Machine-readable outcome: [recovery-result.json](recovery-result.json). Preparation and offline validation: [README.md](README.md). Historical window discrepancies and the overdue runner lifecycle failure remain explicitly recorded; this prospective recovery approval does not rewrite them.
