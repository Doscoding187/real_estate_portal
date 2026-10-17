# Hosted-parity rehearsal pack (B10, B11, B13, B17)

17 October 2026. Local hosted-parity rehearsals for transactional email (B10),
private billing-proof storage (B11), lead delivery custody/dispatch (B13), and
local runtime recovery (B17), executed against the conduit worktree's
disposable database target. Adds executable contracts and one fail-closed
configuration guard; grants no release, hosted, commercial or protected
action. B08–B18, the paid-opening NO-GO and every owner-blocked item retain
their existing dispositions.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `HOSTED-PARITY-REHEARSAL-2026-10-17` (launch-readiness packet 42) |
| Base | `main` at `a46d850c7` (contains packet 41) |
| Worktree / branch | `property-listify-hosted-parity-rehearsal-20261017` / `verify/hosted-parity-rehearsal-20261017` |
| Database authority | Version 3; manifest head `0115_non_geographic_place_search_eligibility.sql`; target `mysql://127.0.0.1:3307/listify_wt_hosted_parity_rehearsal_202610_842f208431f8`; fingerprint `dd2504706230abde…`; classification `disposable-worktree`; ownership `exact`; schema `congruent` |
| Boundary | Disposable local target and local listeners only. No hosted environment, provider (Resend/AWS), payment, entitlement activation or production data was accessed. Nothing here is production verification or a release approval. |
| Reviewer action | Re-run the cited suites against a disposable target; inspect the two new executable contracts (supervisor attention marker, deploy-refused S3 endpoint override). |

## Environment provisioning record (conduit worktree)

1. `pnpm db:authority:service:start` refused with preserved stale runtime
   metadata (PID file). The governed `pnpm db:authority:service:recover`
   removed only the exact stale PID/socket/lock artifacts; the subsequent
   start reported the service available on `127.0.0.1:3307`.
2. `pnpm db:authority:bootstrap:local` (`worktree:create`) created the
   worktree-owned database (`changed: true`).
3. `migration:apply --accepted-old-head=none --expected-new-head=0115_…` applied
   the full migration chain to the fresh target with fresh-session evidence.
4. `pnpm db:foundation:prepare` + `pnpm db:foundation:verify` loaded the
   canonical launch foundation (agent/agency/developer launch-access plans).
   This is a prerequisite for the B10 email integration suite; before it the
   suite fails closed with "Canonical launch foundation is required".
   `pnpm db:authority:status` now reports `canonical-foundation-ready`,
   `schema-congruent` and `Application Readiness: ready`.

## What was rehearsed

| Boundary | Rehearsal | Result |
| --- | --- | --- |
| B10 | Supervisor batch attention contract (`summarizeEmailWorkerBacklog`) and loop stop semantics: batch abort, abort during idle wait, failed-batch restart propagation | 4 tests, pass |
| B10 | Transactional email delivery authority end-to-end on the disposable target (claims, retry limit, ambiguous outcome visibility, invitation rotation) | 14 tests, pass |
| B11 | Local private-proof durability: owner-only mode `0600`, root containment, identical bytes returned by a freshly started process | 2 tests, pass |
| B11 | Real S3 HTTP path against a local S3-compatible listener: signed path-style PUT with `AES256` SSE, original-file name and proof-id metadata, prefix application, GET read-back | 1 test, pass |
| B13 | One-shot worker exit-code contract: `0` clean, `2` for run-unknown, backlog-unknown and exhausted | 4 new cases, pass |
| B13 | Bounded multi-run drain: due work drains one claim per run, future-due work untouched, retry backoff blocks re-invocation inside 5 minutes, retried delivery completes after the persisted due time passes, no double-sends, scoped states `{completed: 3, queued: 1}` | 1 integration test, pass |
| B17 | Local service recovery contracts (stale PID/socket/lock normalization, refusal of live/opened/wrong-owner artifacts, symlink and contradictory metadata) inside the static authority suite | 65 files / 774 tests, pass |

## Changes

| File | Change |
| --- | --- |
| `scripts/emailWorkerSupervisor.ts` | New exported `summarizeEmailWorkerBacklog`: each batch log now carries `stale` and a machine-readable `attention` flag (`unknown`, `permanent_failed`, stale claims). The loop keeps polling; those durable states require human reconciliation, not a crash loop. |
| `scripts/emailWorkerSupervisor.test.ts` | Attention-marker cases plus an abort-during-idle-wait stop case. |
| `scripts/__tests__/runLeadDeliveryWorker.test.ts` | Exit-code contract cases with `process.exitCode` restoration. |
| `server/__tests__/integration.lead-delivery-authority.test.ts` | Bounded multi-run drain + retry backoff rehearsal (deterministic due-time manipulation, no sleeps). |
| `server/services/billingProofStorage.ts` | Non-production `BILLING_PROOF_S3_ENDPOINT` override (`forcePathStyle`) so the real S3 code path is locally rehearsable. In production the override is ignored (second lock). |
| `server/_core/securityRuntimeConfiguration.ts` | `BILLING_PROOF_S3_ENDPOINT` added to `TEST_ONLY_ENVIRONMENT_KEYS`: deployed runtimes refuse to start with it set. |
| `server/_core/securityRuntimeConfiguration.test.ts` | Selector-refusal case for the new key. |
| `server/services/__tests__/billingProofStorage.localRestart.test.ts` | New local durability restart rehearsal. |
| `server/services/__tests__/billingProofStorage.s3Rehearsal.test.ts` | New S3 HTTP rehearsal (the AWS SDK appends `?x-id=PutObject|GetObject`; the listener asserts path-style URLs). |

## Findings and retained gaps

| Finding | Disposition |
| --- | --- |
| `runLeadDeliveryWorker` attention exit code was implemented but untested | Pinned by unit contract; the hosted scheduler can rely on exit `2` as the alert signal. |
| Email supervisor surfaced attention only as raw log counts | `attention` flag now part of every batch log; platform alerting contract documented in code. |
| Billing-proof S3 path was not locally exercisable, so wrong prefix/SSE/metadata/body handling could only be discovered in hosting | Local S3 HTTP rehearsal added; production-equivalent domestic bucket (af-south-1) provisioning and real credentials remain a B15/hosting item. |
| B10 hosted items | Real Resend delivery, mailbox receipt/reply, bounce/complaint webhooks, and supervised-worker restart on the platform remain hosted-only evidence. |
| B13 hosted items | Platform cron registration, cadence and overlap remain hosted-only evidence; the local rehearsal proves bounded-run convergence and backoff semantics. |
| B17 sustained load | 24-hour workload, backup/restore and provider-level recovery remain hosted/manual. Note: `test:dominance:load` references `tests/load/dominance-load.ts`, which does not exist in the tree — no capacity claim is made from this pack. |
| B17 service stop/start persistence | Deliberately not executed: the local MySQL service is shared across workstreams, and stopping it would violate change-isolation for other active work. The static recovery suite preserves the executable contract. |

## Validation

- `pnpm test:authority -- --project server …` (six suites): 40 tests passed.
- `pnpm test:authority -- --project server server/__tests__/integration.transactional-email-delivery.test.ts`: 14 tests passed.
- `pnpm test:db-authority:static`: 65 files / 774 tests passed.
- `pnpm check`: clean.
- ESLint on changed files: 0 errors (pre-existing `any` warnings only).

## Register effect

None. This pack is local rehearsal evidence for B10, B11, B13 and B17; it
changes no register record, no hosted gate and no paid-opening disposition.
