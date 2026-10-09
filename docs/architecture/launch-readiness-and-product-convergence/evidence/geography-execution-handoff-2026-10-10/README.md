# October 10 attended schema execution handoff

**For the senior through Edward. Prepared locally; no production command executed.** This is the single operator checklist for the approved **10 October 2026, 18:00–20:00 SAST (16:00–18:00 UTC)** window. **Codex operates; Edward attends and owns continuation/recovery decisions.** Approval is recorded in [EDWARD-APPROVAL.md](../geography-containment-amendment-2026-10-09/EDWARD-APPROVAL.md), commit `e29bff52f0d42577f4350c0bff7094922c0dd85b`. It supersedes the earlier pending-approval/window wording; it does not certify fresh attendance or successful production drainage.

Containment authority is **`87a16b324dabd095f6659f88d53a3676623d8b7b`**, including its [senior corrections](../geography-containment-amendment-2026-10-09/SENIOR-REVIEW.md). Use its corrected client and current evidence, not the earlier client revision. This handoff consolidates that approved procedure and the existing schema execution packet; it changes no operational script, schema plan, reference input or application source.

| Immutable binding | Value |
| --- | --- |
| Schema/application release source | `49a48572c24d1b122fcf17b025a76e5ab77f03a8` |
| Source tree | `f0db8b4f4b964346f28282f9616d0e59d3e673e0` |
| Exact approved schema-plan digest | `d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d` |
| Target | Azure MySQL `propertylistify-mysql/propertylistify_database`, South Africa North |
| Target fingerprint | `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced` |
| Schema transition | `0096_user_founder_authority_unique.sql` → `0111_properties_canonical_place_reference_fk.sql`; 15 DDL statements |
| Canonical manifest digest | `600ccfc5ae5ddc480fe0274edc8a5e3624c2bab32aa3da65f314acd3803cef3c` |
| Corrected drain-client SHA-256 | `e483eed8b9c14100850177aaefedef60812e7b0ecc414752131e9c3cfd9bba62` |
| Railway project / production environment | `8cdd7515-ddd2-4252-bbee-df5a5c209d4b` / `63070d99-357a-40ba-99c3-6d1368f61652` |
| Azure subscription / resource group | `384dc69e-9e22-419f-9e3d-83fbac4f58d0` / `rg-property-listify` |

**Approval ends after exact schema application, physical verification and read-only applicable reference-plan generation.** Reference-data writes, grants, application/worker/frontend deployment, service reopening, cron resumption and payments remain held. The approved temporary idle release runner is infrastructure for this schema stage; it is not approval to deploy the application. No automatic/unattended execution is scheduled.

## Local verification completed

[Local verification record](local-verification.json) binds the checked artifacts. All **50 entries** across containment (20), attended execution (10), schema preflight stop (8) and protected release plans (12) passed SHA-256 verification. Every containment-manifest file and the manifest itself match the approved Git commit byte for byte. Static `node --check` passed for all five approved `.cjs` files; no script body, fixture, test, build or performance workload was executed. The separate approval record matches its recording commit.

The accepted source archive and existing CI ZIP match their recorded hashes and mode-0600 custody. The reference registry hash and the nine pinned territories are preserved. The corrected senior evidence contains 12 passing tool tests and separate successful synthetic API/email rehearsals; those are **preserved results**, not rerun results. The corrected rehearsal used local Node 22.22.3 and two intermediate launchers. Earlier provider/runtime evidence used Node 22.23.3 and three; neither replaces fresh production ancestry or real work/connection completion.

`pnpm db:authority:status` was the only database-authority command run during preparation. It inspected the owned disposable local context; its disposed service is unreachable and no database was initialized. No protected target was accessed.

## Command classes and custody

**LOCAL** means local file/hash/syntax checks only. **RO** means authorized read-only production observation/planning; it still needs the correct existing account and exact target. **MUTATION** means an approved production operational change, including signals and in-memory quiescence. Each label below applies only during the attended window; **none of these production commands has been run for this handoff**.

Run protected `pnpm` commands from the checksum-verified **49a48572 source on the independent runner**, never from the operational evidence commit or the live old application tree. Use the existing approved hidden credential channel: inspector for read-only operations, distinct migration identity only for `release-apply`. Required context includes production environment, Edward approval actor/reference, exact fingerprint and operation-specific credential class. No credential URL in argv, shell history, repository, service variables or evidence. The earlier [transport source](../geography-protected-release-plans-2026-10-09/read-only-transport.source.txt) documents custody and sanitization; it is historical, **not** an execution script to replay (it assumes old HEAD/old history and uses the soon-to-stop API container).

Provider tool operations below name exact actions/inputs; they are not a combined executable script. At the window, inspect the current provider schema and require the recorded scope before issuing a mutation. Do not substitute `accept_deploy`, a general staged-change commit, a redeploy, an alternate connection factory or an improvised SQL runner. A changed interface stops for review.

### Expected existing artifacts — refresh, do not reuse observed PIDs

| Role | Service | Deployment | Recorded instance | Existing source |
| --- | --- | --- | --- | --- |
| API | `db88a720-2d1f-4afc-a3a8-6228b6b08d3e` | `93b7b423-91ac-4855-b8a7-e8fb53a0f112` | `41e46a78-215c-4feb-9c7a-b0aa7d5faf50` | `68f2c679eb423dd0da8cb2b5115a85d4620a10aa` |
| Email | `59c0d8f8-abe2-4696-ad9c-de1037723b66` | `4d18e7ce-084c-486a-87b1-39dca207bdde` | `247f1dd2-351f-4eca-9e9d-848aad046f9e` | `7756376c9ec604b352595b4e4ba8ced73f18562b` |
| Lead cron | `e1e32aa8-0b85-4c91-af18-843f1bc52d9f` | `19a8fac1-b750-4a8f-8f5d-1d94e725f460` | Discover exact current one-shot, if active | `7756376c9ec604b352595b4e4ba8ced73f18562b` |

Both API origins must be contained: `api.propertylistifysa.co.za` and `realestateportal-production-9bb8.up.railway.app`. Preserve Redis and storage. Already-issued object-storage upload URLs may still upload objects; the freeze is application/database writer containment, not object-store immutability. No orphan cleanup is included.

## One operator checklist

The stage reservations follow approved containment commit 87a16b3. Use this October 10 timetable in place of the old October 9 clock slots. Budgets are escalation boundaries, not permissions to force termination.

| SAST reservation | Stage | Required exit gate |
| --- | --- | --- |
| 18:00–18:10 | Preflight and independent runner | Attendance, exact authority, connectivity and all-writer visibility established |
| 18:10–18:35 | Maintenance and drainage | Current requests/jobs finished, real pool closure, clean exits, provider removals and six-minute no-writer observation |
| 18:35–18:50 | Frozen backup and fresh plan | FULL backup Ready after recorded freeze; unchanged exact schema digest |
| 18:50–19:05 | Schema apply once | Durable success through 0111, outcome known |
| 19:05–19:20 | Physical verification and reference plan | Congruency/checks/FKs/indexes verified; applicable data digest returned |
| 19:20–20:00 | Incident/approval decision reserve | Keep all holds; no automatic continuation to data/deployment/reopening |

### 1. Preflight

- [ ] **RO / human gate:** Edward confirms attendance, the approved scope and enough remaining window. If the window has passed, attendance is absent or setup cannot finish safely, use recovery **R0** and do not begin production mutations.
- [ ] **LOCAL:** verify the approved manifests again after transfer using `sha256sum -c SHA256SUMS` in each of the four existing packet directories. Verify the corrected client hash against the table above and the application archive hash `8b021bc11b4266f72a14c7e64d059a2964538e1f65a1e50f72628226a8a244cd`. Do not rerun unchanged tests. Mismatch → **R0**.
- [ ] **RO:** `get_service_config(projectId, environmentId, serviceId)` for API/email/lead and `environment_status(projectId, environmentId, includeSuccessful:true)`. Read exact deployments/instances, image/source identities, ancestry, `/proc/<pid>/stat` field-22 start ticks and deployed file hashes. Match the approved [process evidence](../geography-containment-amendment-2026-10-09/current-process-bindings.json), single replicas and expected commands. Check production Git triggers remain absent, Vercel `main` automatic deployment remains disabled, and no staged/applying deployment or unrelated writer exists. Drift → **R0**.
- [ ] **RO:** refresh Azure Ready/8.4/region, retention and recovery metadata with the following commands; compare the exact server resource ID. Do not treat October 9 metadata as current or as a restored-copy proof.

```sh
# RO: explicit subscription; no persistent az account/config change.
az mysql flexible-server show --subscription 384dc69e-9e22-419f-9e3d-83fbac4f58d0 --resource-group rg-property-listify --name propertylistify-mysql --output json --only-show-errors
az mysql flexible-server backup list --subscription 384dc69e-9e22-419f-9e3d-83fbac4f58d0 --resource-group rg-property-listify --name propertylistify-mysql --output json --only-show-errors
```

- [ ] **RO / mandatory visibility gate:** Edward accounts for every admin/import/other-environment writer. Identify the **already-authorized** observer that can see all relevant sessions/transactions and record its identity, visibility and own connection ID. The dedicated `propertylistify_b08_inspector` deliberately has only global USAGE and database SELECT; its successful schema/reference inspection **does not prove global session visibility**. The existing packet has not established an all-session observer. If that observer cannot be proven at preflight, stop under **R0**; no grants, borrowed admin credential or new connection path. This requirement must be resolved before containment, not discovered just before DDL.
- [ ] **MUTATION — approved temporary runner only:** create `pl-geography-release-runner-20261009` in this project/production environment, using the existing [idle-runner envelope](../geography-attended-execution-2026-10-09/release-runner.railway.json) and pinned source. Record the new service/deployment/instance IDs, envelope and source hashes. Set `/release-runner.railway.json`, NEVER restart, one replica in `asia-southeast1-eqsg3a`, 1 vCPU/1 GiB maximum, no domain/cron/volume/Git source trigger/application secrets. Upload only the reviewed private bundle with `railway up --project 8cdd7515-ddd2-4252-bbee-df5a5c209d4b --environment 63070d99-357a-40ba-99c3-6d1368f61652 --service <recorded-runner-service-id> --detach <reviewed-runner-bundle-directory> --path-as-root`. Observe that deployment's terminal SUCCESS; upload exit zero is insufficient. Limit attended lifetime to two hours and incremental runner cost to USD 1; neither is an automatic kill/billing guarantee. Egress/access/source/resource drift → **R0**. Do not broaden an Azure firewall rule.
- [ ] **RO — runner connectivity and authority:** verify source/dependency hashes and use the existing SELECT-only inspector for the two commands below. Require fingerprint match, the full 97-entry successful prefix through 0096, clear incomplete attempts and the exact approved 15-migration plan/digest. No plan-acquired lock or schema write is expected. A changed head/attempt/digest → **R0**.

```sh
# RO: operation release-reference-plan; dedicated read-only inspector.
pnpm db:release:reference:inspect -- --adapter=places
# RO: operation release-plan; same target, read-only class.
pnpm db:release:plan -- --accepted-old-head=0096_user_founder_authority_unique.sql --expected-new-head=0111_properties_canonical_place_reference_fk.sql
```

### 2. Maintenance

- [ ] **RO:** validate the existing [maintenance ruleset](../geography-attended-execution-2026-10-09/maintenance-edge-rules.json) with `validateServiceEdgeRules`; require no diagnostics and applicable edge-rule allowance. Failure → **R0**.
- [ ] **MUTATION:** install only that ruleset on the API service's production edge configuration, covering both domains. Commit only the lead service's `deploy.cronSchedule=null` patch via `environmentPatchCommit` with `skipDeploys=true`; preserve `*/5 * * * *` for a separately approved recovery/resumption. Require the narrow patch and unchanged deployment IDs; do not use a general deployment-triggering commit. Unknown outcome/unintended rollout → **R1**.
- [ ] **RO:** observe patch completion/effective readback; require no new deployment. Safe GETs below must return the prepared 403 maintenance response on **both** origins. Do not test containment with a customer write or by bypassing the edge.

```sh
# RO: GET only, during attended maintenance verification.
curl --silent --show-error --max-time 10 --include https://api.propertylistifysa.co.za/api/version
curl --silent --show-error --max-time 10 --include https://realestateportal-production-9bb8.up.railway.app/api/version
```

- [ ] **RO:** let any current lead one-shot finish normally; retain terminal success/clean-exit evidence and confirm zero running instances. Do not remove an active lead job. Missing maintenance, failed/unknown patch or unfinished lead → **R1**.

### 3. Drainage

- [ ] **RO:** re-resolve exact instance/PID/ancestry/start ticks before **every** signal. Historical PID 77 and ancestors 61/60/48 are observations only. Check Node/options do not redirect Inspector publicly; its intended loopback port is unused. Stop on altered argv/start ticks/extra replica → **R1**.
- [ ] **MUTATION:** through SSH in each exact API/email container, send SIGUSR1 to the bound application child. Verify the Inspector listener is only **127.0.0.1**, and discover its actual WebSocket UUID locally. No public Inspector endpoint, breakpoint/pause, heap dump, profiler, restart or redeploy. Address/signal uncertainty → **R1**. The signal operation is `process.kill(<freshly-verified-child-pid>, 'SIGUSR1')`; never send it to the outer pnpm or a process group.
- [ ] **LOCAL in the container:** transfer the corrected checksum-verified client to an owned mode-0700 directory and make a mode-0600 binding file. Required fields are `endpoint`, `role`, `pid`, decimal-string `startTicks`, unique lowercase operation `token`, and `approval: "EDWARD_APPROVED_ATTENDED_CONTAINMENT_AMENDMENT"`. No credential fields. Record the full instance/PID/start-tick/file-hash binding separately.
- [ ] **RO, after Inspector enablement:** run `inspect` for each exact binding; require the expected live singleton references and pool/server/scheduler interfaces before arming. Missing singleton/shape/identity → **R1**. Do not import a second module instance.

```sh
# RO: observes the existing live process; sends no signal or business mutation.
node <verified-drain-session.cjs> <private-api-binding.json> inspect
node <verified-drain-session.cjs> <private-email-binding.json> inspect
```

- [ ] **MUTATION:** arm each process **once**, with the correct token/binding. API arming stops both scheduler timers and gracefully closes its HTTP listener; email arming observes the existing pool's original closure without starting a batch. An interrupted/failed command may already have changed the target: never automatically re-arm → **R1**.

```sh
# MUTATION: existing-process observation wrapper; API also quiesces requests/jobs.
node <verified-drain-session.cjs> <private-api-binding.json> arm
node <verified-drain-session.cjs> <private-email-binding.json> arm
```

- [ ] **RO:** poll API state until `httpClosed=true`, `savedStopCompleted=true`, both scheduler `running`/`timerActive` flags are false, and `httpCloseFailed`, `savedStopFailed`, `poolEndFailed`, `logFailed` are false. Budget **120 seconds** for requests/schedulers; overrun → **R1**, keep the target alive and seek attended extension. Recheck immediately before SIGTERM.

```sh
# RO: identity/token/start-tick checked; an expired observer does not cancel work.
node <verified-drain-session.cjs> <private-api-binding.json> state
node <verified-drain-session.cjs> <private-email-binding.json> state
```

- [ ] **MUTATION:** SIGSTOP only the three freshly identified intermediate launchers (nearest child ancestor first: tsx CLI, shell, inner pnpm), checking unchanged start ticks and state **T** after each. Leave namespace PID 1, the application child, esbuild and observer/SSH processes running. No process-group signal. A partial hold or parent replacement → **R1** before SIGTERM; record exactly what was held.
- [ ] **MUTATION:** send **one SIGTERM directly to each verified application child**, after that role's prerequisites. API requests/schedulers must already be finished; permit its existing **20-second cleanup deadline** for awaited auth/cache/readiness/DB closure. Email has **15 minutes** to finish its current batch and await pool closure; abort prevents future batches. Run the role drains concurrently only when each gate passed. These budgets authorize no SIGKILL, forced HTTP close, send retry or claim-lease inference. Timeout/native deadline/failure/unknown outcome → **R2**.
- [ ] **RO:** retain token-bound `HTTP_CLOSED` (API), `POOL_END_STARTED`, `POOL_END_COMPLETED`, scheduler terminal flags, email batch terminal aggregate or demonstrated idle-at-abort, and no failure. Disconnect Inspector observers before waiting for child exit; corrected CLI success is printed only after disconnect. Each observer connect/command/disconnect is bounded at five seconds, total CLI at 60 seconds; these ceilings exit **only the observer**. Lost transport/logging → **R2** unless exact completion can independently be established; never infer completion from an observer timeout.
- [ ] **RO:** require actual child exit zero. With the parent held, an exact-start-tick zombie **Z** with `/proc/<pid>/stat` field 52 raw exit code zero is acceptable exited-process evidence. Verify no remaining owned descriptors/TCP sockets or live DB-owning descendants. Merely missing a PID or losing SSH is not enough. Ambiguous exit/socket/batch state → **R2**.

### 4. No-writer verification — before backup

- [ ] **RO:** use the globally visible, already-authorized observer established in preflight. Require no application/worker connection, even sleeping, and no active writer transaction. Account explicitly for independent read-only observer/provider sessions. Do not print query text/private payloads. The dedicated SELECT-only inspector cannot substitute for this visibility gate. Missing visibility/unaccounted session → **R2**.
- [ ] **MUTATION:** only after real API/email pool closure, clean exits, no DB sockets and completed lead work, invoke `deploymentRemove(id: <exact approved deployment-id>)` separately for the API, email and completed lead deployment from the table. Preserve services, configuration, domains and variables; do not delete services. Removal may clean up held launchers **after** all application work has exited, and is not the drain mechanism. An ambiguous removal/replacement → **R3**.
- [ ] **RO:** poll those exact artifacts until REMOVED/`deploymentStopped=true`, zero running/replacement replicas, no new lead execution and no staged/applying deployment. API ON_FAILURE/email ALWAYS cannot be accepted as contained until no restart is observed.
- [ ] **RO:** maintain verified ingress and cron holds and observe **six continuous minutes**, longer than the five-minute lead cadence. Require no new writer, request/job work, replica, DB application/worker connection or writer transaction. A restarted writer invalidates the freeze; stop under **R3**, not just restart the observation and continue. Record the freeze timestamp **after** this gate. Only then is a frozen-state backup permitted.

### 5. Frozen-state backup and fresh schema plan

- [ ] **RO:** confirm the approved backup identifier does not already exist and current preservation metadata remains valid. **Retain `pl-geog-pre0111-20261009`**, the exact identifier in the approved packet; the date in its name is an identifier, not the October 10 freeze/completion time. Unexpected pre-existing/ambiguous backup → **R4**; do not rename, overwrite or reuse it silently.
- [ ] **MUTATION:** create that backup once on the exact registered Azure server, only after the completed freeze gate.

```sh
# MUTATION: named backup only; no restore, deletion, provider upgrade or target change.
az mysql flexible-server backup create --subscription 384dc69e-9e22-419f-9e3d-83fbac4f58d0 --resource-group rg-property-listify --name propertylistify-mysql --backup-name pl-geog-pre0111-20261009 --output json --only-show-errors
```

- [ ] **RO:** poll that exact backup and retain its resource ID/type/start/completion. Require FULL, Ready and completion **after** the recorded freeze and **before** DDL. Budget 15 minutes; failure/unknown/overrun → **R4**, no repeat create. Command syntax follows the [Azure backup CLI](https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/backup?view=azure-cli-latest).

```sh
# RO: backup metadata; creation exit zero alone does not meet the Ready/time gate.
az mysql flexible-server backup show --subscription 384dc69e-9e22-419f-9e3d-83fbac4f58d0 --resource-group rg-property-listify --name propertylistify-mysql --backup-name pl-geog-pre0111-20261009 --output json --only-show-errors
# RO: protected runner/inspector, after freeze/backup; same exact plan as preflight.
pnpm db:release:reference:inspect -- --adapter=places
pnpm db:release:plan -- --accepted-old-head=0096_user_founder_authority_unique.sql --expected-new-head=0111_properties_canonical_place_reference_fk.sql
```

- [ ] **RO / human gate:** require unchanged target/source/manifest/97-entry old prefix, clear attempt/foreign-lock state, exactly the approved 15 migrations and digest. Check freeze still holds and Edward remains present with adequate time. Drift or exhausted window → **R4**, no schema apply.

### 6. Apply the exact schema plan once

- [ ] **MUTATION:** switch only this ephemeral command to the approved same-target migration identity, operation **release-apply**, with the recorded actor/reference/fingerprint. The runner must prove named-lock ownership and durable attempts. Never put the migration URL on the command line or in a persistent provider variable.

```sh
# MUTATION: exact source/digest/acknowledgement; no manual SQL or alternate runner.
pnpm db:release:apply -- --accepted-old-head=0096_user_founder_authority_unique.sql --expected-new-head=0111_properties_canonical_place_reference_fk.sql --plan-digest=d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d --ack=CONFIRM_RELEASE_APPLY_b23d640cdf242812
```

- [ ] **RO:** retain exact plan/application result, lock owner, each durable statement/attempt outcome and connection cleanup. A failure, unknown statement result, foreign lock, hanging operation or window expiry during application → **R5**. Do not kill an active DDL session to fit the clock, rerun the apply, edit the ledger or claim DDL rolled back. Edward makes the attended incident/extension decision.

### 7. Verify physically and prepare the next approval

- [ ] **RO:** close the migration credential scope and return to the dedicated read-only inspector. Run these commands under the exact appropriate operation approvals (`release-reference-plan`, `release-plan`, `diagnostics`).

```sh
# RO: actual history, attempts, reference columns, metadata and enforced CHECKs.
pnpm db:release:reference:inspect -- --adapter=places
# RO: expect zero pending work through installed 0111; this is not another apply.
pnpm db:release:plan -- --accepted-old-head=0111_properties_canonical_place_reference_fk.sql --expected-new-head=0111_properties_canonical_place_reference_fk.sql
# RO: physical schema/Drizzle congruency, indexes, relationships and enforcement.
pnpm db:schema:congruency
# RO: only after schema verification; create the applicable target-specific Place plan.
pnpm db:release:reference:plan -- --adapter=places
```

- [ ] **RO:** require the complete immutable 112-entry successful history through 0111; no running/failed/blocked attempts; released migration lock with no foreign owner; zero pending schema work; congruent physical schema, canonical columns/FKs/indexes and all **39 enforced CHECKs**. Read-only inspection/plan mode does not acquire or prove release of a migration lock: verify absence of an owner independently using the canonical manifest's named-lock identity. Failure or missing permission/visibility → **R5**.

```sql
-- RO observation through the existing authorized diagnostic connection only.
-- Require NULL; neither acquire nor release someone else's lock.
SELECT IS_USED_LOCK('property_listify_manifest_migrations') AS lock_owner_connection_id;
```

- [ ] **RO / handoff:** require the new Place plan's exact target, installed 0111, manifest/registry/nine package pins, unchanged release policy and licensing exclusions, clear conflicts, pending row counts and **non-null applicable `planDigest`**. Retain its adapter/desired/held digests and batch limits. Null/conflicted/drifted/unknown result → **R6**. Return the applicable digest and schema verification evidence **to the senior through Edward** for separate reference-data approval. Do not apply data, grant permissions or deploy/reopen services.
- [ ] **RO / custody:** keep maintenance, cron and automatic-deployment/payment holds while approval is pending. Remove only the recorded temporary idle runner under the existing approved cleanup scope once no command/unknown critical operation depends on it and sanitized evidence is preserved. An active/ambiguous critical operation requires an attended decision; no cost-clock kill. Schema verification is not deployment or commercial launch acceptance.

## Stop conditions and recovery procedures

All recovery steps preserve exact identities, outcomes and evidence. Recovery does not independently authorize service reopening, application redeployment, grants, database restore or payment opening.

| Code / trigger | Stop and recovery procedure |
| --- | --- |
| **R0 — preflight:** missing attendance/window, unsafe custody, hash/source/target/history/attempt drift, preservation problem, absent global visibility, unaccounted writer, runner/egress/access/cost/edge-validation failure or unexpected deployment | Start no containment/backup/DDL. Preserve sanitized cause and leave existing services unchanged. Clean up only a recorded, idle temporary runner if safe under the existing cleanup scope. Return exact remediation/replacement-window needs to Edward/senior; no grants, firewall broadening, schema guessing or unrelated repair. |
| **R1 — maintenance/pre-SIGTERM:** ingress/cron not demonstrably effective, unintended config rollout, Inspector bind/identity/singleton failure, uncertain arm, request/scheduler timeout/failure, logging failure or incomplete launcher hold | Keep any effective ingress/cron hold. Record which observers/timers/listener/parents changed and whether each child remains alive. Do not signal/remove the application or re-arm. Fresh `state` on the same approved binding may clarify an uncertain arming result; no retry of the mutation. Keep unfinished requests/jobs alive; Edward decides an attended extension. If recovery is chosen, require fresh proof of untouched 0096 and clear attempts, then a separately approved procedure to resume the exact held parents, restore schedulers/listener or restore old artifacts and scheduling. Reopening remains a separate decision. |
| **R2 — post-SIGTERM:** API native deadline/failure, unfinished or unknown email batch/provider outcome, observer loss, missing completion marker, nonzero/unknown exit, remaining sockets/transactions or inadequate session visibility | Keep ingress/cron and launcher holds; allow a still-live target to finish. No forced kill, provider removal, lease-based completion claim, retry send, frozen backup or DDL. Re-establish only read-only observation on the exact identity; a missing/recycled process or unsalvageable completion evidence remains unknown. Edward decides extension/recovery. If either process was forced/nonzero, preserve it as a failed drain and return a reviewed recovery plan before proceeding. |
| **R3 — removal/no-writer:** unknown provider removal, replacement/restarted writer, pending deployment, renewed lead work or failed six-minute observation | Keep maintenance/cron. Record exact original/replacement IDs, socket/session state and provider operation. Invalidate the freeze; no backup or DDL. Do not repeatedly remove new artifacts or patch restart settings. Edward/senior review exact recovery; any additional containment method needs its reviewed scope. |
| **R4 — backup/pre-apply:** identifier already exists, backup failure/unknown/overrun, non-FULL/non-Ready/pre-freeze backup, source/target/plan drift or insufficient attended time | Remain contained. Preserve/query the existing backup outcome without another create, rename, delete or overwrite. Re-plan read-only if needed; a changed digest/head requires new review. No DDL. If 0096 is physically intact and attempts clear, restoring recorded old artifacts/cron/ingress is a separate Edward recovery/reopening decision. Otherwise use R5. |
| **R5 — schema/apply/verification:** failed/partial/unknown DDL, incomplete attempt/foreign lock, missing physical objects/enforcement, noncongruency, unexpected head/pending work, credential/permission gap or window ending with an active operation | Keep maintenance and stopped workers. Preserve durable lock/session/statement/attempt state; switch to the authorized read-only observer when safe. Never kill/retry/rewrite an ambiguous migration, run manual down SQL, edit its ledger or restart the old 0096 runtime after any schema transition. Return a named forward-recovery plan for exact approval. Provider/database recovery uses a separately approved **South Africa North** PITR/new-server target, registered and verified before connection; no overwrite or binding change under this approval. Use the prepared 49a48572 compatible source only after schema/data verification and separate deployment approval. |
| **R6 — reference/next-stage:** null/non-applicable/conflicted/changed data digest, uncleared licensing/privileges/approval, expired attendance or production artifact/build/readiness failure at a later separately approved stage | Preserve installed 0111 and all holds. Return the exact applicable plan or refusal evidence to Edward/senior. Do not apply the old null digest, grant access, widen the licensed release, deploy, resume cron/ingress or open payments. After separately approved data/deployment, any failure follows schema-compatible forward recovery; green CI is not deployment readiness. |

## Next-stage plans are prepared, with precise limits

**Compatible application release:** the [existing manifest](../geography-attended-execution-2026-10-09/compatible-deployment.json) and locally verified source archive pin **49a48572**, schema 0111, the protected Place policy, exact Railway/Vercel IDs, API/email/lead configuration/start commands, production frontend stamps/origins and preserved automatic deployment holds. This is ready for the **next deployment review**, conditional on approved/verified schema and Place data. Production provider builds/deployment IDs do not exist yet. The existing CI ZIP's frontend is stamped `development` and a PR synthetic SHA; it is evidence and cannot be deployed/relabelled as the production artifact. No deployment command is part of this checklist.

**Reference data:** the [existing protected plan](../geography-protected-release-plans-2026-10-09/protected-reference-plan.json) pins adapter digest `d8d2725fd93a6c4d2de9fb95b59c07e4dbe826f53f8faaf449b3e579ade9943a`, registry digest `c822d778985ad13c43b5d4d1b2d4c0664b08daca766f82f302b6b3dfe24ea433`, nine territory/package pins, desired digest `3c8f2e80908b8d6d7d565e83f7c1cafe6b10fea7a53fc757ec01650b02be2728`, **16,944 Places** and **720 OSM-only Places/dependants excluded**. Input/sequence preparation is ready. Its current `planDigest=null` and `readyForDataRelease=false` are deliberate pre-schema results: **there is no applicable reference-application digest ready for approval yet**. Stage 7 generates it after physical 0111 verification; that new exact digest receives separate approval before any data write.

After separately approved data application/verification and compatible deployment, run the established actual-release checks once and then the affected customer sequence: canonical North Riding private server draft save/reload → three prepared confirmed image uploads → reload and verify ordering/details → dependent Developer checks preserving IKaya's organisation/pending review → genuine customer-entry discovery, detail and enquiry using eligible public inventory. Do not reopen founder-login/logout/registration corrections without regression evidence. Payments remain closed until separate commercial launch acceptance.

This is an execution handoff and local artifact verification, **not a management closure report or production outcome claim**. Edward forwards it to the senior. Production commands/configuration changes, unchanged tests and management submissions were not performed during preparation.
