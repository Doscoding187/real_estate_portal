# Retained Azure 0094 → MySQL 8.4 execution packet

**Prepared 2026-09-29. REVIEW READY — NOT EXECUTION APPROVAL.**

This is the concrete next gate after the successful disposable rehearsal. The
principal's instruction to proceed with preparation does not supersede the
standing prohibition on mutating the retained target before upgrade approval.
No backup creation, restore, resize, upgrade, SQL write or deployment was performed
while preparing this packet. TiDB remains production authority.

## 1. Exact authority and target

| Binding | Required value |
|---|---|
| Evidence/code baseline | `8b2217ea33fb60894f294737af8f7b31730bbc13` |
| Reconciled schema lineage | `a5fa6256f3579b16223586fa579f4ecd28c59ad6` |
| Rehearsal runtime proof | `b25da60534a812ba1e7a7b4a7d0ab3ec38aa28bf` |
| Tenant | `33bbbbdd-9394-49dc-b9a0-dc07caeebbaf` |
| Subscription | `384dc69e-9e22-419f-9e3d-83fbac4f58d0` |
| Resource group | `rg-property-listify` |
| Server | `propertylistify-mysql` |
| Database | `propertylistify_database` |
| FQDN | `propertylistify-mysql.mysql.database.azure.com` |
| Region | South Africa North |
| Protected fingerprint | `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced` |
| Exact migration head | `0094_content_topics_primary_key.sql` / 95 migrations |
| Model digest | `a8ca8cf34bb3627594eab1b722b85115c6460225a0165db7992228a8547798e9` |
| Manifest digest | `93d871e6f8760477f460b8821685d71d212374eb86ddd53bc6e2ccfc30608efc` |

Resource ID:
`/subscriptions/384dc69e-9e22-419f-9e3d-83fbac4f58d0/resourceGroups/rg-property-listify/providers/Microsoft.DBforMySQL/flexibleServers/propertylistify-mysql`.

Fresh read-only ARM inspection during preparation: Ready, fullVersion8.0.46,
Standard_B1ms/Burstable,20GiB storage/360IOPS, accelerated logs disabled,
replicationRole None,14-day backup retention/24-hour interval, geo backup disabled.
Earliest restore date reported2026-09-16T14:38:39.587662Z. This is not a new SQL
version/schema proof or proof of a future backup's restorability.


Read-only backup inventory contains13 completed entries; latest listed full
backup `daily-20260928t140847-b1759c5b-c96f-4cc8-85fc-8d66ab21425f` completed `2026-09-28T14:08:50.702691+00:00`.
This existing backup is evidence of the inventory only; a fresh approved backup
and recovery-validation copy are still required by this packet.

Bind execution to the reviewed packet commit (record its full SHA at approval).
Do not silently substitute main, a newer candidate, or an older0090 checkout.
Rehearsal write authorization is **revoked** and is not used for this target.

## 2. What rehearsal proved and what it did not

[Rehearsal evidence](azure84-rehearsal-corridor-2026-09-28.md) proves the restored
0094 database survived the supported upgrade to8.4.9-azure, unchanged schema,
checksums/reference rows, bounded physical behavior/application-helper tests,
synthetic cleanup, and return to B1ms. It does not authorize retained writes,
prove production capacity, or replace full application/cutover readiness.

Observed upgrade TCP interruption:82–102seconds; Ready observed within169seconds
of accepted request. Compute transitions caused additional interruption. Reserve
an **operator-attended60-minute window**, with a30-minute escalation threshold per
provider operation; these are planning bounds, not an Azure completion guarantee.
If Azure is still progressing at the threshold, inspect/escalate; do not cancel,
retry, delete or launch an overlapping operation blindly.

The native CLI upgrade command was rejected because it serialized `version` at
the wrong level. Use the documented ARM `properties.version` shape below. The
original malformed request is not a reason to retry an ambiguous actual upgrade.

Oracle checker emitted13 errors for Azure system-default configuration,10 warnings
and3 notices; full disposition is in rehearsal evidence. Refresh the checker on
the retained server. Carry forward only individually matched provider-default
findings, not a blanket error waiver. New schema/authentication/TLS/parameter
findings stop execution until explained. No parameter changes are in this packet.

## 3. Approval boundary

Principal execution approval must name this packet SHA, exact retained resource,
the attended window/operator, temporary D2ds_v4 cost, final B1ms tier, fresh backup
and restore-proof resources/cost, and irreversible engine upgrade to major8.4.
It may authorize the following provider-only sequence:

1. Fresh on-demand retained-server backup; inspect successful completion.
2. Restore that backup point to a **new** recovery-validation server; read-only
   source equivalence and8.0 recovery proof; preserve both source and restored copy.
3. Retained B1ms→D2ds_v4, upgrade to8.4, readonly revalidation, return to B1ms.

No production DATABASE_URL/traffic change, migration, schema DDL, seed/reference
correction, runtime deployment, broad firewall rule, server parameter alteration,
retained synthetic write, or deletion is included. Failure recovery is a restore
to another server, not an in-place downgrade or automatic endpoint substitution.

**No execution until that approval is recorded.** Approved rehearsal engineering
work and an engine-compatibility PASS are not retained-target mutation authority.

## 4. Pre-execution read-only stop/go evidence

Re-resolve existing Azure credentials without broadening them; verify tenant,
subscription/resource identity, Ready8.0, original compute/storage and replica
state. Inventory existing firewall rules; no retained networking changes planned.
Use existing Railway allowlisted path for SQL if local connectivity is unavailable.
Never move Azure management credentials into the production backend.

Use canonical connectionAuthority protected read-only/verification/release-plan
operations and read-only credential. Bind actor/reference/fingerprint using existing
DATABASE_AUTHORITY_APPROVAL_* inputs only inside the protected operator process.
Do not print, persist or replace the production URL. Load the inspector URL through
the existing protected credential mechanism; no raw connection bypass or production
pool fallback. The repository's classification `production` protects this Azure
candidate and does not make it the live application authority.

For the bound protected inspector process, existing entrypoints include
`pnpm db:release:plan -- --accepted-old-head=0094_content_topics_primary_key.sql --expected-new-head=0094_content_topics_primary_key.sql`
and `pnpm db:schema:congruency -- --credential=read-only`. The plan must show zero
pending work; never change either command to apply. Set approval inputs per
operation and verify the emitted fingerprint before accepting the result. Additional
server metadata reads use the same canonical read-only connection authority.

Required checks immediately before provider writes:

- 95 successful identities/checksums, manifest chain/head0094, no pending migrations,
  no failed/running/blocked attempts; schema digest and all expected objects match.
- 216 tables,23 enforced CHECKs,463 FKs,143 JSON columns; explicit onboarding and
  content_topics PKs; approved case mapping and no hidden unknown objects.
- Snapshot complete plans/entitlements and authoritative row counts; retain bounded
  business-table inventory. New/unexplained data or drift stops the gate.
- Verified FQDN/TLS certificate+hostname/auth/database/SELECT1; capture timezone,
  SQL modes, charset/collation, isolation, GIPK/requirePK, InnoDB/packet limits.
- Oracle checker, no prepared XA, no active transactions/writers; do not automatically
  roll back another session or terminate it. Protected admin read is separate from
  inspector privileges if XA/PROCESS metadata requires it.
- No replica awaiting upgrade, no concurrent maintenance/restore/resize/upgrade;
  regional SKU offering/capacity and backup health checked.
- Fresh production TiDB host/database and credential-safe URL hash captured;
  no command in this gate changes it.

The known tax_treatment source conflict must remain identical and separately OPEN.
It is not authorization to normalize metadata or weaken the commercial verifier.

## 5. Fresh backup and recovery proof — after approval only

The existing rehearsal demonstrates restoration worked for its earlier point.
For the retained upgrade, establish a fresh recovery anchor, not a guessed timestamp.
All shell snippets below are proposed operator commands, **not executed here**.

```bash
PL_SUB='384dc69e-9e22-419f-9e3d-83fbac4f58d0'
PL_RG='rg-property-listify'
PL_SERVER='propertylistify-mysql'
PL_ID="/subscriptions/$PL_SUB/resourceGroups/$PL_RG/providers/Microsoft.DBforMySQL/flexibleServers/$PL_SERVER"
PL_BACKUP="pl-pre84-$(date -u +%Y%m%dT%H%M%SZ)"
az mysql flexible-server backup create --subscription "$PL_SUB" \
  --resource-group "$PL_RG" --name "$PL_SERVER" --backup-name "$PL_BACKUP"
az mysql flexible-server backup show --subscription "$PL_SUB" \
  --resource-group "$PL_RG" --name "$PL_SERVER" --backup-name "$PL_BACKUP"
```

Record backup resource ID/type/status/start/completion and verified restorable time.
Set PL_RESTORE_POINT to that exact pre-upgrade UTC point after checking provider
availability; do not default to 'now'. Record an explicit recovery review/deletion
boundary before the14-day retention window ends; do not assume backup retention
is extended by merely recording a name. Verify actual backup expiration semantics.

Choose and check a fresh globally unique recovery name, e.g.
`pl-pre84-recovery-<UTC-date>-<unique-suffix>`; bind it in the approval evidence.
Never reuse the rehearsal name or overwrite an existing server.

```bash
# PL_RECOVERY and PL_RESTORE_POINT must come from the approved evidence record.
az mysql flexible-server restore --subscription "$PL_SUB" \
  --resource-group "$PL_RG" --name "$PL_RECOVERY" \
  --source-server "$PL_ID" --restore-time "$PL_RESTORE_POINT" \
  --faster-restore Disabled
```

Faster restore remains disabled because enabling it may also modify source IOPS.
Prove recovery server Ready8.0, exact source/time lineage, head/checksums/schema and
reference equivalence. Inspect inherited firewall; if absent, only individually
approved Railway IP rules on the recovery copy may be used. No broad service rule.
Record restore duration, new FQDN, and cost. No synthetic writes are needed.
Keep the recovered8.0 server intact through retained8.4 acceptance. Stop if fresh
backup or recovery proof fails; no retained major upgrade in that condition.

## 6. Retained compute and engine operations — after all gates pass

```bash
az mysql flexible-server update --subscription "$PL_SUB" \
  --resource-group "$PL_RG" --name "$PL_SERVER" \
  --tier GeneralPurpose --sku-name Standard_D2ds_v4
az mysql flexible-server show --subscription "$PL_SUB" \
  --resource-group "$PL_RG" --name "$PL_SERVER"
```

Require terminal success/Ready and correct SKU before proceeding. Capture provider
operation/correlation and warnings. If this SKU lacks capacity, review another
smallest supported2vCore GP SKU; no blind resize retry or unrelated storage change.
Refresh no-XA/no-active-writer checks after compute recovery.

```bash
# Single property, supported API; no credential-bearing arguments.
az rest --method patch --subscription "$PL_SUB" \
  --url "https://management.azure.com${PL_ID}?api-version=2024-12-30" \
  --body '{"properties":{"version":"8.4"}}'
```

Capture request start, provider operation/correlation and sanitized LRO status
headers when available. Poll the returned operation URL using existing ARM auth;
validate it is an Azure management URL in the approved subscription. Also poll
exact server state and monitor verified connection availability. Do not mistake
HTTP202 for completion. Capture Ready, SQL8.4 exact build, endpoint and activity
result. Activity delivery can lag; label missing log evidence accurately rather
than inventing Succeeded. Stop/escalate on failed/ambiguous state, no automatic retry.
Azure chooses the8.4 patch; do not force the rehearsal's8.4.9 build.

## 7. Retained post-upgrade matrix — READ ONLY

| Check | Acceptance |
|---|---|
| ARM identity / engine | Exact resource Ready; SQL8.4.x-azure, recorded patch; unchanged FQDN |
| Railway path | DNS/TCP, strict CA+hostname TLS, auth, selected database, SELECT1 |
| Migration authority |95 identical checksums/identities, head0094, no new/incomplete attempts |
| Physical schema | Canonical digest equal;216 tables,23 enforced CHECKs,463 FKs,143 JSON columns; zero unexplained differences |
| Keys/indexes/defaults | All canonical metadata unchanged, including email and two explicit PK corrections |
| Provider casing | lower_case_table_names1; canonical propertyImages mapping only, unknown objects visible |
| Sessions | UTC, isolation, SQL modes, charset/collation; every changed limit investigated |
| JSON/CTE/windows/time | Harmless representative SELECT expressions and joins; timestamp(6) metadata/expression precision |
| GIPK | Global/session observation only; no fresh establishment/migration or variable alteration |
| Reference/business data | Exact pre-upgrade snapshots and authoritative counts preserved; no new unexpected rows |
| Production | TiDB fingerprint/database unchanged, no deployment or traffic change |

Constraint rejection, concurrent writes, rollback/savepoint/write-lock probes,
fixtures and cleanup DELETEs are **not rerun on this retained target**. Their live
engine evidence is linked from the disposable rehearsal; no mocks substitute for
it. A materially different engine build/behavior requiring new write evidence
requires another explicitly authorized disposable corridor, not retained writes.

Only after successful read-only acceptance, return to the original cost state:

```bash
az mysql flexible-server update --subscription "$PL_SUB" \
  --resource-group "$PL_RG" --name "$PL_SERVER" \
  --tier Burstable --sku-name Standard_B1ms
```

Prove Ready/SQL8.4/TLS and unchanged authority after return. If reversion fails,
preserve the healthy GP server, report cost and investigate; never stop/delete it
as an improvised cost correction. No production capacity sizing is decided here.

## 8. Failure / recovery disposition

- Rejected request before mutation: prove cause and unchanged source before any
  corrected request. Do not conflate this with an ambiguous engine failure.
- Active/unknown provider operation: freeze further changes; read-only investigation
  and provider escalation. Never overlap another restore/resize/upgrade blindly.
- SQL/auth/TLS/schema/reference mismatch after upgrade: keep TiDB live, freeze the
  Azure migration corridor, preserve evidence and the fresh8.0 recovery copy.
- No in-place downgrade. A new restore gets a different FQDN. Promoting that copy
  as the retained migration target is a separate explicit recovery decision;
  no automatic DATABASE_URL/DNS switch, destruction or ledger repair.
- Production remains available on TiDB throughout; retained-target interruption
  must not be described as a production database outage.

## 9. Completion and separate release-data issue

Successful output: retained target Ready8.4/B1ms, same0094 contract/reference data,
full operation/evidence record and named recovery resource/cost/retention owner.
Do not delete recovery or rehearsal resources without an explicit cleanup policy
or later approval. Existing rehearsal remains Ready8.4.9/B1ms and cost-bearing;
its temporary access was removed and write approval revoked.

The tax_treatment conflict remains **SOURCE-PRESERVED / OPEN**. Engine upgrade may
preserve it, but migration/cutover readiness cannot silently accept it. No decision
on changing commercial metadata, adapters or the verifier is made by this packet.

## 10. Principal decision requested

Approve **this packet's exact commit** for the named retained-target provider
sequence, attended window/cost and fresh recovery proof, or return specific edits.
That is the single next action. Execution begins only after this retained-target
approval, not from the earlier disposable-corridor authorization.

Provider references reviewed with rehearsal and checked against installed CLI/API
interfaces during preparation:
[major upgrade](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-upgrade),
[backup/restore](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-backup-restore),
[ARM update](https://learn.microsoft.com/en-us/rest/api/mysql/servers/update?view=rest-mysql-2024-12-30).

RETAINED AZURE8.4 UPGRADE PACKET — REVIEW READY / UPGRADE NOT STARTED / PRODUCTION UNCHANGED
