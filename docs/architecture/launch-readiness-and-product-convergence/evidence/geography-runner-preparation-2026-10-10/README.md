# Replacement geography runner — preparation for senior review

Prepared locally from senior checkpoint **ca0303a758aa43a906237b0f875326f86ae20fd7**,
preserving observer implementation **2b7ecaae6c68426615ece4a1742b183d53b94179**.
This packet replaces the runner/preflight/timing instructions in the
[October 10 handoff](../geography-execution-handoff-2026-10-10/README.md).
Its reviewed containment mechanics and R0–R6 recovery boundaries remain in force.
The [senior recovery checkpoint](../geography-senior-execution-2026-10-09/RECOVERY-CHECKPOINT.md)
supersedes historical window wording. **No maintenance window is activated here.**
The senior retains production execution; Edward forwards this patch to the senior.
B12 acceptance is unchanged.

## Immutable release bindings

| Binding                             | Required value                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| Schema/application source           | `49a48572c24d1b122fcf17b025a76e5ab77f03a8`                                               |
| Production database fingerprint     | `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`                       |
| Schema plan digest                  | `d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d`                       |
| Manifest digest                     | `600ccfc5ae5ddc480fe0274edc8a5e3624c2bab32aa3da65f314acd3803cef3c`                       |
| Last verified head / planned head   | 0096 / 0111; 15 migrations                                                               |
| Containment source                  | `87a16b324dabd095f6659f88d53a3676623d8b7b`                                               |
| Corrected drain client SHA-256      | `e483eed8b9c14100850177aaefedef60812e7b0ecc414752131e9c3cfd9bba62`                       |
| Railway project / environment       | `8cdd7515-ddd2-4252-bbee-df5a5c209d4b` / `63070d99-357a-40ba-99c3-6d1368f61652`          |
| Azure subscription / group / server | `384dc69e-9e22-419f-9e3d-83fbac4f58d0` / `rg-property-listify` / `propertylistify-mysql` |

The planned Place release remains **16,944 Places**, excluding **720 OSM-only
Places and their dependent exclusions**. Registry, nine territory/package pins
and licensing policy remain unchanged. The old reference plan's null digest
cannot authorize application. Generate an applicable digest only after verified
schema installation; reference application is a separate stage.

## What the readbacks establish

[Read-only evidence](read-only-provider-evidence.json) records Azure's actual four
singleton rules: `208.77.246.240`, `.241`, `.242` and `192.143.7.18`.
The API currently has the first three as HA static outbound addresses.
The project still lists the four original services. No replacement exists.
These are observations at the recorded UTC time, not release-time evidence.

The deleted runner's HTTPS address `34.21.135.52` and incomplete MySQL TCP flows
strongly support an access mismatch. They do not prove the MySQL NAT source or
a server-side firewall rejection. The blocker remains unproved until the new
runner passes the following connectivity gates.

[Railway's static-IP documentation](https://docs.railway.com/networking/static-outbound-ips)
requires a deployment after assignment changes; region changes alter assignment.
Configure and read back static networking **before the first deployment**.
Inspect all assigned addresses; a single HTTPS lookup cannot exercise every HA
address or certify the MySQL route.

## Lifecycle contract — establish before creation

- [ ] **LOCAL / senior review:** obtain a new attended window and exact operational
      authority. Record absolute UTC start/end, approval reference, cleanup owner
      (senior production operator) and a distinct acknowledged recovery custodian.
      The custodian must have authorized provider access and receive the record
      through Edward's attended handoff; this preparation sends no external message.
      If nobody can retain cleanup duty through operator/session interruption, do
      not create the runner.
- [ ] **LOCAL:** copy [lifecycle-record.example.json](lifecycle-record.example.json)
      to private operator custody outside Git. Before creation, fix `expiresAt` to
      the earlier of window end or planned creation + two hours. Immediately record
      actual provider creation time and confirm expiry is still within two hours.
      Never reset the lifetime on deployment, reconnection or conversation restart.
      Keep source hashes, service/deployment/instance IDs and current operation state
      in both operator and custodian custody. Null fields deliberately fail closed.
- [ ] **LOCAL / attended control:** custodian sets an absolute expiry alarm outside
      the operator's session and checks status at least once per minute. Test the
      alarm/acknowledgement before provisioning. This is an attended cleanup control,
      not an automatic deletion job. No provider token goes on the runner. Reserve
      five minutes before expiry for removal/readback. USD 1 incremental cost remains
      a monitored ceiling, not a guaranteed billing cap; inability to verify it stops
      admission. A cost alarm cannot kill active DDL.
- [ ] **LOCAL:** before containment run `lifecycle containment`; require at least
      **105 minutes** remaining (25 drain/no-restart, 15 backup, 15 apply, 15 verify,
      30 recovery, 5 cleanup). Immediately before apply run `lifecycle schema`;
      require **65 minutes** (15 apply, 15 verify, 30 recovery, 5 cleanup). These are
      conservative preparation gates, not duration guarantees. If the senior's
      refreshed estimate is larger, record it in `budgetsMinutes.schema` and/or
      `budgetsMinutes.containment` before running the gate. Both inputs are required
      safe whole-minute numbers, at least 65 and 105 respectively; missing,
      fractional, nonnumeric or reduced budgets refuse admission. The effective
      containment budget is the greater of its input and the schema budget plus
      40 minutes for preceding work. Larger estimates are therefore enforced.
      Insufficient time refuses new execution; it never cancels work already running.
- [ ] **LOCAL:** record `active` and custodian acknowledgement **before** issuing
      apply, with source/digest/command correlation and protected shell binding.
      Keep active until terminal command outcome, closed migration connection,
      durable attempts and lock/session absence are independently established.
      Interruption or lost evidence becomes `unknown`, even if SSH/process exited.
      A timer never changes active/unknown to idle. No timer signals, service
      deletion, restart, credential revocation or child timeout may interrupt DDL.

The local gate reads records only. It grants no production authority, verifies
no human attendance itself, and neither launches nor wraps a migration.
Records must be refreshed immediately before each use; stale state is unknown.
Every lifecycle admission, including cleanup, requires `lastEvidenceAt` no more
than **60 seconds** old, no earlier than creation and no later than the current
clock. `lastEvidenceBinding` must match the record's exact project, environment,
service, deployment, instance and operation state; deployment and instance IDs
must be valid, nonempty UUIDs. Missing, malformed, future, stale or mismatched
evidence returns `eligible:false`, `operationState:"unknown"` and
**unknown—inspect first**. Refresh these fields together from the governed
provider/process/session/attempt/lock observations; changing a timestamp alone
cannot establish fresh evidence. The offline gate validates the supplied
record's age and binding, not the authenticity or completeness of observations.

## Executable checklist

**LOCAL** = local files; **RO** = provider/database read; **MUTATION** = senior-only
future execution after refreshed authority. Nothing below was executed against
a replacement runner during preparation. Run one step at a time and preserve
sanitized evidence. A changed provider interface or unknown outcome stops.

### 1. Local source and read-only provider preflight

- [ ] **LOCAL:** verify this packet's `sha256sum -c SHA256SUMS` and original
      packet checksums, corrected client, immutable source and observer archive.
      Use the senior's existing minimal upload inventory
      [runner-minimal-inventory.json](../geography-senior-execution-2026-10-09/runner-minimal-inventory.json)
      (1,792 files). Full archive previously exceeded the upload limit. Validate
      each selected file against its pinned digest; application/schema/reference
      files remain byte-identical to 49a48572. Omit only the deployment metadata
      recorded in
      [runner-envelope-adjustment.json](../geography-senior-execution-2026-10-09/runner-envelope-adjustment.json)
      from the owned upload copy: `railway.json`, `railway.email-worker.json`,
      `railway.lead-job.json`, `release-runner.railway.json`.
      Do not change the repository or immutable original archive to do this.
- [ ] **LOCAL:** preserve the separately bound session-observer operator bundle
      from 2b7ecaae6, archive digest
      `0fafc7fe15d9e871ec37171f8bcbb2c660a1407a6b069ada4da5d7bf5de519db`,
      [observer inventory](../geography-senior-execution-2026-10-09/observer-source-inventory.json).
      Keep it in a separate private directory; schema commands use the immutable
      schema directory. No overlay becomes an application deployment source.
- [ ] **RO:** refresh original deployments, instances, triggers, pending changes,
      ancestry, backup/retention/recovery state and all writer ownership as in handoff
      preflight. Preserve Redis/storage. Inspect provider interfaces and explicit
      scope before any future mutation. Live GraphQL metadata currently describes
      non-fork propagation for service creation/update, while MCP advertises an
      environment-specific operation. **Resolve that scope discrepancy before
      creation; do not experiment by creating into all environments.** Record a
      production-only reviewed payload/action. Provider guarantees must cover
      Testing and Staging too; readback after mutation is not advance permission.
- [ ] **RO:** capture actual Azure rules, never reuse this packet as a fresh
      allowlist:

```sh
az mysql flexible-server firewall-rule list --subscription 384dc69e-9e22-419f-9e3d-83fbac4f58d0 --resource-group rg-property-listify --name propertylistify-mysql --output json --only-show-errors > azure-rules.json
```

### 2. Replacement setup — future mutations; no application startup

- [ ] **MUTATION:** after scope resolution, `create_service` with
      `projectId`/`environmentId` above, a unique recorded name,
      `staged:false`, **no image/repo/source/variables**. Record returned service ID
      and actual creation time immediately; give them to the custodian. Never use
      deleted service `3160d05c-44f0-4d5f-af9c-7bfe5f5ce37e`.
- [ ] **MUTATION:** `update_service` with explicit project/environment/new service,
      `staged:false`, `builder:"RAILPACK"`,
      `buildCommand:"pnpm install --frozen-lockfile"`,
      `startCommand:"node -e 'setInterval(() => {}, 60000)'"`,
      `preDeployCommand:[]`, `cronSchedule:null`, `restartPolicyType:"NEVER"`,
      `regions:{"asia-southeast1-eqsg3a":{"numReplicas":1}}`,
      `limits:{"vCPUs":1,"memoryGB":1}`, `ipv6EgressEnabled:false`.
      [runner-service-settings.json](runner-service-settings.json) is a review
      specification, **not Railway Config as Code or an apply payload**.
      Preserve the reviewed provider 1 CPU/1 memory limit. Require no config-file
      path, application healthcheck, Git/image trigger, public domain/TCP proxy,
      volume, application secrets or persistent DB credentials, including inherited
      shared-variable credentials. Inspect variable names without exposing values.
      Do not migrate any production service to IaC or repeat Config as Code setup.
- [ ] **MUTATION then RO:** enable static outbound networking and read assignment
      **before uploading/deploying**. Commands are scoped without linking defaults:

```sh
# MUTATION — senior only, new service ID from provider response.
railway outbound-network static-ip enable --project 8cdd7515-ddd2-4252-bbee-df5a5c209d4b --environment 63070d99-357a-40ba-99c3-6d1368f61652 --service "$RUNNER_SERVICE_ID" --json
# RO — retain every address and region/zone.
railway outbound-network static-ip status --project 8cdd7515-ddd2-4252-bbee-df5a5c209d4b --environment 63070d99-357a-40ba-99c3-6d1368f61652 --service "$RUNNER_SERVICE_ID" --json > runner-outbound.json
# LOCAL — exits nonzero on drift/missing IP; no credentials or network calls.
node "$PACKET/runner-gates.cjs" network "$RUNNER_SERVICE_ID" runner-outbound.json azure-rules.json
```

- [ ] **RO:** read back applied settings, region, limits, absent deployment,
      domains/proxies/volumes/triggers/credential names, and unchanged original
      artifacts. All assigned IPs must be covered by the actual unchanged rules.
      Any missing IP → **R0**, no deployment/credential transfer/containment.
      Return exactly each proposed singleton start=end address for senior network
      review. No firewall amendment is authorized here; never unrestricted or
      all-Azure access. Azure rule drift also stops even if it would allow access.
- [ ] **MUTATION:** upload only the verified private minimal bundle:

```sh
railway up --project 8cdd7515-ddd2-4252-bbee-df5a5c209d4b --environment 63070d99-357a-40ba-99c3-6d1368f61652 --service "$RUNNER_SERVICE_ID" --detach "$RUNNER_BUNDLE" --path-as-root
```

- [ ] **RO:** follow that exact deployment to terminal **SUCCESS**, record instance
      ID and verify idle argv/source/install hashes/effective limits. Upload exit
      zero is insufficient. Read assignment again; compare to pre-deploy readback.
      No application startup/automatic DB command is permitted.

### 3. Effective networking and governed connectivity — before containment

- [ ] **RO:** use explicit project/environment/service/instance SSH targeting.
      Verify runtime Railway IDs, region, assignment enabled before this deployment,
      DNS and IPv4 route to Azure. From this exact instance, a bounded
      `curl --ipv4 --fail --silent --show-error --max-time 10 https://api.ipify.org`
      must return one of its assigned/allowed IPs. Capture network-flow metadata for
      the ensuing DB preflight without credentials/query text. HTTPS corroborates
      effective deployment networking; it does not prove the MySQL NAT source.
- [ ] **RO:** supply SELECT-only inspector credentials via the existing hidden
      process-input channel, never argv/history/files/provider variables/logs.
      Require production context, exact fingerprint, TLS certificate and identity
      verification, operation approval actor/reference and `read-only` class.
      Do not weaken TLS or create a new connection path. In the immutable schema
      directory, run:

```sh
pnpm db:authority:status
pnpm db:release:reference:inspect -- --adapter=places
pnpm db:release:plan -- --accepted-old-head=0096_user_founder_authority_unique.sql --expected-new-head=0111_properties_canonical_place_reference_fk.sql
```

- [ ] **RO:** require exact target, immutable 97-entry prefix through 0096,
      no incomplete attempts/foreign lock, exactly 15 migrations and approved digest.
      In the separate verified observer directory, use the existing admin identity
      as `bootstrap-admin`, approved **only** for `release-session-inspect`:
      `pnpm db:release:sessions:inspect`. The senior
      [observer contract](../geography-senior-execution-2026-10-09/SESSION-OBSERVER-REVIEW.md)
      permits four fixed metadata queries, no parameters/execute/grants/kills.
      Require PROCESS visibility, observer own connection ID and every account
      accounted for. The API's earlier success cannot satisfy this runner gate.
      Close each ephemeral credential scope after use.
- [ ] **LOCAL / RO:** inspector **and** observer must succeed from the exact
      replacement instance. Any DNS/TCP/TLS/target/permission/visibility failure
      → **R0**; preserve sanitized cause, clean up idle runner, leave application
      services unchanged. Network assignment alone cannot pass this gate.
      Record current attendance and run the containment time gate:
      `node "$PACKET/runner-gates.cjs" lifecycle containment "$LIFECYCLE_RECORD"`.

### 4. Containment → sessions/no restart → frozen backup

- [ ] **MUTATION / RO:** execute handoff stages 2–3 with corrected client and fresh
      identities: contain both API origins, disable lead cron with narrow
      skip-deploy patch, let active lead finish, inspect exact live singletons,
      arm once, finish API requests/schedulers, hold only verified intermediate
      launchers, then SIGTERM exact application children. Require real original
      pool completion, terminal work, zero child exit and no descriptors/DB sockets.
      Do not force-kill, re-arm after ambiguity or remove an active worker.
      Every original R1/R2 stop remains mandatory.
- [ ] **RO / MUTATION / RO:** observer from runner proves no app/worker sessions
      (including sleeping) or writer transactions; account for authorized reads.
      Only then remove the exact original deployments, preserving services/config.
      Require provider REMOVED/zero replicas, no pending/replacement deployment,
      and **six continuous minutes** of no restart/session/writer activity.
      New activity invalidates freeze → **R3**. Record freeze timestamp afterward.
- [ ] **MUTATION / RO:** handoff stage 5 creates
      `pl-geog-pre0111-20261009` once, only if absent. Require exact Azure FULL backup
      Ready with completion after freeze and before DDL. Backup unknown/overrun
      → **R4**, query existing outcome; never retry create/rename/overwrite.
      Refresh immutable-source inspector and schema plan. Any drift stops.

### 5. Schema once → physical verification → separate reference plan

- [ ] **LOCAL / RO:** require all holds remain effective, fresh observer state,
      exact source/head/digest/fingerprint and operation-specific approval.
      Run `node "$PACKET/runner-gates.cjs" lifecycle schema "$LIFECYCLE_RECORD"`.
      Nonzero → **R4**, no DDL. Set active/acknowledge with custodian before apply.
- [ ] **MUTATION:** in immutable source, hidden ephemeral distinct same-target
      migration credential, exact approved `release-apply` operation/TLS context:

```sh
pnpm db:release:apply -- --accepted-old-head=0096_user_founder_authority_unique.sql --expected-new-head=0111_properties_canonical_place_reference_fk.sql --plan-digest=d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d --ack=CONFIRM_RELEASE_APPLY_b23d640cdf242812
```

- [ ] **RO:** retain lock owner/attempt IDs/statement outcomes. Failed, partial,
      active, expired-window or unknown result → **R5**, never kill/retry/edit ledger.
      Close migration scope when outcome known; use approved inspector/observer:

```sh
pnpm db:release:reference:inspect -- --adapter=places
pnpm db:release:plan -- --accepted-old-head=0111_properties_canonical_place_reference_fk.sql --expected-new-head=0111_properties_canonical_place_reference_fk.sql
pnpm db:schema:congruency
# Only AFTER successful physical schema verification:
pnpm db:release:reference:plan -- --adapter=places
```

- [ ] **RO:** require immutable 112-entry success history, no incomplete attempts,
      zero pending, congruent physical columns/FKs/indexes, all **39 enforced CHECKs**,
      closed migration connection and independently absent manifest lock owner.
      Use the handoff's authorized read-only
      `IS_USED_LOCK('property_listify_manifest_migrations')` diagnostic; require
      NULL. Plan alone does not certify lock release. Observer allowlist cannot be
      expanded for this query; use the existing authorized diagnostic path.
- [ ] **RO:** only then retain applicable non-null Place `planDigest`, target/head,
      counts, exclusions, registry/pins/licensing/conflict/batch evidence for separate
      senior review through Edward. Invalid/null/conflicted plan → **R6**.
      Keep reference writes, application deployment, reopening, cron resumption and
      payments held. No old runtime restart after any schema transition.

## Interruption recovery and verified removal

| State / trigger                                           | Required recovery                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Preflight failure or time refusal (R0)                    | No containment/backup/DDL. Preserve evidence. If provably idle, remove exact runner and verify provider removal. Existing services stay unchanged.                                                                                                                                                                                                                 |
| Containment/drain/no-restart failure (R1–R3)              | Retain effective holds, allow live work to finish, restore read-only observation on exact identities. No re-arm/forced kill/backup/DDL. Follow handoff's exact R1–R3 senior recovery; reopening needs separate authority.                                                                                                                                          |
| Backup/pre-apply failure (R4)                             | Remain contained; query backup outcome, preserve it. No DDL. Old-artifact recovery only after untouched 0096/clear attempts are proven and separately approved.                                                                                                                                                                                                    |
| Active/unknown migration, timer expiry, interruption (R5) | Custodian assumes observation duty immediately. Keep runner and all holds. Preserve lock/session/attempt/statement evidence; no delete/redeploy/kill/retry. Continue attended incident observation beyond expiry if needed; record actual lifetime/cost deviation. Named forward recovery or South Africa North PITR/new target needs separate reviewed authority. |
| Installed schema / invalid reference plan (R6)            | Preserve 0111, evidence and holds; return exact refusal/applicable digest. No data writes/deployment/reopening/payment continuation.                                                                                                                                                                                                                               |

On any interruption the custodian starts with provider readback of exact
service/deployment/instance plus process state and governed observer/attempt/lock
evidence. Treat a stale/missing record as unknown. No process, SSH or conversation
exit proves migration completion. Read-only preflight commands must also finish
and close before deletion; expiry blocks new commands.

When active/unknown operation state is resolved, export sanitized evidence,
close protected shells, remove transient observer source, and mark complete or
idle with evidence references. Run
`node "$PACKET/runner-gates.cjs" lifecycle cleanup "$LIFECYCLE_RECORD"`.
Its success is only a candidate for attended cleanup. Recheck no active command,
migration session/lock or unresolved critical attempt before deletion.

**MUTATION:** senior/custodian calls `delete_service` with exact project,
production environment and recorded runner service ID, `staged:false`.
Require no attached volume, no original-service identity and no unknown outcome.
**RO:** `describe_environment`/`environment_status` for explicit project and
environment must show runner absent, no pending deletion/deployment and no
remaining runner replica; `list_services` must confirm its project removal.
If a service shell remains elsewhere, stop for scope review. Preserve original
services and their expected stage-specific deployments/configuration; before
containment they must match the baseline, afterward intentional removals/holds
must match the execution record. Record removal time and actual lifetime/cost.
Process exit or API delete response alone is insufficient. If readback fails,
ownership stays with the custodian until removal is proven; do not create another
runner or report cleanup complete.

## Review limits

No provider mutation, production DB connection, schema/reference write, process
signal, deployment, push/merge or payment action occurred in this preparation.
Only authorized provider metadata was read. No management folder was written.
The runner assignment, effective route, MySQL/TLS inspector and independent
session visibility remain future evidence. Production-only creation/update
semantics need resolution before provisioning. A fresh window, acknowledged
custodian, resource/cost readback and live bindings remain required. No firewall
or privilege scope change is proposed now; if assignment differs, the local
gate returns exact singleton addresses for senior review.
