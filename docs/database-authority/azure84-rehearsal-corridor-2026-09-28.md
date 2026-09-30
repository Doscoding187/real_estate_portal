# Disposable Azure MySQL 8.4 rehearsal corridor — 2026-09-28

**Result: AZURE 8.4 REHEARSAL — PASS. Final closure verified 2026-09-29.**

## Scope and authority

This packet records the principal-authorized engineering corridor from commit
`13ebe26b69d2bb885767ba2b744279820dfa3f82`, extending reconciled release
`a5fa6256f3579b16223586fa579f4ecd28c59ad6`. It does not authorize retained-target
upgrade, deployment, migration, commercial-data changes or cutover.

Branch: `fix/azure-rehearsal-regression-authority`.
Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-azure-rehearsal-regression-authority`.
Live regression execution commit: `b25da60534a812ba1e7a7b4a7d0ab3ec38aa28bf`.

Only `pl-azure84-rehearsal-20260928` in `rg-property-listify`, subscription
`384dc69e-9e22-419f-9e3d-83fbac4f58d0`, South Africa North, received compute/engine
operations and synthetic fixtures. Database `propertylistify_database`; FQDN
`pl-azure84-rehearsal-20260928.mysql.database.azure.com`.
Tenant `33bbbbdd-9394-49dc-b9a0-dc07caeebbaf`.
Purpose `AZURE MYSQL 8.4 RESTORED-COPY REHEARSAL`; registered creation timestamp,
resource ID and expiry `2026-10-05T00:00:00Z` remain enforced.

## Repository changes / self-review

- `25fb7c9d`: true preflight mode in the existing rehearsal session. Same live
  ARM/TLS/UTC/schema/ledger/business-table checks; non-read probes refused.
  No cleanup DML if no DML was attempted. Attempted/ambiguous DML still requires
  bounded cleanup. Connections close even if approval expires.
- `01b9411e`: executable bounded regression driver; SELECT1 and exact stored
  microsecond evidence in the fixed catalogue.
- `1bd3e730`: fixed synthetic billing/payment fixture lifecycle and canonical
  entitlement-predicate checks. Reserved IDs and child-first cleanup remain;
  canonical plans/entitlements only read.
- `b642a3ba`: server settings/CHECK enforcement evidence and bounded property/media
  join smoke query.
- `b25da605`: replace Array.at with indexed access for repository TypeScript target.
- `abc7f6cd`: revoke the completed write registration and add unmocked closure denial proof.

Touched code: connectionAuthority.ts, rehearsalProbes.ts,
rehearsalConnection.test.ts, rehearsalCatalogue.test.ts,
scripts/azureRehearsalRegression.ts and disposable-rehearsal-regression.md.
Evidence/documentation in this packet are additional review artifacts.
No canonical schema/migration file changed. No checksum regeneration, ledger
repair, reference seeding or broader B08/B10 runtime promotion occurred.

Self-review confirmed the existing single authority, fixed catalogue, exact
resource/FQDN/database/TLS/purpose/expiry binding and runtime credential class.
Retained Azure, TiDB, wrong server/subscription/group/database/purpose, missing
TLS, revoked/expired authority, generic shared-remote and generic destructive
operations remain refused. No arbitrary SQL or generic application pool is
exposed. No secret material entered the changeset.

Tests: final database-authority gate43 files/384 tests PASS, focused rehearsal41 tests
PASS, focused application contracts4 files/21 tests PASS; typecheck PASS after
repair; touched-file lint0 errors/11 any-type warnings; build PASS with existing
bundle-size advisory; git diff --check PASS. These static/mock tests are separate
from the real8.4 results below.

## Runner and provider preflight

Local runner used existing authenticated Azure CLI and protected runtime
credential, loaded privately into explicit caller authority. Production URL was
never substituted. Exact temporary local-IP rule169.1.56.148 enabled direct
FQDN/TLS connectivity; no Azure credentials/tooling were installed in Railway.
Both local and Railway paths verified TLS1.3, certificate and hostname,
authentication and exact selected database.

Oracle MySQL Shell8.4.10 archive matched publisher MD5
`ba973632792cae920b7b2213c783772f`. Checker ran with VERIFY_IDENTITY against
8.0.46-azure targeting major8.4, without excluded checks. Result:13 configuration
errors,10 warnings,3 notices; no application schema-object finding. All13 error
variables independently matched Azure ARM `system-default` values. Ten concern
removed8.0 variables, one the default authentication plugin, and two provider TLS
cipher lists. Repository search found no dependency on removed variables or
SET_USER_ID. No server parameter was modified to silence the report.

Engineering disposition: provider-managed transition findings preserved for
review and post-upgrade validation. Azure explicitly supports existing native
password accounts after8.4; the actual post-upgrade runtime/inspector connections
then passed. The cipher-list error lists the selected ciphers among its own
allowed members. No unsafe cipher or verification workaround was introduced.
The subsequent Azure upgrade and physical tests, not a filtered checker result,
establish the engine result. Full sanitized findings are preserved separately.

Azure's online8.0→8.4 validator is unavailable. The provider-supported standalone
upgrade path was used, with HA disabled, replicationRole None,14-day backup
retention and accelerated logs disabled. Fresh XA RECOVER was empty and active
InnoDB transactions0 immediately before major upgrade. Original source/copy
proof and restored-copy lineage were preserved; no new restore was initiated.

Sources: [Azure upgrade procedure](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-upgrade),
[Azure authentication/version policy](https://learn.microsoft.com/en-us/azure/mysql/concepts-version-policy),
[documented ARM update shape](https://learn.microsoft.com/en-us/rest/api/mysql/servers/update?view=rest-mysql-2024-12-30).
Live ARM parameter metadata is the primary evidence for exact system-defaults.

## Provider execution

Original Standard_B1ms/Burstable → Standard_D2ds_v4/GeneralPurpose (2vCore/8GiB),
a smallest regional supported GP offering. Storage size/IOPS were not changed.
Resize correlation `f105a96a-206f-40cb-95d5-cda820ad95a3`:
started18:05:51.568Z, succeeded18:08:58.982Z.

Installed Azure CLI upgrade command submitted malformed top-level `version`.
Azure rejected it before execution with InvalidRequestContent; correlation
`8e15ab61-fc08-4018-8e6c-b3d6c0a6eb07`, failed18:09:15.297Z. Source inspection and
Azure API documentation proved the cause. Server remained Ready8.0.46.

A deliberate corrected request used documented PATCH with only
`{"properties":{"version":"8.4"}}`, API2024-12-30. No safeguard was disabled,
no retry of an ambiguous engine operation, no unrelated property in that request.
Azure accepted ServerVersionUpgradeManagementOperation at18:10:34.873Z;
correlation `af6d6409-6078-4e7a-a760-6a0d0c887b6e`.
The endpoint remained unchanged. By18:13:23Z (within169seconds of submission), ARM had reported Ready/fullVersion8.4.9,
and local/Railway SQL proved **8.4.9-azure**. Activity export initially contained
Started/Accepted only; the actual completion evidence is Ready plus exact SQL
build and successful physical validation, not an invented Succeeded log entry.

TCP monitoring every approximately10seconds: last pre-outage success18:11:01,
first refusal18:11:11, last refusal18:12:32, first success18:12:42 UTC. Estimated
unavailability82–102seconds. This excludes compute-resize downtime and is not a
production SLA or an exact subsecond duration.

## Read-only authority integrity — PASS

Before/after/after-cleanup canonical model digest:
`a8ca8cf34bb3627594eab1b722b85115c6460225a0165db7992228a8547798e9`.
Manifest digest:
`93d871e6f8760477f460b8821685d71d212374eb86ddd53bc6e2ccfc30608efc`.

- Exactly95 successful migration identities/checksums; head
  `0094_content_topics_primary_key.sql`; no incomplete attempts.
- 216 total tables:214 application +2 control tables.
- Full normalized schema equal: columns/types/defaults, PKs/unique indexes,
  all463 FK definitions/actions,23 enforced CHECKs,143 JSON columns.
- Transactional-email tables and both explicit PK corrections preserved.
- lower_case_table_names1, approved mapping only; unknown objects not hidden.
- UTC+00:00/systemUTC, REPEATABLE-READ, SQL modes and charset/collations preserved.
- GIPK remainsON/requirePKOFF; no unexpected invisible keys. Existing fresh-session
  safeguard has static regression proof; no fresh migration establishment was run.
- During GP phase max_connections171→683 and max_allowed_packet16MiB→512MiB.
  These observed limit changes were reported, not normalized out of the evidence.

## Physical behavior / application database integration — PASS

The governed two-connection catalogue, using only isolated synthetic IDs, proved:

| Contract | Live8.4 evidence |
|---|---|
| Connectivity | Local and Railway FQDN/TCP/TLS1.3/certificate/hostname/auth/database; SELECT1 |
| CHECK/FK/PK | Actual expected MySQL rejection errors3819/1452/1062 |
| Onboarding | Real createOrReadOnboardingState helper concurrently uses two physical connections; same winner returned |
| Transactions | Commit visible to other connection, rollback and savepoint restore expected values |
| Locking | FOR UPDATE blocks competing UPDATE, then releases it on rollback |
| Composite identity | content_topics duplicate composite PK rejected; topic deletion NO ACTION rejected |
| Email | Pending default, claim update, delivery/attempt identities, attempt unique-key rejection, recipient/delivery RESTRICT |
| Time | Stored claim timestamp microseconds123456 preserved; default timestamp six-digit fraction observed; UTC driver/session |
| JSON/windows | Persisted nested JSON extraction, deterministic CTE/ROW_NUMBER result |
| Billing/payment | Synthetic account/subscription/invoice/payment relations, state updates, payment amount, RESTRICT/SET NULL/CASCADE |
| Application entitlement | Real canonical paid-row predicate consumes live subscription row, accepts unexpired term and rejects expired term; parser consumes9 existing entitlement rows |
| Read smoke | Property/media join resolves canonical mixed-case logical table on folded Azure physical schema |
| Cleanup | Bounded child-first cleanup completed; fresh independent preflight proves every nonreference application table empty |

This is bounded physical database/application-helper integration. It is not a
full payment-provider, browser, HTTP workflow, performance/load or email-sending
test; no deployment occurred. Static application contract tests complement but
do not replace the live checks above. No fresh database/migration was created.

## Reference data and cleanliness

3 plans and9 entitlements exactly preserved before/after/after cleanup, including
IDs, keys, fees, duration, values and metadata. Comparison orders rows by ID;
SQL result ordering differences are not data drift.
`tax_treatment: "not_vat_registered"` remains
**REFERENCE-DATA ADMISSION CONFLICT — SOURCE-PRESERVED / OPEN**. V3 exact verifier
continues to reject it. No commercial policy decision or adapter relaxation was
made. This remains separate from engine compatibility.

All business tables were empty before probes and independently empty after
cleanup. Migration ledger/checksums and canonical reference rows unchanged.
Synthetic inserts may advance auto-increment allocation counters; no ALTER/reset
was used to conceal that expected disposable-fixture side effect. It does not
change canonical schema or retained-target data.

## Production safety

TiDB `listify_property_sa` remained production authority. Railway read-only probe
reported unchanged production URL SHA256
`845be8882a17ff17df51dcb1ba0ab98ec772c23d8091495fa4a077be01c60778`.
Retained `propertylistify-mysql` remains Ready8.0.46/B1ms and received no mutation.
All engine/compute changes and synthetic writes were confined to the exact
rehearsal server. No production deploy, URL change, migration execution, schema
DDL, reference write, ledger edit, checksum change or secret disclosure occurred.

## Evidence

[Machine-readable summary](evidence/azure84-rehearsal-20260928/summary.json),
[checker findings](evidence/azure84-rehearsal-20260928/oracle-findings.json),
[local artifact hashes](evidence/azure84-rehearsal-20260928/artifact-digests.json).
Full local evidence: `/tmp/pl-azure84-corridor-20260928/` (private directory).

## Final resource/access closure — 2026-09-29

**AZURE 8.4 REHEARSAL — PASS.** The retained target is eligible for preparation
of an upgrade execution packet, not authorized for upgrade by this result.

The copy returned to **Standard_B1ms/Burstable, Ready,8.4.9-azure**, unchanged
FQDN; it remains running and cost-bearing. No stop/delete was performed. Final
Railway read-only schema comparison again has zero differences and all95 ledger
checksums match. All216 tables were counted: only plans3, entitlements9, history95
and succeeded attempts95 are populated. References remain byte/value-equivalent.
B1ms limits returned to max_connections171 and max_allowed_packet16777216.

The public IP changed overnight to192.143.16.245. The obsolete exact-IP rule
PropertyListify-Local-Rehearsal-Runner-20260928 was removed; verified firewall list
contains only the prior3 Railway rules and the inherited192.143.7.18 client rule.
No replacement local rule was added. Initial removal failed at DNS before request
dispatch; after resolution recovered, the same exact removal succeeded. The final
local preflight also failed closed at ARM verification during this network event;
no SQL was issued. Final read-only checks used Railway, with no credential/tooling
transfer. The task SSH registration pl-corridor84-20260928 was removed afterward.

The completed rehearsal write registration is revoked. Historical-positive unit
cases use explicit mocked approved-window records; the actual on-disk registration
has a new unmocked denial test. No new live probes occurred after revocation.

No engine-compatibility blocker remains in the exercised contract. The separate
source-preserved commercial metadata admission conflict remains OPEN. Whole
application/browser/payment-provider workflows and production capacity are outside
this engine rehearsal's evidence; they must not be inferred from this PASS.

Exactly one recommended next principal-level action:
**PREPARE THE CONTROLLED RETAINED AZURE0094 TARGET8.0→8.4 UPGRADE EXECUTION PACKET
FOR PRINCIPAL REVIEW.** Do not execute that upgrade from this packet.

AZURE8.4 REHEARSAL — PASS / RETAINED TARGET UNCHANGED / PRODUCTION CUTOVER NOT STARTED
