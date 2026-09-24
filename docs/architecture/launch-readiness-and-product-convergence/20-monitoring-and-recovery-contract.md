# B17 no-cost monitoring and recovery contract

Status: operating contract and read-only exact-release probe prepared. Hosted
continuous monitoring and restore rehearsal are pending an exact B16 release
and provider access. No new paid monitoring product is required by this
contract.

| Signal | Source | Attention condition | First action |
| --- | --- | --- | --- |
| API liveness and build | `/api/health`, `/api/version` | unreachable or wrong accepted SHA | check deployment; hold onboarding |
| API readiness | `/api/readiness` | 503, database/cache/config failure, wrong target/head | check dependency and deployment; hold paid activity |
| Term scheduler | `termScheduler` in readiness | last tick stale or failure | inspect one API replica and scheduler logs; hold expiry-dependent promises |
| Transactional email | supervised worker logs and `pnpm email:backlog` | no recent batch, unknown, permanent failure, unresolved identity, stale claim | assign B14 operator; inspect provider before reconciliation |
| Lead delivery | cron history, worker summary/backlog, Lead Routing Audit | missed two consecutive runs, unknown/exhausted delivery, platform custody attention | assign B13 owner; verify internal CRM custody |
| Private proof/media | B11 controlled object read and provider status | object unreadable or permission drift | hold finance review; preserve object and audit evidence |
| Customer support | reply/bounce mailbox and B14 queue | unowned message or missed staffed period | Edward responds; hold new payable intake and use the founder-unavailable procedure if the window is missed |

Use the existing Railway, Vercel, Resend, Redis and object-store dashboards and
an operator-owned schedule for the first cohort. Record checks during staffed
hours and after incidents. A continuous alert recipient and actual check
schedule must be bound in the protected provider configuration before paid
activation; an unscheduled local script or laptop is not continuous monitoring.
Do not expose DB credentials, proof objects, recipient addresses or provider
response bodies in a monitoring payload.

## Exact hosted release probe

`pnpm launch:probe` is a read-only, external HTTPS check for the accepted
frontend/API pair. Set these non-secret variables from B16's exact release
record before running it:

| Variable | Exact expected value |
| --- | --- |
| `LAUNCH_PROBE_FRONTEND_URL`, `LAUNCH_PROBE_API_URL` | HTTPS origins, with no path, query or credentials |
| `LAUNCH_PROBE_FRONTEND_SHA`, `LAUNCH_PROBE_API_SHA` | Full accepted 40-character build SHAs |
| `LAUNCH_PROBE_TARGET_FINGERPRINT` | Exact 64-character Database Authority target fingerprint |
| `LAUNCH_PROBE_ENV` | `staging` or `production` |
| `LAUNCH_PROBE_RELEASE_ID` | Exact release ID, or literal `none` before activation |

The probe compares `/version.json`, `/api/version`, `/api/health` and
`/api/readiness`; it requires the expected database target, Redis-backed
rate-limit/cache health, public S3 configuration and a successful term-scheduler
tick within 45 minutes. It prints only endpoint origins and sanitized failure
codes. Exit 2 is attention; no probe operation writes provider or application
state. Bind it to a real independent schedule and alert recipient before
calling monitoring continuous. The probe does not replace B10/B13 worker
backlog checks or the B11 object read/recovery exercise.

Local evidence: the probe evaluator's five focused tests and `pnpm check`
passed. Running `pnpm launch:probe` without an exact release tuple exited 2
with a sanitized setup error, before any network request.

## Recovery sequence

1. Record UTC onset, accepted SHA, `/api/version`, readiness summary, worker
   last-run times and affected customer obligations in the protected incident
   log. Keep Railway on its current database until a separately authorized
   cutover; never switch to Azure as an unreviewed recovery action.
2. Stop new payable onboarding and finance approvals when source-of-truth or
   private-proof access is uncertain. Preserve existing rows and provider
   evidence. A liveness 200 does not restore paid operation.
3. For an API/runtime fault, compare deployed SHA/settings with B16's exact
   tuple and restore the last accepted artifact only through release authority.
   For DB faults, use Database Authority's read-only status first; any restore,
   replay or migration is a separate protected operation.
4. For email or lead uncertainty, leave `unknown` rows intact and reconcile
   with provider evidence under B10/B13. Never delete a queue row or reset a
   lease to force a resend.
5. Confirm `/api/readiness`, exact SHA, email and lead worker progress, and
   customer obligation owners before reopening paid activity. Record the
   recovery time, cause and follow-up action.

## Proof required for B17 closure

Capture a controlled API restart, Redis interruption/recovery, email worker
restart, missed lead cron detection, private-object retrieval failure and
successful recovery on the exact hosted candidate. Also obtain the actual
database and object-store backup/restore policy, retention and a disposable
restore rehearsal. Do not test restore against either protected production
database. Any provider feature that demands new expenditure is a separate
`FOUNDER SPEND GATE`; continue the no-cost checks and procedures.
