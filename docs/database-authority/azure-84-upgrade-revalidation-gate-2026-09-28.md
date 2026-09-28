# Controlled retained-target Azure 8.4 gate — prepared 2026-09-28

**Preparation only. Not upgrade authorization.** Entry requires review approval of
[B08 reconciliation](b08-0094-release-decision-2026-09-28.md), an exact reviewed
commit, matching model/manifest digests, and separately approved upgrade operation.
No production deployment or DATABASE_URL change belongs in this gate.

## Exact target and current evidence

Azure subscription `384dc69e-9e22-419f-9e3d-83fbac4f58d0`, resource group
`rg-property-listify`, server `propertylistify-mysql`, South Africa North;
FQDN `propertylistify-mysql.mysql.database.azure.com`, database
`propertylistify_database`. SQL-observed engine is **8.0.46-azure** from the prior
compatibility gate. Read-only ARM inspection on 2026-09-28 reports Ready,
Standard_B1ms/Burstable, HA disabled, replicationRole None, 14-day backups,
24-hour backup interval, geo backup disabled, earliest restore
2026-09-16T14:38:39.587662Z. ARM version 8.0.21 is not SQL patch-version evidence.

## Provider constraints and operator choices

Azure supports in-place 8.0→8.4 with unchanged connection strings. Major upgrades
are irreversible and interrupt availability; duration depends on size/table count.
Burstable upgrades temporarily use General Purpose compute. Approve its cost and
post-upgrade SKU; automatic reversion defaults to B2S, not this server's B1ms.
Capacity shortages can prevent tier changes; upgrade failure can leave General
Purpose active. Portal online validation does not support this version transition;
use Oracle's checker. Upgrade replicas first if any appear. Do not combine other
property changes with the upgrade request. [Azure upgrade procedure](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-upgrade).

Backups restore to another server, not an in-place downgrade. Retain a verified
pre-upgrade full backup and demonstrate recovery using a restored copy before
risking the retained target. Record backup ID/time, retention deadline, restored
engine, recovered schema/data, new FQDN, network access and recovery duration.
Geo restore is unavailable with the observed configuration. Automatic retention
is time bounded; do not assume the old engine recovery point persists indefinitely.
[Azure backup/restore](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-backup-restore).

Engine compatibility and lifecycle policy are separate. The 8.0 evidence does
not prove 8.4 behavior. Azure 8.0 standard support ends January 31, 2027, followed
by paid extended support February 1. This does not relax the principal's stronger
8.4-before-cutover decision. Review an unfinished upgrade before January 31, 2027.
[Version policy](https://learn.microsoft.com/en-us/azure/mysql/concepts-version-policy).

## Ordered execution gate (not executed here)

1. Bind reviewed source SHA and both authority digests; confirm retained target
   fingerprint, TiDB production configuration and no application writer aimed at Azure.
2. Refresh SQL/ARM version, SKU, regional 8.4 offering/capacity, replica topology,
   storage headroom, active transactions and backup health. Record exact offered
   8.4 patch and approved temporary/final SKU. Capacity, grants/authentication-plugin
   compatibility and backup restorability have not been proven by ARM show.
3. Capture read-only pre-upgrade evidence: full schema/constraints/indexes, all 95
   ledger checksums and attempt states, exact reference rows/digest and row counts,
   session/server variables and users' authentication plugin metadata (no secrets).
   Require no unresolved/running migration and no prepared XA transaction; if found,
   stop for a separate disposition, never automatically roll it back.
4. Run Oracle MySQL Shell Upgrade Checker against the exact offered 8.4 target
   version using protected credentials; retain redacted output and resolve every
   material finding. Check removed SQL modes, authentication/driver compatibility,
   routines, privileges and reserved words. Do not alter settings under this plan.
5. Under separate operation approval, obtain a fresh full backup, restore a copy,
   and exercise recovery and upgrade on that copy. Run behavioral regression there.
   Record expected outage from this rehearsal; no fixed downtime promise is made.
6. Review backup/copy evidence, outage window, SKU/cost and recovery plan. Then the
   authorized operator selects the exact retained server's 8.4 major upgrade via
   Azure's supported Burstable workflow, without concurrent property changes.
7. Wait for Ready; execute the matrix below. Any drift/failure blocks migration
   rehearsal and cutover. Preserve evidence; do not repair ledgers, replay migrations,
   reseed references, downgrade in place or repoint production as a recovery shortcut.

## Post-upgrade verification matrix

Every row is **NOT EXECUTED on 8.4** by this preparation. Retained-target checks are
read only. Behavioral DDL/DML tests require a separately authorized disposable
restored 8.4 copy; rollback-based tests still count as writes and must not run on
the retained target. Record exact source SHA, engine patch, target and output.

| Requirement | Method and pass criterion |
|---|---|
| Railway path / DNS / TCP | From production real_estate_portal network path; FQDN resolves and port3306 connects using assigned .240/.241/.242 egress |
| TLS / authentication / database | Existing protected candidate credential, verified CA + hostname; select intended DB and SELECT 1; never replace DATABASE_URL |
| Engine / endpoint | SQL VERSION()/version_comment proves 8.4; same FQDN and target identity; ARM Ready |
| Ledger head/checksums | Exactly 95 successful 0000–0094 identities, every checksum matches bound manifest, no pending/failed/running attempt |
| Schema congruency | Canonical comparator has zero differences; model digest bound in decision; 214 application tables + 2 control tables; unknown objects fail |
| CHECKs | All 23 canonical expressions present and enforced; violation behavior on disposable copy only |
| Foreign keys | All 463 match column order, referenced keys and update/delete actions; behavioral restriction/cascade tests on copy |
| Transactions / row locking | Two-connection lock/rollback regression on copy, including lock waits, commit and rollback; retained session isolation observed |
| JSON | Read-only canonical JSON extraction/containment expressions; persisted JSON regression on copy |
| CTE / windows | Read-only representative CTE/window queries produce expected deterministic results |
| UTC | Each runner/runtime connection reports +00:00; capture global/system timezone separately; verify driver date serialization |
| timestamp(6) | Metadata retains precision/defaults; microsecond round-trip on copy; no truncation accepted |
| Charset / collation | Compare pre/post utf8mb4, server/db0900_ai_ci and connectionunicode_ci; investigate every change and uniqueness/order effect |
| Identifier case | Verify lower_case_table_names; expected1 maps propertyimages→propertyImages only at comparator; collisions/unknowns fail |
| SQL modes | Capture full mode sets; compare prior IGNORE_SPACE, ONLY_FULL_GROUP_BY, STRICT_TRANS_TABLES, NO_ZERO_IN_DATE, NO_ZERO_DATE, ERROR_FOR_DIVISION_BY_ZERO; audit any change |
| GIPK / establishment | Observe global GIPK/requirePK; retained explicit keys and no unexpected invisible keys; fresh session guard/complete establishment only on disposable copy, preserving global setting and UTC |
| Primary keys / races | user_onboarding_state(user_id), content_topics(content_id,topic_id); null/dup precondition tests and concurrent winner regression on copy |
| InnoDB / limits | Compare isolation, row format, page size, FK/check settings, max_allowed_packet and connection limits to captured pre-upgrade values |
| Canonical reference rows | Preserve existing 3 plans/9 entitlements and exact contents; resolve v4 evidence versus v3 release-adapter admission without reseeding |
| Read-only application smoke | Read-only SELECT paths for listing/location joins, discovery/content topics, onboarding existing state and email metadata; do not invoke read endpoints that auto-create state |
| Application regression | Static authority suite, typecheck/lint/build plus copy-backed listing/search, JSON, FK/CHECK, timestamp, transactional-email contracts and onboarding concurrency; no sending workflow activation |
| Production safety | Confirm TiDB listify_property_sa remains DATABASE_URL authority; no deploy/cutover; record unchanged protected URL fingerprint without exposing URL |

Passing the matrix authorizes a readiness report only. Controlled migration
rehearsal and eventual cutover remain subsequent separately approved gates.
