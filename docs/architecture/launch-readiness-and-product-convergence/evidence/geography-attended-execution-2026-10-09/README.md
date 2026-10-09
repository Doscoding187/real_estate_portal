# Attended geography execution packet — production approval requested

**Prepared only. No production change has begun.** This packet proposes the attended schema execution and its containment/preservation setup. Reference-data application and compatible application deployment remain separate approval decisions.

| Execution identity | Proposal for approval |
| --- | --- |
| Operator | **Codex**, the current implementation agent, executing the named commands |
| Attending approver and incident owner | **Edward**; authorizes protected credential use and makes continuation/recovery decisions |
| Proposed window | **2026-10-09 18:00–20:00 Africa/Johannesburg (SAST)**; **16:00–18:00 UTC** |
| Window status | Proposed, not booked or approved; if missed, nominate a new window and refresh its live prerequisites |
| Accepted source | **49a48572c24d1b122fcf17b025a76e5ab77f03a8**, merged PR #595 |
| Accepted tree | `f0db8b4f4b964346f28282f9616d0e59d3e673e0` |
| Production target | Azure MySQL `propertylistify-mysql` / `propertylistify_database` |
| Exact target fingerprint | `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced` |
| Schema transition | `0096_user_founder_authority_unique.sql` → `0111_properties_canonical_place_reference_fk.sql`; 15 DDL statements |
| Exact schema-plan digest | **d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d** |
| Approval state | Source integration accepted; execution, containment changes, backup creation, runner creation, data application and deployment have not been approved |

Edward confirmed Codex as operator with Edward attending. The window remains proposed; production approval must confirm it or amend this packet before execution.

The [fresh schema plan](../geography-protected-release-plans-2026-10-09/protected-schema-plan.json), [ordered SQL/checksums](../geography-protected-release-plans-2026-10-09/migration-inventory.md), and [October 9 inspection](../geography-protected-release-plans-2026-10-09/protected-inspect.json) remain the exact review inputs. At execution, a read-only re-plan must produce this digest and the same old/new heads, released prefix and clear attempt state; drift stops for review. No unchanged tests or local build/performance cycle was repeated to prepare this packet.

## Approval boundary and proposed actions

Schema execution approval must explicitly cover: the temporary release runner described below, API ingress containment, stopping/draining the three writer services and disabling the lead cron without deploying, the named pre-DDL backup on the existing Azure server, the exact schema apply, and its read-only verification/applicable Place-plan generation. It does **not** authorize reference writes, grants, deployment of the application/worker/frontend release, public-write resumption, a provider/database restore, payment opening or launch acceptance.

Setup is conditional: the runner must have working approved connectivity and the ingress rule must be accepted and demonstrably effective **before** existing API/worker containment proceeds. An unavailable platform feature, a different outbound address needing firewall access, inability to drain, or insufficient attendance stops before DDL. No firewall broadening or infrastructure substitute is pre-authorized.

## Current preservation and recovery

[Current read-only Azure evidence](current-preservation.json) records the server Ready on 8.4 in `southeastasia`, backup retention **14 days**, earliest restore timestamp `2026-09-25T14:33:21.339004+00:00`, and geo redundancy disabled. The latest observed Ready FULL backup is:

- Name: **daily-20261009t143404-b1759c5b-c96f-4cc8-85fc-8d66ab21425f**.
- Completed: **2026-10-09T14:34:07.268442+00:00**.
- Provider ID: recorded in the evidence, bound to this exact production server.

These are provider backup/retention observations, not a current restored-copy proof or a measured RPO/RTO. The [September 29 recovery proof](../../../../database-authority/azure-fresh-transition-readiness-2026-09-29.md) restored the earlier 8.0 state; it cannot certify today's customer state or schema 0111.

After approved containment proves all writers stopped, propose an on-demand FULL backup named **pl-geog-pre0111-20261009** on the same registered server. Record the actual freeze time, backup resource ID, start/completion times and Ready result. Require completion after the freeze and before DDL; if the name exists unexpectedly, the state is ambiguous, or completion exceeds the allocated 15 minutes, stop before schema apply. Do not silently recreate/retry a backup with an uncertain outcome. No backup has been created by this preparation.

Recovery follows the actual schema state:

| State at interruption | Compatible recovery |
| --- | --- |
| Before any DDL, verified head still 0096 | Restore the recorded pre-window application/worker artifacts and cron through an attended provider operation, verify existing readiness, then remove containment only under Edward's decision. |
| Partial, failed or ambiguous DDL | Keep ingress blocked and workers stopped. Preserve the durable attempt/lock/statement outcome; inspect with the read-only runner. Return a named recovery plan for exact approval. Do not replay, edit the ledger, drop installed objects or resume the old artifact. |
| Complete, verified 0111; reference approval pending | Keep maintenance. Generate the applicable Place-data plan and await its separate approval. The old 0096 application is not the recovery artifact. |
| Verified 0111 and approved/verified Place data; application failure | Use the pinned **49a48572** source and canonical service configurations as the schema-compatible forward recovery candidate. Preserve the successful schema/data writes. Any new code fix requires source review; failed deployment never authorizes old-source rollback. |
| Database/provider recovery required | Edward initiates a separately reviewed in-region Azure PITR/new-server recovery using the recorded pre-DDL preservation point. Register and authorize the new exact target before connection, independently verify recovered state, and reconcile to 0111 before using the 49a48572 runtime. No existing database is overwritten and no bindings change under this schema approval. |

Azure restores create another server; that path needs its own resource, target, cost and recovery approval. No geo restore or zero-loss guarantee is implied by the present settings. [Azure backup/restore authority](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-backup-restore).

## Independent runner prepared for approval

[Independent workstation planning](independent-runner-access.json) failed to connect using the authorized SELECT-only inspector. The successful existing transport uses the API container, which containment will stop. Therefore execution cannot rely on that container staying alive.

Proposed temporary Railway service: **pl-geography-release-runner-20261009**, in project `8cdd7515-ddd2-4252-bbee-df5a5c209d4b`, production environment `63070d99-357a-40ba-99c3-6d1368f61652`, same `asia-southeast1-eqsg3a` region. [Runner configuration](release-runner.railway.json) starts only an idle Node process; it imports no application/worker code. No public domain, cron, volume, Git trigger, application secret or permanent database credential is permitted. Only the accepted source plus this explicitly reviewed deployment envelope is uploaded. Configure its service to select `/release-runner.railway.json`, rather than the root API configuration; record its new service/deployment/instance IDs and source/envelope digests.

Before freezing writers, observe runner terminal success, verify source/lock/inventory hashes, and run the named schema plan with the dedicated inspector via protected SSH stdin. Its actual outbound identity must fit existing approved Azure access; otherwise stop and review a specific access proposal. Do not broaden Azure rules or borrow API credentials to make access work. The runner is not created and its connectivity is not yet proved.

Proposed runner resource ceiling: one instance, 1 vCPU, 1 GiB memory, no storage volume, attended lifetime at most two hours, **USD 1 incremental runner spend cap**, no plan/SKU upgrade. Check the actual provider limits/estimate before creation; if those bounds cannot be respected, return an amended proposal. This cap is a proposed approval constraint, not a price quote or a claimed automatic billing limit. An active/ambiguous schema operation must never be killed merely to meet the clock; Edward must decide a bounded incident extension. Close ephemeral credentials after each role, preserve sanitized evidence, then remove only the recorded temporary service under the approved cleanup scope.

## Maintenance and worker containment

Current bindings and artifact IDs are in [current hosting](current-hosting.json). The API has two public origins, both of which must be contained: `api.propertylistifysa.co.za` and `realestateportal-production-9bb8.up.railway.app`. Current edge configuration has no rules; [edge/trigger readback](edge-and-trigger-readback.json) records this and the absent production Git triggers.

Apply the prepared [maintenance edge rule](maintenance-edge-rules.json) only after execution approval. It blocks **every request**, including GET-based auth callbacks and tRPC batch routes, with a maintenance body; it is not a payment-only pause or browser challenge. Railway rules cover all domains of the selected service and require an allowance on the current plan. Validate the rule against the provider before the window and verify a safe GET to `/api/version` is blocked on both origins after installation. No synthetic customer write is required. Failure to install/verify the rule stops before writer shutdown/DDL. [Railway edge-rule authority](https://docs.railway.com/networking/edge-rules).

| Writer | Recorded identity | Required containment |
| --- | --- | --- |
| API | Service `db88a720-2d1f-4afc-a3a8-6228b6b08d3e`; deployment `93b7b423-91ac-4855-b8a7-e8fb53a0f112`; source `68f2c679…` | Block both public origins, then gracefully stop the exact deployment. Confirm zero live API processes, so its saved-search/term schedulers also stop. |
| Email supervisor | Service `59c0d8f8-abe2-4696-ad9c-de1037723b66`; deployment `4d18e7ce-084c-486a-87b1-39dca207bdde`; source `7756376c…` | Stop new batches, allow the current batch to finish and close its DB connection, then stop/remove the exact deployment so its ALWAYS restart policy cannot restart it. Do not use a shell kill as proof of drainage. |
| Lead job | Service `e1e32aa8-0b85-4c91-af18-843f1bc52d9f`; deployment `19a8fac1-b750-4a8f-8f5d-1d94e725f460`; cron `*/5 * * * *` | Commit a production-only cron-null patch with `skipDeploys=true`; preserve the original schedule. Let any current one-shot finish, then stop/remove the exact deployment. Prove no live instance or subsequent launch. |
| Other/admin writers | Current approved writer inventory | Edward confirms no console, import, cron, automation, other environment or operator session writes to this target. Any unaccounted writer is a stop condition. |

The API code has a 20-second shutdown deadline. Email drainage may exceed that; allocate up to 10 minutes for the whole containment phase and stop before DDL if a provider attempt is in flight/ambiguous or a process is forcibly terminated. Preserve unknown delivery outcomes without retrying sends. Inspect aggregate session/transaction/writer state through the approved read-only authority; no grant change, SQL kill or provider console DDL is part of containment.

Preserve Redis, object storage, source/reference pins, organisations and customer records. Redis may receive infrastructure activity, but no application DB writer may remain active. Frontend static assets can remain served while the API reports maintenance. New signed-upload issuance and confirmations are blocked; already-issued object-storage URLs may complete object uploads, so this is application DB write containment, not object-store immutability. No orphan-image cleanup is permitted.

Maintain the edge block, stopped workers, paused cron and commercial/payment holds while awaiting reference and deployment approvals. The window ending does not authorize unfreezing an incompatible application.

## Attended sequence and time budget

| SAST | Operator action and evidence gate |
| --- | --- |
| 18:00–18:10 | Edward present; approval scope recorded; preservation metadata refreshed; independent runner/source/connectivity verified; exact plan digest and head/attempt invariants checked. Stop if setup is incomplete. |
| 18:10–18:20 | Install/verify ingress maintenance, disable lead scheduling without deployments, drain/stop email and API, confirm no writers. Record freeze timestamp. |
| 18:20–18:35 | Create the separately approved named pre-DDL FULL backup; require Ready and completion after freeze. No DDL before this evidence. |
| 18:35–18:50 | Apply the exact schema plan once. Start no later than 18:40; a long/ambiguous operation is observed and escalated, never automatically retried or terminated. |
| 18:50–19:05 | Read-only schema verification: complete 0111 history, clear attempts/locks, zero pending schema work, congruency, FKs/indexes, 39 enforced CHECKs. Generate and return the applicable Place reference plan/digest. **Schema approval scope ends here.** |
| 19:05–19:15 | Edward/senior reviews the applicable data plan. No data writes or deployment without their exact separate approvals. At 19:15, decide whether the remaining attended window can cover separately approved continuation; otherwise retain maintenance and agree a new window. |
| 19:15–20:00 | Reserved only for separately approved reference application, its verification, compatible deployment and actual-release checks. Not authorized by schema approval. If continuation fails or approvals are absent, retain containment and make an incident/extension decision before 20:00. |

Exact schema command, **not executed**:

```sh
pnpm db:release:apply -- --accepted-old-head=0096_user_founder_authority_unique.sql --expected-new-head=0111_properties_canonical_place_reference_fk.sql --plan-digest=d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d --ack=CONFIRM_RELEASE_APPLY_b23d640cdf242812
```

Use the repository's protected release environment with operation/fingerprint approval. Access the distinct same-target migration credential through the approved private custody mechanism and an ephemeral hidden process input; never put `DATABASE_MIGRATION_URL` in a command argument, repository, service variable, evidence or persistent environment file. Do not ask Edward to paste credentials into chat. Approval actor/reference and target/credential class must match the exact operation. Return to the SELECT-only inspector after application; do not keep using the migrator for read-only planning.

After verified schema installation, run **only the applicable data plan**, then return its exact digest for separate approval:

```sh
pnpm db:release:reference:plan -- --adapter=places
```

The current pre-schema reference result has a null digest and cannot authorize application. Keep the 16,944-Place subset and 720 OSM-only exclusions unchanged. A privilege gap for newly installed objects needs its own reviewed named grant plan.

## Prepared compatible deployment, held

[Prepared artifact custody](prepared-artifacts.json) binds an exact immutable Git archive of **49a48572** and downloads the existing successful CI build output. Source bundle SHA-256: **8b021bc11b4266f72a14c7e64d059a2964538e1f65a1e50f72628226a8a244cd**. No secrets/environment files/node_modules were added. Private custody and every downloaded build-file hash are recorded.

The CI frontend reports environment `development` and synthetic PR-build SHA `23c18fff92b112c43bf7638241eafeda26c76b1d`. It is validation evidence, **not a production frontend artifact**. Do not deploy it unchanged or relabel its stamp. The attended compatible deployment is prepared as pinned source/configuration; production provider builds and deployment IDs do not yet exist. Production artifact preparation will occur once within the separately approved deployment, without rerunning unchanged tests.

[Deployment manifest](compatible-deployment.json) pins source/tree/target, service IDs, canonical configuration files and public frontend origins:

[Read-only frontend identity](current-frontend.json) resolves Vercel project **`prj_Xf9Sfzemo9c0Bfq6cgzRb5PGHTtN`**, team **`team_wGNClVbXptfEtznBC5p1YfO2`** (`edwards-projects-29c395d1`), with verified production domains `www.propertylistifysa.co.za` and its apex redirect. The latest observed READY production deployment is `dpl_9voWXeyGQw63Un2cb6HgztUgKCyD`, source `7756376c9ec604b352595b4e4ba8ced73f18562b`; this bounded list read does not independently prove current domain traffic or application correctness. Refresh the same bindings before an approved deployment; do not substitute a new project.

1. API: `/railway.json`, `pnpm start:hosted:api`, production environment and runtime-class identity.
2. Email: `/railway.email-worker.json`, `pnpm email:supervisor`; lead: `/railway.lead-job.json`, `pnpm lead-delivery:worker`. Deploy only after schema/reference verification and deployment approval. Keep lead scheduling held until its explicitly approved resumption; do not let its canonical cron restore start claims prematurely.
3. Manual Vercel frontend: pinned **49a48572**, `VERCEL_ENV=production`, `VITE_DEPLOY_ENV=production`, `BUILD_SHA=49a48572…`, HTTPS production app/API origins, approved existing feature/media settings and no mock email. Preserve `git.deploymentEnabled.main=false`. Existing preview failure remains a separate unresolved deployment risk; no production success is inferred from green CI.

Require each submitted deployment's own terminal SUCCESS, source/config/artifact identity and layered readiness. Keep public ingress blocked until accepted API/worker/frontend agreement and the established actual-release checks pass once. Perform internal read-only health/readiness checks while the edge is blocked; do not bypass the edge with a customer mutation. Verify B12's correlated source/deployment/replica/target assessment, single-flight control and 30-second freshness rule. Old source rollback is not schema recovery.

Reopen only the explicitly approved controlled unpaid customer access after those gates. Then North Riding server-private draft save/reload → three confirmed images/order/details → fresh reload; preserve IKaya's existing organisation/pending review; verify customer-entry discovery/detail/enquiry using eligible public inventory. Follow the accepted [customer continuation](../pr595-reconciliation-release-review-2026-10-09/customer-continuation.md). Payments remain closed, and founder/logout/registration checks remain complete unless regression evidence appears.

## Stop conditions

- Missing explicit scope, Edward attendance, an elapsed/unconfirmed window, unverifiable preservation, runner/egress/edge-rule failure, unaccounted writers or incomplete drainage: stop **before DDL**.
- Changed source/manifest/target/head/checksum/digest, foreign or incomplete attempt/lock, unexpected objects or rows: stop for canonical reconciliation; no precedence/fallback or forced plan reuse.
- Failed/unknown migration, exhausted time budget, missing/enforcement-different constraints or noncongruent schema: retain maintenance and durable evidence; no silent retry, manual SQL or ledger repair.
- Null/non-applicable/drifted reference digest, uncleared data/grant approval, or changed licensing hold: no reference apply or deployment.
- Provider build/deploy failure, wrong source/config/stamp/origin, missing runtime permissions, negative/expired readiness, unmatched workers/frontend, or affected smoke failure: keep public writes contained and return the exact stop evidence.
- Approval delays or window expiry: no automatic restart, cron resumption, ingress removal, payment activation or old-source rollback after schema change.

No production changes, backup creation, runner creation, worker stop, edge change, schema/reference application, deployment, grant change, customer write or payment activation occurred during packet preparation. Read-only metadata and the failed independent read-only connectivity probe are recorded. [SHA256SUMS](SHA256SUMS) covers the execution packet.
