# Fresh Azure transition: readiness evidence and cutover preparation

Date: 2026-09-29. Status: **ENGINE ACCEPTED; APPLICATION CUTOVER NOT READY**.
This is a preparation packet, not a claim of G5/G6 acceptance or an applied
production configuration change.

## Source and authority

Task branch: `docs/retained-azure84-upgrade-packet`, task worktree
`/home/edwardspc/Desktop/Dev/worktrees/property-listify-retained-azure84-upgrade-packet`.
Inspection HEAD: `7e2104c3` (extends reviewed packet `35954afc`, reconciliation
`a5fa6256`, rehearsal authorization and closure lineage). No unrelated candidate
runtime work is included.

- Manifest: 95 migrations, head `0094_content_topics_primary_key.sql`.
- Manifest digest: `93d871e6f8760477f460b8821685d71d212374eb86ddd53bc6e2ccfc30608efc`.
- Model digest: `a8ca8cf34bb3627594eab1b722b85115c6460225a0165db7992228a8547798e9`.
- Azure protected fingerprint: `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`.
- Target: `propertylistify-mysql.mysql.database.azure.com`,
  `propertylistify_database`; subscription
  `384dc69e-9e22-419f-9e3d-83fbac4f58d0`, RG `rg-property-listify`.

## Completed retained-server upgrade

The separately approved upgrade packet was executed. The provider upgrade
operation `8bc9fca6-2fb8-4e63-a6c7-ee30702d755e`, correlation
`1817b828-104e-4148-8bf8-ed4a3f55d70e`, started at 13:20:26 UTC and was observed
Succeeded at 13:22:57 UTC on 2026-09-29. This ~151-second interval is operation
observation duration, not an asserted database outage duration.

Azure SQL now reports **8.4.9-azure**. The server returned to Ready on
**Standard_B1ms / Burstable** after the temporary Standard_D2ds_v4 / General
Purpose transition. FQDN is unchanged. Final B1ms comparison shows no difference
in the captured material server/session settings from the original B1ms state.

Fresh pre-upgrade FULL backup completed at
`2026-09-29T10:19:47.598852+00:00`. Recovery copy
`pl-pre84-recovery-20260929-0815` passed source equivalence on 8.0.46. It remains
separate recovery evidence, not the application target.

Final protected read-only verification passed:

- all 95 migration identities/checksums and successful attempt counts unchanged;
- 216 total tables, 23 enforced CHECKs, 463 FKs, canonical congruency with zero
  differences, and unchanged JSON-column inventory;
- all table counts, three plans and nine entitlements unchanged;
- verified TLS, selected database, UTC session, JSON/CTE/window read probes;
- live canonical-commercial-v4 admission succeeds, using approved B01 authority
  promoted in `bfbe046d`, without changing reference rows;
- production still resolves to TiDB `listify_property_sa`, with unchanged
  protected URL comparison. No URL or credentials are reproduced here.

## Application readiness audit

The candidate runtime credential was used through the canonical connection
and authorization authority, operation `read-only-connect`, credential class
`runtime`, exact protected fingerprint and Edward's transition instruction.
Transport was an isolated diagnostic process reached through Railway SSH; it
used the backend network path without changing backend configuration or
installing a deployment. All SQL in this audit was SELECT/SHOW only.

| Check | Evidence | Result |
| --- | --- | --- |
| DNS/TLS/auth/selected database | MySQL 8.4.9-azure, TLSv1.3, verified certificate/hostname, UTC +00:00 | PASS |
| Runtime ledger reads | 95 history rows and 95 attempt rows readable | PASS; no grant repair needed |
| Fresh accounts | `users` count 0 | PASS for fresh-start state; registration not yet exercised |
| Commercial reads | 3 plans / 9 entitlements | PASS |
| Transactional email reads | Both canonical tables readable, zero rows | PASS for read access only |
| Geography | provinces 0, cities 0, suburbs 0 | NOT READY |
| Owner/OAuth configuration | Required owner ID, OAuth server, app ID and JWT secret present; values not emitted | Presence PASS; end-to-end owner login NOT YET PROVEN |
| Runtime writes and browser journeys | Not executed on retained target | NOT YET PROVEN |

The geography authority is `dataAdapters/canonicalGeography.ts` plus its
`governedRuntimeGeography.ts` projection. Its current prepare path permits
owned disposable reference seeding only. The existing protected
`release-reference:*` path operates on commercial reference data only. Do not
call the local seed against Azure or hand-author INSERTs. The next engineering
change must extend the existing protected reference release path for this
canonical geography adapter, with read-only planning, exact approval/target
binding, conflict rejection, transaction and lock protection, deterministic
verification, and protected/shared-remote negative tests. Do not add demo
accounts, scenario listings or a parallel geography dataset.

## Remaining release gates

1. Implement and test the governed geography release extension; produce a
   target-bound read-only plan and then the separately governed apply/verify
   evidence. Preserve migration head/checksums; no schema migration is needed.
2. Validate fresh registration, login, onboarding, owner access and core query
   journeys against an authorized isolated target using the exact integrated
   candidate. Do not reopen the revoked rehearsal write authorization silently.
3. Integrate the reviewed corrections to the release source and record the
   exact deployable SHA and artifact. A task worktree is not a deployed release.
4. Close the existing G5 capacity/recovery evidence and obtain G6 acceptance.
   B1ms engine success does not demonstrate the required 24-hour representative
   capacity run, regional backup/recovery objectives or full application
   recovery. No waiver is inferred from the fresh-data decision.
5. Complete writer census and the protected TiDB archive procedure. A final
   archive must follow a proven writer freeze, include schema and data integrity
   evidence, remain access controlled, and have a verified recovery/readback
   procedure. No archive completion is claimed by this packet.

## Prepared cutover sequence (not executed)

- Require exact merged release/artifact, Azure/runtime/worker identity binding,
  G5/G6 acceptance, recovery artifacts and a staffed observation window.
- Put public writes into maintenance; stop and drain all known workers and
  scheduled/admin writers; handle webhooks through the reviewed retry/capture
  policy. Prove the TiDB writer freeze.
- Capture and verify the final protected TiDB archive. **Import nothing from
  TiDB** into the fresh Azure application. Preserve TiDB for the retirement
  retention/review period; do not delete it at cutover.
- Set API and worker database configuration to their distinct least-privilege
  Azure identities and rotate the session-signing secret. Keep secrets out of
  the packet and repository. Old TiDB sessions must be invalid before fresh
  accounts can acquire reused numeric IDs.
- Deploy the exact approved release with public writes still closed; verify
  protected target, manifest/schema/reference readiness and fresh-account
  journeys before opening traffic.
- After Azure accepts business writes, recover forward on Azure or deploy a
  compatible application artifact. Never silently reopen TiDB as an alternate
  writer with diverging account identities.
- Remove temporary operator access, preserve evidence and review disposal of
  cost-bearing rehearsal/recovery infrastructure separately.

## Safety and resource state

During this readiness audit: no database mutation, migration, grant change,
firewall change, deployment or application configuration change occurred.
TiDB remains the runtime authority pending controlled cutover; the objective
remains full transition to Azure, not permanent dual-database operation.

Retained Azure, the 8.4 rehearsal server and the 8.0 recovery copy remain
cost-bearing. Their existence does not authorize deletion. Task SSH access and
owned remote diagnostic files remain cleanup obligations while transition work
continues. This report contains no credential or connection string.

## Private evidence checksums

The six artifacts below were also preserved under mode-0700 operator storage
`~/.local/state/property-listify/azure-transition-evidence-20260929`, with
mode-0600 files. Working evidence remains under
`/tmp/pl-retained84-execution-20260929`. This local preservation is not an
independent regional backup or the TiDB archive. Do not publish raw
credential/provider response files.

| Artifact | SHA-256 |
| --- | --- |
| `source-preupgrade.jsonl` | `64c7fa127be5a779ac0a9864377e40e5e2770100e6a088d216a55abd222d9c69` |
| `recovery-equivalence.json` | `03ac71439dfa7c4191b8bbbeab5936f2ac5df4be1b29d4eeef67bd3fd0d3f4d6` |
| `source-final-b1ms.jsonl` | `aad03209f5547747ea5c9c8652debdeeed39b5a5332a92379eabdbe60555a6b5` |
| `final-b1ms-integrity.json` | `22c93325281b80224699922fdd421d292b398bd8b9a1e4f78c49497440ecf8d7` |
| `runtime-readiness.jsonl` | `aac04e5c22c81fd0b98df340fd336c33c5f78e1deb254c1c49b8d426976f1385` |
| `auth-config-presence.jsonl` | `019870b2b8828133bda06820ddeb30b96f0baf109f0fe628056822cbb9e1b81f` |
