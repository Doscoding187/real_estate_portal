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
The [B12 public endpoint baseline](b12-public-hosted-baseline-2026-09-24.json)
confirms production DNS/TLS is present, while the deployed API remains on an
older SHA with readiness 503 and staging DNS is absent. It is a single
read-only observation, not hosted acceptance.
The B14 founder-only decision now has a separate `PAID_MVP_SALES_PAUSED`
runtime guard. It rejects new invoices and finance approval before database
access while retaining already-paid product availability; public pages and
Agency/Developer invoice actions show the pause. This is local source proof,
not a Railway configuration change or hosted rehearsal.
The bounded B14 follow-up adds `PAID_MVP_SALES_OPEN_UNTIL`: a hosted paid
release without a founder-renewed UTC window remains paused, and an open
window expires at request time without a scheduler or database write. The
window cannot be set more than 72 hours ahead. Edward renews it at the daily
weekday check; an unexpected absence therefore closes new invoice and finance
approval requests by the next staffed check deadline. Existing paid product
availability is unchanged. The exact hosted expiry/renewal rehearsal remains
open; no Railway variable or deployment was changed.
The [B15 browser data inventory](b15-browser-data-inventory-2026-09-24.md)
records the candidate's real first-party analytics and device-local drafts.
The global Google Analytics tag was removed from candidate HTML; the deployed
frontend remains unchanged until a reviewed release. Hosted network/storage
capture and provider retention facts remain B15/B18 requirements.

## Local gates on the assembled source

| Gate | Result |
| --- | --- |
| `pnpm check` before and after B13 integration | Passed |
| Hosted proof/preflight/config focused tests | 3 files, 30 tests passed |
| B17 probe evaluator | 5 focused tests passed, including the live HTML-fallback shape; missing tuple exits 2 before network I/O |
| `pnpm build` | Passed; pre-existing large-chunk warning retained |
| `pnpm db:authority:check` | Passed: 36 static suites, 310 tests; 120 utility surfaces; 214 canonical tables; 95 active migrations; inventory and lifecycle current |
| Worktree isolation | Dedicated `prep/b16-no-spend-convergence` worktree; no Railway, Azure or TiDB mutation |
| B14 sales-pause guard | 6 focused client/server files, 25 tests passed with `SKIP_DB_INIT=1`; `pnpm check`, `pnpm build` and `pnpm db:authority:check` passed after the change. No database connection or provider mutation. |
| B15 analytics source containment | `pnpm build` passed after removing the global Google tag; `rg` found no former tag URL or measurement ID in built HTML/assets. First-party event logging remains disclosed in the approval candidate. |
| Fresh local database chain | Owned disposable MySQL target `af8dc5d6cb434ff5e3abcd89eb43518a4b58017d407a729e2a26df6a168408e8` applied `null → 0094` once under plan digest `2313cba3cb37e592a37ff86fb04c534ea32bde47b4f200992667d479db02e516`; all 95 migrations recorded. Post-apply plan has no pending migrations, status reports no incomplete attempts, and physical congruency matches desired digest `a8ca8cf34bb3627594eab1b722b85115c6460225a0165db7992228a8547798e9` with no differences and 23 enforced CHECK constraints. |
| Local worktree account capability | `db:worktree:create` now grants only `SESSION_VARIABLES_ADMIN` in addition to the owned database privileges to the two loopback `listify_app` accounts. The runner proved GIPK OFF and UTC on its migration session. Focused lifecycle test passed (3 tests); no protected account or runner changed. |
| Disposable data and customer journey | Geography, Launch Access foundation and Search-to-Lead scenario prepared and verified; scenario verification ran in the governed test runtime. Location-discovery readiness is true, including 214 application tables. The Agency integrated walkthrough passed 12 tests with controlled local proof submission, Super Admin finance approval, canonical subscription activation, Agency approval, membership, inventory and lead follow-up. It does not prove hosted private S3 or real bank/provider evidence. |
| Final local code gates | `pnpm check`, `pnpm db:authority:check` (36 suites, 310 tests, 120 classified utilities, 214 tables and 95 migrations), focused lifecycle tests (3), and the integrated Agency walkthrough (12) passed after the local authority/test changes. |
| Integrated Agent/Developer regression on the assembled disposable target | Independent Agent publish/enquiry and Developer prepayment approval passed 2 focused tests. Six Developer/commercial integration files passed 44 tests, covering ownership, lead assignment, media, development publication, and paid commercial contracts. The governed Search-to-Lead scenario verifier passed again after these runs. |
| B14 founder-window follow-up | On a freshly recreated owned disposable target, the governed `null → 0094` plan digest `2313cba3cb37e592a37ff86fb04c534ea32bde47b4f200992667d479db02e516` applied successfully, status reported head ready and no incomplete attempts, and congruency matched desired digest with zero differences. Three focused files passed 34 tests, including a 14-test Agency walkthrough: during a pause, a submitted proof remained pending and checkout/approval rejected; after approval, a later pause preserved active subscription access. Unit checks proved expiry at the exact deadline, missing-window fail closure, and rejection of invalid or overlong deadlines. The final next-weekday limit refinement passed its four focused tests and `pnpm check`. The disposable target was removed and its service stopped. This is local proof, not hosted acceptance. |

The Agency walkthrough's old cleanup removed subscriptions by shared plan ID;
a post-test scenario recheck caught the resulting fixture loss. Cleanup now
targets only the walkthrough's Agency owner identity. The governed scenario
adapter restored its fixture, the 12-stage walkthrough passed again, and the
governed scenario verifier passed **after** that run. This local test repair
does not change B03–B07 production behavior.

The later payment-backed rerun used a freshly established owned target at the
same fingerprint and applied the same 95-file `null → 0094` plan. The first
attempt exposed an obsolete test assertion that the retired
`agencies.subscriptionStatus` snapshot must mirror an active Launch Access
subscription. The canonical `subscriptions` row and Agency public projection
are authoritative; the test now checks both. The corrected 12-test walkthrough
passed, followed by a passing governed Search-to-Lead scenario verifier,
schema congruency with zero differences, and location-discovery readiness with
zero incomplete migration attempts. No B03 runtime code or schema was changed.

These gates do not substitute for full integrated browser, hosted provider or
production acceptance. The approved schema authority is
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
- B14: Edward's daily weekday founder-only checks, a monitored support route,
  proof that new sales/invoices/activation pause during an absence longer than
  one business day, and a real single-operator queue/unavailability rehearsal.
  A secondary operator is required only if this bounded model cannot meet the
  customer obligations.
- B15: Edward-approved final legal/payment/privacy text and customer browser
  proof; the [approval candidate](b15-founder-approval-candidate-2026-09-24.md)
  is prepared with unresolved public contact, address and provider facts.
  Placeholder Terms/Privacy still block paid activation.
- B17: actual continuous check/alert recipient and disposable backup/restore
  rehearsal.
- B18: full exact-artifact Agent/Agency/Developer and failure-path acceptance.

Freeze a new short-lived release candidate only after these inputs are
available. Record its exact SHAs/tree/target/plan and rerun the required gates;
do not treat this preparation branch as a permanent release authority.
