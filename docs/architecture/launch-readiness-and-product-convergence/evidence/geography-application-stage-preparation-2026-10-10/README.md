# Compatible application release preparation — 10 October 2026

The junior acknowledges the senior's `NEXT-APPLICATION-STAGE.md`. Reference recovery custody is archived. This packet prepares the application release for the senior's final review and execution; it does not execute that release or reopen traffic.

Application source is **57ea5f5e98ff031a4d0f0814998e60fe27a82b2b**, tree **d832836d40746d36401b6fb1a3603466e6660a00**. It descends from protected schema source `49a48572c24d1b122fcf17b025a76e5ab77f03a8` and includes the accepted natural-shutdown fix. The packet branch starts at accepted reference evidence commit `ae5f3e80332b154fde6af4ceb4d9f653e7619fcf`; application/runtime/build inputs are byte-identical to the pinned application source. Deploy the pinned source, not this documentation branch or moving main.

## Reviewable inputs

- [Source archive binding](source-artifact.json): exact committed source exported into private local custody, SHA-256 bound. Backend scripts run TypeScript through `tsx`; their build commands are intentionally no-op and do not migrate or seed.
- [Exact-source CI](exact-source-ci.json): [run 38040419705](https://github.com/Doscoding187/real_estate_portal/actions/runs/38040419705) succeeded at the pinned SHA across all five jobs. Artifact IDs/digests/expiry are retained. No unchanged product tests or CI were repeated.
- [Offline frontend artifact](frontend-artifact.json): exact source built successfully with the explicit production origin/version inputs. Its tar, file inventory and log are privately retained with digests. This candidate is **not cleared for deployment** until the existing additional public inputs and Vercel delivery settings are reviewed. It is a static bundle, not a Vercel build-output manifest. The previous CI frontend artifact used different public build inputs.
- [Provider readback](provider-config-readback.json), [environment status](environment-status.json), [variable digests](configuration-value-digests.json), and [explicit configuration diff](configuration-diff.md): API/email/lead remain offline; Redis remains online. All three existing database URLs resolve to the accepted fingerprint; Redis identity agrees; API uses `runtime` and workers use `worker`. Only adding the pinned `BUILD_SHA` makes each existing environment pass the offline hosted configuration check. This establishes configuration consistency, not connectivity or readiness.
- [Accepted schema/reference bindings](accepted-target.json): schema 0111, manifest `600ccfc5ae5ddc480fe0274edc8a5e3624c2bab32aa3da65f314acd3803cef3c`, target `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`, 16,944 admitted Places / 157,728 assertions, 720 held Places and dependants excluded. Senior acceptance is in [the completed reference packet](../geography-reference-stage-accepted-2026-10-10/README.md).
- [Custody closeout](custody-closeout.json): original alarm tests, intent acknowledgement, observations, unit definitions/journal and exact runner deletion evidence preserved. Own timers/services read inactive; the final read-only observer completed naturally. No active/unknown operation was killed or deleted by custody.
- [Attended checklist](attended-checklist.md), [customer/media proof](customer-proof-plan.md), [search/performance plan](search-performance-plan.md), and [recovery](recovery.md) define the next evidence cycle.

## Decisions and evidence still required

1. The senior must bind the separately authorized application window and artifact transport. Preparation adds no release authority.
2. All three services need `BUILD_SHA` set to the pinned SHA in that release. Preserve existing DB/Redis/security/media credentials and approvals; no credential or grant change is proposed.
3. The lead repository configuration contains `cronSchedule: */5 * * * *`; current live cron is absent. Selecting that file can re-enable jobs. Keep the lead service offline and cron absent through preflight; approve any scheduling activation explicitly. Selecting worker config files and reconciling API restart settings are listed in the diff.
4. Vercel has existing encrypted public build inputs (including supplemental journey releases, CDN, Maps and analytics). Their names were inventoried without decryption. Resolve their approved values/digests and build/delivery settings before accepting the candidate, so the release does not silently change other journeys or media behavior. Any resulting build has a new artifact digest even with identical source.
5. API startup runs the commercial-term scheduler and routine readiness requires it. An API start can write notices/events; email and lead workers can claim/send immediately. Writer containment applies through preflight. Starting these processes is part of the senior's application execution scope, not a harmless offline smoke check.
6. Actual hosted version/readiness/joined probe, worker behavior, private draft/image persistence and national search measurements remain **not run**. Historical local customer proofs are supporting evidence, not production acceptance. Earlier national local measurements failed concurrency-5/20 latency budgets; do not report a speed pass or lower the budgets.
7. Positive public search inclusion needs existing eligible canonical inventory. A private draft must remain excluded. This packet authorizes no synthetic public fixture or publication to obtain a positive result.

No deployment, migration replay, seed, reference apply, new runner, protected connection, production data write, credential/grant/firewall change, payment activation, reopening or management submission occurred in this preparation. Read-only provider metadata, static configuration validation and the offline frontend build are the new checks. Explore expansion and legacy retirement remain outside this stage.

## Local review

Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-geography-compatible-application-20261010`; branch: `prep/geography-compatible-application-20261010`. The shared local environment resolved a task-owned disposable target, but the service was unavailable and no database was provisioned. Its fingerprint is `202ec226f5a7ffb7f9faca61c52f354ca318be600d52f3e7b2c5263afeff792d`; this is not the production fingerprint.

All **108 offline evidence/identity checks passed**; see [validation receipt](packet-validation.json). The search harness syntax and missing-origin refusal were checked without live requests.

Run `python3 validate-packet.py` and `sha256sum -c SHA256SUMS` from this directory. The validator is offline; the attended search script is a separate future operator step. Evidence objects marked prepared/not-run cannot satisfy a release acceptance gate.
