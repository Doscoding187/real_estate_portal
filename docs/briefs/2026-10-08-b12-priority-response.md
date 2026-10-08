# Engineering response: October 2–8 audit and B12 disposition

**To:** Engineering Manager; Edward (CEO)  
**From:** Codex, senior technical review  
**Date:** October 8, 2026  
**Decision requested:** accept the corrected status below, retain B12 as sole priority, and assign technical review of the current readiness failure. **B12 remains OPEN.**

## Executive response

The brief identifies a real delivery-control problem, but its technical baseline is out of date. The **12,167 ms readiness response with memory cache** was observed on October 2. Its correction was reviewed in the recorded release process, merged through **PR #585**, and deployed that day. Later readiness corrections #587 and #588 were also deployed. We should not repeat those deployments as if they never happened.

There is nevertheless a current B12 defect. During this audit, the live API initially returned readiness **HTTP 200 in 1,042 ms**, reporting Redis. The official joined frontend/API probe passed at **16:07:57 UTC / 18:07:57 SAST**. A subsequent bounded observation stopped at **sample 15**, following fourteen successful samples: **HTTP 503 in 1,015 ms** at **18:08:18 SAST**, with `readiness-verification-pending-or-expired`. Redis, both security stores, storage configuration and the scheduler still reported healthy. Exact live source remained `7756376c9ec604b352595b4e4ba8ced73f18562b`.

**Fast responses and working Redis are established; sustained readiness is not.** A 503 within eight seconds does not satisfy closure. The current work is to diagnose why complete database-verification evidence becomes unavailable or expires, then present a bounded correction if the evidence warrants one. No new correction is claimed completed by this report.

The other reporting failure is that dated checkpoint packets advanced while the central launch register retained older observations. The register still describes an API on TiDB with readiness 503, although the current runtime reports the approved Azure target. This made completed work look absent. Going forward, each accepted checkpoint must update a single dated package disposition with its exact evidence and remaining acceptance criteria.

## Authority, schedule and scope

Receipt was acknowledged in the conversation; the first recorded clock check was **18:03 SAST**, after the 18:00 deadline. No on-time acknowledgment is claimed. The audit and existing-correction review evidence are delivered with this response on October 8. The newly reproduced defect means a deployable *new* correction has not yet been presented.

B12 is the sole implementation priority. Geography, auth changes, Developer changes and independent performance work are paused. Existing work is preserved. Investigation directly necessary for B12 readiness is within that assignment; it does not authorize unrelated optimization.

Retain the stated milestones: Engineering Manager technical review October 9 morning; Edward's approval October 9 afternoon; any approved corrective deployment October 9 EOD; verification October 10 morning; Engineering Manager's formal disposition by **October 10, 17:00 SAST**. The deadline and criteria have not been amended. If the new failure threatens those milestones, report the blocker immediately rather than wait until the hard deadline.

No deployment, provider configuration, schema/data change, restart, payment activation or production fault injection was performed for this audit. A future production deployment still requires Edward's explicit approval of the concrete release. The brief is not that approval.

## Audit boundary and evidence

Period: **October 2, 00:00 SAST through the October 8 audit observation window**. This is a repository/provider/evidence audit, not a reconstruction of unrecorded conversations or every operator keystroke.

- 68 reachable commits in the captured Git census, including merges and duplicate/cherry-picked evidence commits; these are not 68 distinct delivered features.
- Authenticated Railway deployment histories for production API, email worker, lead job and Redis; Testing and Staging returned no deployments in the period. Production histories reach before the period or service creation. The other accessible Railway project has no services.
- Authenticated Vercel project deployment list: 32 records, no next page returned for the date filter. All are listed in the companion ledger.
- Dated checkpoint packets from the controlled-cutover evidence directory and committed architecture records. Original packets retain their historical wording; they are not current status declarations.
- Fresh public readiness observations and the official joined probe, with no authenticated customer mutation.

The [deployment ledger](2026-10-08-deployment-audit.md) lists each of the **62 provider records**, including skipped and automatic preview attempts. The [evidence directory](../architecture/launch-readiness-and-product-convergence/evidence/b12-priority-audit-2026-10-08/) contains provider records, commit census, PR #585 CI/merge evidence, and fresh probe responses. Historical private evidence is referenced by path without copying credentials, tokens or customer documents.

## B-package summary

“Accepted within scope” below is the pre-existing register disposition, not a new October closure. Shared releases are counted once under B12; other rows identify consumption of that evidence rather than duplicating totals. Provider success and product acceptance are distinct.

| Package | Work evidenced October 2–8 | New formal package gates closed | Deployment accounting | Current disposition |
|---|---|---:|---|---|
| B01 — commercial policy | No new policy implementation found; closed-intake policy retained | 0 | None specific | Previously accepted; no reopening |
| B02 — schema/CI contract | Geography CI fixtures, isolation, authority tests and source reconciliation (#594, `499cab892`); founder uniqueness migration evidence (#590) | 0 | Consumed shared releases | Previously accepted; new integrations do not imply new package closure |
| B03 — payment/entitlement containment | Sales-pause, absent admission/deadline settings repeatedly checked during releases | 0 | Shared release readbacks | Previously accepted; payments closed |
| B04 — independent Agent journey | Hosted verification/login, canonical location and image persistence checkpoints; later account-read delay diagnosed | 0 | Shared release consumer evidence | Previously accepted scope; full live acceptance incomplete |
| B05 — Agency/member journey | Agency verification contact recorded; no new Agency verification email reported sent; hosted membership/invitation proof not established | 0 | Shared worker infrastructure only | Previously accepted local scope; hosted delivery/custody obligations remain |
| B06 — Developer journey | IKaya organisation saved pending; discarded project counts found and rejected explicitly by #593 | 0 | #593 shared release succeeded | Previously accepted local scope; dependent property/publication journey remains incomplete |
| B07 — security/session/storage | Storage isolation #584, frontend headers #586, founder owner binding #590, logout revocation #591, subsequent live session checks | 0 | Shared releases below | Previously accepted scope; no new full security-package closure claimed |
| B08 — database release admission | Azure runtime/worker bindings and readbacks; media dependency inspection; founder schema 0095–0096; Place integration prepared, not applied nationally | 0 | Database operations separate from application deploys | Register OPEN; current API reports approved Azure/0096 |
| B09 — preservation/fresh accounts | Independent archive/USB custody reconciliation; TiDB writer freeze preserved; no legacy account import | 0 | No new app deployment specific | Register OPEN; completed preservation steps must not be repeated |
| B10 — transactional email | Worker supervision and actual Agent/Developer verification evidence; repeated idle batches | 0 | Email worker: 8 records, latest SUCCESS; older artifacts superseded | OPEN; idle batches do not prove every delivery/retry/bounce obligation |
| B11 — public/private storage | S3/CloudFront hardening, narrow identities, cross-proof denial corrected, bindings and public upload persistence evidence | 0 package; 1 storage review subgate | #584 reviewed/merged; consumed shared application release | OPEN package; bounded storage review accepted |
| B12 — hosted runtime | #585 Redis/readiness, #586 headers, #587 cadence, #588 verification round trips; repeated aligned deployments and joined probes | 0 | Railway: 30 records; Vercel: 32. See totals below | **OPEN: fresh sustained observation failed** |
| B13 — durable enquiries | Five-minute lead worker installed/verified; scheduled executions observed | 0 | Lead service: 10 records including 2 SKIPPED | OPEN; execution alone does not prove recipient/custody/retry |
| B14 — founder operations | Founder Google access, owner binding, repeat login/logout verified; sales containment retained | 0 | Shared #590–592 releases | OPEN; finance/moderation/support operating rehearsal incomplete |
| B15 — copy/consent | No new exact-copy approval found in period; existing drafts retained | 0 | None specific | OPEN; no legal/copy acceptance inferred |
| B16 — integration | #584–588, #590–594 review/CI/merge checkpoints; identical-tree source freezes; geography merged, not production-applied | 0 formal package | Shared release source chain | OPEN in register; individual merge gates passed |
| B17 — resilience/capacity | Readiness observations; national search diagnostics and senior correction (2.35s to 733/739ms local p95) | 0 | Local performance work; not production-deployed by this audit | OPEN; bounded 120-listing proof is not 10,000-listing/24-hour acceptance |
| B18 — final acceptance/GO | Controlled unpaid journeys and blockers recorded; no paid opening | 0 | Shared probes, no separate GO deployment | OPEN / paid launch NO-GO |

Package assignment for cross-cutting changes is an audit mapping, not retroactive formal acceptance. Geography supported B02/B06/B08/B16/B17 but is now paused.

## What actually closed

**No new formal B01–B18 package closure was found for October 2–8.** B01–B07 were already accepted within their defined scopes before this period. B08–B18 remain OPEN in the central register. The brief's concern about formal closure is therefore valid; “nothing was delivered” would be inaccurate.

A specifically recorded **storage review subgate closed October 2**: reviewed source `fbdfb5f68eb935964b9add487576d094772fb72e`, five required CI checks, corrected live proof/media cross-read denial, PR #584 merge `51802b7d324c61e5ff79cc3515510b29f76022d5`. The [controlled-production record](../architecture/launch-readiness-and-product-convergence/27-controlled-production-release-2026-09-30.md) explicitly says the storage review gate is closed. This does not close all B11 hosted durability/recovery obligations.

The following are completed source/release checkpoints, not additional formal B-package closures:

| Date SAST | Checkpoint | Evidence / limit |
|---|---|---|
| Oct 2 | #584 storage source accepted/merged | `51802b7d3`; bounded storage subgate above |
| Oct 2 | #585 readiness/Redis source accepted/merged/deployed | `3160bced9` → `7f6c65c61`; five CI checks; API `41e1710e…`; readiness 971–1570ms and Redis in historical checkpoint |
| Oct 2 | #586 frontend security headers merged/deployed | `154f9aaa2` → `b34b6a0ee`; subsequent joined header/TLS checks; later readiness regression remains separate |
| Oct 6 | #587 refresh cadence merged/API deployed | `90620e279`; deployment succeeded but sustained checkpoint **failed** 503/887ms; no closure |
| Oct 6 | #588 round-trip correction merged/aligned release | `7440ab901` → `b0bebc343`; joined checkpoint evidence; later failure supersedes any assertion of permanent stability |
| Oct 7 | #590 founder identity/owner binding | `b0cb48f67` → `c1a1b813a`; live Google proof, schema and owner-binding checkpoint; enablement separately controlled |
| Oct 7 | #591 logout revocation | `cab3d5d30` → `51cfb989a`; stale browser session rejection; fresh auth latency then blocked further checks |
| Oct 7–8 | #592 bounded auth diagnostic and founder checks | `39db4c33e` → `3fb981cb0`; three account reads succeeded 3.56–4.00s; internal timing unavailable; later valid logout/repeat-login evidence retained |
| Oct 8 | #593 Developer persistence contract | `71c997a1b` → `7756376c9`; existing pending org preserved; unsupported counts HTTP 400; prior 48/48 readiness window passed |
| Oct 8 | #594 geography source integration | `0760bbf41` → `04821fe7a`; hosted CI passed; no national production materialisation/deployment acceptance |
| Oct 8 | Senior search performance local proof | runtime `6be9ef01d`, packet `9c28b3aa8`; two bounded tests pass, formal capacity gate remains open |

The named private checkpoints live under `/home/edwardspc/.local/state/property-listify/controlled-production-cutover-20261002/`, including `backend-readiness-checkpoint-7f6c65c6.md`, `developer-593-joined-release-checkpoint-20261008.md`, `founder-590-owner-binding-checkpoint-20261007T131658Z.md`, `logout-591-controlled-release-checkpoint-20261007.md`, and `auth-me-592-founder-verified-checkpoint-20261007.md`.

## Deployment accounting and outcomes

- **Railway production: 30 records** — 28 deployment attempts plus 2 SKIPPED lead-job records. Current statuses: 3 SUCCESS, 23 REMOVED/superseded, 2 FAILED, 2 SKIPPED. Historical packets record successful service artifacts later removed; REMOVED itself is not proof of past success. Candidate historical evidence paths are included in the JSON ledger, not counted as independently revalidated successful deployments solely from a text match.
- **Vercel: 32 attempts** — 12 production READY artifacts, 20 automatic preview ERROR artifacts. READY means artifact build/deployment success, not a successful joined customer journey. Early production builds on `4e012b304` were superseded and do not represent the current release.
- **Railway Testing/Staging:** no deployments returned in the period. **Redis:** existing deployment predates October 2; no new Redis deployment in this window.
- **Azure/AWS:** configuration, protected schema/reference and storage operations are documented separately; not invented as application deployment IDs. No complete independent Azure/AWS activity-log census was performed in this audit. The known records are reflected in B08/B09/B11 above.

The two failed Railway API deployments are `c35c0e4c-64eb-4044-9a57-5a1e561a13ab` and `995e3337-bb38-4545-8e7a-92ad1daed971`, both on `cbc18c8fd…`. Recorded failure: provider health gate. Diagnostic evidence: readiness 12,167ms and memory cache despite reviewed `REDIS_URL`. Slow full verification was a plausible contributor; a particular provider per-request timeout was not proven. #585 corrected background verification and actual Redis connection/recovery; #587/#588 addressed later refresh expiry/round trips.

Each of the 20 Vercel preview errors returned `ENOENT` / `Command "pnpm build:frontend" exited with 1` in authenticated deployment details inspected during this audit. That message is a build failure symptom, not a complete root-cause analysis. No new preview repair or exception extension was performed. The existing preview exception is retained, and successful manual production artifacts are separately listed.

Current live tuple (provider SUCCESS/READY plus public identity observation):

| Component | Deployment | Source |
|---|---|---|
| API | `495723b6-d09b-46c3-bec0-24902f289a06` | `7756376c9ec604b352595b4e4ba8ced73f18562b` |
| Email supervisor | `4d18e7ce-084c-486a-87b1-39dca207bdde` | same |
| Five-minute lead job | `19a8fac1-b750-4a8f-8f5d-1d94e725f460` | same |
| Frontend | `dpl_9voWXeyGQw63Un2cb6HgztUgKCyD` | same |

Railway readback showed pinned source on all three application services, one replica each, email supervisor restart ALWAYS, lead cron `*/5 * * * *` / restart NEVER, and no staged changes on those production services. Redis configuration was present. These configuration observations do not erase the new readiness failure. Payment/admission/TiDB containment is carried from the latest signed checkpoint; this audit did not independently inspect every secret-bearing value or TiDB writer process.

## B12 correction review and next direction

The already-deployed correction consists of #585 (`aa9519b4d`, reviewed recovery fix `3160bced9`) plus #587/#588 follow-ups. #585's GitHub record confirms MERGED October 2, five successful required checks, and **no GitHub review entries**. Recorded senior/source acceptance exists in checkpoint evidence; it must not be represented as the new Engineering Manager's formal approval.

| Brief closure condition | Current evidence | Disposition |
|---|---|---|
| Successful readiness within 8,000ms | Initial 200/1042ms; 14 successful samples followed by 503/1015ms | **Fails sustained acceptance** |
| Redis rather than in-memory | Redis healthy in all 15 samples, including failure | Demonstrated for readiness-reported cache and security stores |
| Engineering Manager review/approval | Existing source-review history; new directive's approval not recorded | Pending |
| Correction deployed | #585 deployed Oct 2; follow-ups and latest source provider-confirmed | Historical correction deployed; no new patch ready |
| Post-deployment live/stable proof | Joined probe passed; fresh sustained observation failed | **Not satisfied** |

Source inspection shows a single background verifier and a 30-second age bound measured from assessment start. The missing-snapshot response can indicate pending, expired or invalidated evidence. The public response alone does **not** establish whether the cause is a slow SQL sweep, connection delay, event-loop delay, context change or failed assessment. A bounded provider runtime-log query for the failure window returned no entries; it does not establish that no internal error occurred.

**Next engineering assignment:** correlate one failing refresh with assessment start/completion, duration, outcome and exact target/source; distinguish expiry from assessment failure; then repair only the demonstrated cause. Preserve complete database checks, fail-closed behavior, Redis requirement, current freshness limits and eight-second acceptance. Use local focused regressions first. Do not rerun national geography work, customer registration or broad suites without a relevant change. Do not increase timeouts, relax readiness or deploy the latest geography-containing main merely to satisfy the schedule.

For a new correction, the review packet must name its base relative to the currently deployed `7756376c…`, included changes, focused results, exact required CI, deployment/rollback plan and verification window. Any source that adds the national Place migrations needs separate authority; B12 is not permission to apply them. Engineering Manager review and Edward's source/deployment approval precede execution. Formal B12 closure remains the Engineering Manager's decision after stable proof.

If diagnosis, access, review or correction timing threatens October 10: escalate Codex → Engineering Manager → Chief of Staff → Edward with observed root cause (or explicit unresolved mechanism), exact missing access/resource, realistic remaining duration and impact. Present impact as continued hosted-readiness/customer-test blockage and paid opening held; do not claim that unverified deployment safely removes it. No deadline extension is assumed.

## Process correction

The main failure in delivery management was accumulating successful task checkpoints without consolidating them into package-level acceptance. Tests discovered real issues, but repeating disconnected review/deploy loops and carrying stale status text obscured progress. The remedy is one B12 owner, one current evidence packet, one acceptance checklist and one explicit disposition. Preserve prior valid proof and rerun only what changed or what the current intermittent failure invalidates.

This response is an audit and current-state handoff, not a declaration of launch readiness or permission to reopen payments.
