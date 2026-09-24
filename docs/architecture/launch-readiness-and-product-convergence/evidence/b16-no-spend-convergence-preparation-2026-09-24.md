# B16 no-spend convergence preparation — 2026-09-24

Status: reviewable local preparation candidate; **not a protected release,
deployment, database cutover or paid activation approval**.

## Candidate assembly

The integration base `fb6805073` records B08's established Azure/parked
cutover disposition. Git ancestry confirms that the current B03, B04, B05,
B06, B07, B10 and B12 task heads are all ancestors of that base. The B11
dedicated private-proof guardrail was applied as `6a78736f`, and the B14–B18
operating/review preparation as `b5d6fb73`. No historical TiDB compatibility
work was integrated. The B12 contract now points to the current B08 boundary
so its future topology cannot be mistaken for authorization to cut Railway over.
The bounded B13 attention exit was applied as `e43ea6af`: unknown or exhausted
lead deliveries now produce a nonzero cron result without resending them.
The B17 read-only exact-release probe was integrated as `9c6fd841`; it does
not bind a schedule or contact a protected service during local verification.

## Local gates on the assembled source

| Gate | Result |
| --- | --- |
| `pnpm check` before and after B13 integration | Passed |
| Hosted proof/preflight/config focused tests | 3 files, 30 tests passed |
| B17 probe evaluator | 4 focused tests passed; missing tuple exits 2 before network I/O |
| `pnpm build` | Passed; pre-existing large-chunk warning retained |
| `pnpm db:authority:check` | Passed: 36 static suites, 310 tests; 120 utility surfaces; 214 canonical tables; 95 active migrations; inventory and lifecycle current |
| Worktree isolation | Dedicated `prep/b16-no-spend-convergence` worktree; no Railway, Azure or TiDB mutation |

These gates do not substitute for full integrated browser, disposable-database,
hosted provider or production acceptance. The approved schema authority is
still through `0094_content_topics_primary_key.sql`; no migration was added by
this preparation.

## Exact next release gates

- B08: Railway Pro/static outbound IP founder spend decision, then a separate
  protected Railway runtime credential/network/cutover review. Existing TiDB
  stays connected until that operation is authorized and accepted.
- B10/B12/B13: verified Resend domain/mailbox, supervised email worker, real
  lead cron and hosted custody/attention checks on the exact artifact.
- B11: distinct private proof bucket and credential, controlled put/read,
  access denial, durability, retention and recovery proof.
- B14: named backup, staffed hours, real queue handling and handover rehearsal.
- B15: approved final legal/payment/privacy text and customer browser proof;
  placeholder Terms/Privacy still block paid activation.
- B17: actual continuous check/alert recipient and disposable backup/restore
  rehearsal.
- B18: full exact-artifact Agent/Agency/Developer and failure-path acceptance.

Freeze a new short-lived release candidate only after these inputs are
available. Record its exact SHAs/tree/target/plan and rerun the required gates;
do not treat this preparation branch as a permanent release authority.
