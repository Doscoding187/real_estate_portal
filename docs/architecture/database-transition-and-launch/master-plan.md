# Property Listify Database Transition and Launch Master Plan

**Status:** WP0 governing release record — implementation pending principal-architect review  
**Plan version:** 1.0  
**Prepared:** 2026-09-12  
**Owner:** Principal architecture / database release authority

This record is the implementation anchor for the approved database-transition
plan. It does not authorize a protected database mutation. Protected release,
import, restore, credential, infrastructure, and cutover operations require the
existing Database Authority approval and acknowledgement paths.

## Governing decisions

1. Preserve the canonical Drizzle schema, active migration manifest, foreign-key
   lifecycle semantics, CHECK constraints, migration ledger, and fail-closed
   Database Authority controls.
2. Use Azure Database for MySQL Flexible Server as the launch provider only
   after exact engine and constraint-enforcement evidence. Development, CI and
   ordinary staging remain local or isolated CI.
3. Reserve the Azure `propertylistify_database` database as the protected
   production candidate. Use temporary independently restored Azure targets for
   provider-sensitive validation, capacity testing and recovery drills; do not
   create a permanent Azure staging server before launch.
4. Prefer MySQL 8.4 after fresh-chain compatibility proof. MySQL 8.0 requires
   an explicit dated upgrade decision because its Azure standard-support window
   ends in 2026.
5. B1ms is a conditional controlled-launch option. It is not accepted from
   connectivity evidence alone; sustained capacity, CPU-credit, memory,
   connection, latency, storage and recovery thresholds must pass.
6. Runtime, migration, read-only verification, worker and administrative
   credentials are separate identities. Runtime credentials never receive DDL,
   grant, or migration-ledger write authority.
7. TiDB is inventoried and classified before transfer. It becomes read-only
   before final capture. Once Azure accepts authoritative writes, TiDB is not a
   switch-back writer.

## Release-source provenance

The WP0 implementation branch is based on the verified remote integration base:

| Item | Recorded value |
| --- | --- |
| Remote base | `origin/main` |
| Base SHA | `c2158b5da27a4fde9e4329e276024e9ade570e4a` |
| Local checkout observed before WP0 | `main` at `ad0c4247439a0bd27ebca17d4fba88dd023760f2` |
| Candidate branch inspected | `feat/database-architecture-takeover` at `b05e6569c02be4a47de8583bc9ed6197e528d035` |
| Candidate migration head | `0090_retire_disconnected_boost_campaigns.sql` |
| Remote-base migration head | `0065_auth_verification_token_cleanup.sql` |
| Relationship | Candidate descends from remote `main`; it contains a substantial coherent application/schema change set and is not automatically approved |

The candidate retains the existing `0000–0065` migration prefix and adds
`0066–0090`. The intended launch head is provisionally `0090`, subject to the
migration-admission review below. No migration is excluded, renumbered,
rewritten, or squashed by this record.

The database operating playbook and protected migration-credential work are
already present in the remote-base ancestry. Similarly named branches must not
be merged mechanically. The candidate must be reviewed as one application,
schema, authority and documentation release unit.

An uncommitted Azure target-classification change exists in another worktree.
It is outside WP0 and remains untouched. The exact Azure target class and
database role are to be resolved by the target-admission packet.

## Migration-admission register

The following entries require evidence before the candidate head can become the
release authority:

| Range | Admission evidence required |
| --- | --- |
| `0066–0071` | Deterministic activity cleanup, identities, uniqueness, indexes, ordering and concurrency proof |
| `0072–0075` | No remaining consumers of retired prospect families; recent-view integrity and recency proof |
| `0076–0078` | Relational lead delivery, idempotency, recipient ownership, retry/fencing and retirement reconciliation |
| `0079–0082` | Explore/service idempotency, retention and Pilot/Hidden access containment |
| `0083–0087` | Provider-event identity, retries, leases, crash recovery and billable-account ownership proof |
| `0088–0090` | No active consumers or required business records depend on retired billing, analytics or boost families |

Affected CHECK/FK overlaps, including billable-account, Land-claim,
geography-mapping and audit relationships, require exact MySQL/Azure execution
and deletion-semantics evidence. Local success alone is insufficient provider
admission.

## Decision register

| ID | Decision | Owner | Required evidence | Status |
| --- | --- | --- | --- | --- |
| D-001 | Select one integrated application/schema/authority release SHA | Principal architect | Clean integration, CI and local acceptance on merged SHA | Open |
| D-002 | Admit `0066–0090` and provisional head `0090` | Database authority | Per-range migration and consumer evidence; checksums/lineage intact | Open |
| D-003 | Select MySQL 8.4 or retain 8.0 temporarily | Principal architect | Fresh-chain engine matrix and Azure capability proof | Open |
| D-004 | Register `propertylistify_database` as production candidate | Release authority | Exact resource, host, port, database, fingerprint and operation policy | Open |
| D-005 | Decide whether B1ms passes controlled-launch capacity | Edward + principal architect | Sustained representative load, recovery and availability acceptance | Open |
| D-006 | Classify and transfer TiDB data | Edward + data owner | Sanitized inventory, mapping, reconciliation and archive decision | Open |
| D-007 | Accept recovery objectives and regional-failure posture | Edward + operations | Restore/PITR/logical-backup drill with measured RPO/RTO | Open |
| D-008 | Define Live/Pilot/Hidden launch scope | Edward + product authority | Updated central launch register and journey evidence | Open |

## Gate sequence

WP0 establishes the record only. Subsequent implementation must advance in this
order and stop at each failed gate:

`G0 scope/provenance → G1 migration/engine admission → G2 authority/security
controls → G3 integrated release acceptance → G4 Azure establishment → G5
recovery/capacity proof → G6 cutover approval → G7 production open → G8
stabilization → G9 TiDB retirement`

No Azure migration or TiDB import is authorized by completing WP0. Each gate
requires a packet report tied to the exact source SHA, target fingerprint,
manifest/model digest and evidence artifacts.

## WP0 acceptance criteria

- This record is committed on a task-owned branch based on the verified remote
  `main` SHA.
- The source, candidate, migration-head and branch relationship are recorded.
- The provisional `0066–0090` admission questions are explicit.
- Launch, cost, engine, target, TiDB and recovery decisions have named owners
  and evidence requirements.
- No migration, schema, authority code, credential, Azure or TiDB state was
  changed.
- Repository checks relevant to documentation complete and final Git status is
  clean after commit.

## Handoff boundary

The next packet is WP1, migration-lineage and engine admission. It may add
focused tests and evidence records, but must not modify protected targets,
rewrite migration history, weaken authority checks, or select a provider
workaround without principal-architect review.

