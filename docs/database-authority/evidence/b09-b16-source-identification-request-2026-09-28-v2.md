# B09/B16 source-role update and TiDB read-only verification request

**Prepared:** 2026-09-28
**Status:** Owner facts recorded; current binding verification and source-specific approval pending. B09, B15, and B16 remain open.

This version supplements the accepted 2026-09-28 source-identification addendum. It records Edward's founder-confirmed source-role knowledge while keeping live binding, target identity, current database state, and access approval separate. It does not authorize a source connection, census, migration, repair, grant, cutover, or production switch.

## Founder-confirmed source distinction

| System | Founder-confirmed role | Still unverified / separate gate |
| --- | --- | --- |
| TiDB database listify_property_sa | Current production runtime source; legacy migration source. This is Edward's owner knowledge, not independent current-binding evidence. | Current Railway service/environment/deployment binding, exact endpoint and target fingerprint, effective database, current source role, current ledger/schema state, and source-specific read-only approval. |
| Azure MySQL | Intended production database target. | B08 target admission and migration/cutover verification remain separate and pending. It is not established as the current runtime source. |
| Canonical repository model | Canonical schema authority remains unchanged at the accepted 0094 model. | No founder statement changes the canonical manifest, migration policy, or desired schema. No migration or repair is authorized. |

Edward reports that TiDB is incompatible with required application/database behavior. This is recorded as founder-reported rationale only; this packet does not independently verify the incompatibility, identify a specific failing behavior, or approve a database switch.

Prior TiDB evidence is historical comparison evidence, not current binding proof. The 2026-09-24 B08 report, SHA-256 cccbf6cf71f01ac51e88ec39f6137c99c29f0e18345404a12c12ac43a6f94e83, recorded instance label listify-property-canonical, instance ID 10492391619114516879, region AWS Tokyo (ap-northeast-1), database listify_property_sa, and old target fingerprint 68f2582a6dc7af8c54cf6f31a396e8abe4c4030696c923b0ea3b1679ba6f5b5e. That report observed 66 migration-history rows through 0065_auth_verification_token_cleanup.sql, an incomplete failed zero-statement migration attempt, and schema incongruence against the 0094 repository model. None of these 2026-09-24 observations is current-state verification. Its historical service/authenticated-principal details are deliberately not copied into this shared request.

The senior-accepted B09 runner v2 remains unchanged and supported only for canonical-0094 disposable-target verification. Its accepted source tree is 2214802b6b18be3cf6d2ce7b957900c456462b35, runner SHA-256 b92f877daeb618ee46f1fc6c6636e577cdeca34b056e08de4e8c8c51e308d31f, and query/scope SHA-256 eb12f8f58c71225575051757a59a3e3f1349aa66dcd7146a20434e5e1fa58fdb. It must not be run against TiDB schema 0065.

## Exact read-only request for current TiDB binding and metadata

**Requested operation:** one-target, read-only identification of the effective Railway production runtime database binding and minimal database identity/control-schema metadata. The request is for later source-specific review; it is not currently approved for execution.

**Expected candidate:** Railway production application runtime, provider-reported TiDB, database name listify_property_sa. Any differing provider, service, deployment, instance, database, or target fingerprint is a mismatch: stop and return for review rather than follow the observed target.

**Owner and reviewer inputs required before connection:**

1. Edward / Founder confirms the owner-reported source role and accountable data scope; this does not substitute for target verification.
2. Railway infrastructure owner supplies current project/account, service, production environment, active deployment identity/revision and effective database-binding name/reference, with secret values withheld.
3. Database Authority reviewer binds the exact current endpoint/database target to a sanitized fingerprint, classifies the operation, names the operator and reviewer, and approves the exact read-only scope and time window.
4. The source owner identifies an existing dedicated read-only principal bound to that exact target. No reader creation, grant change, reuse of a credential found in historical evidence, or use of the production runtime credential is requested. If no such principal exists, stop and request a separate review under the governed identity-provisioning operation.
5. The reviewer specifies an enforced query deadline and cancellation/cleanup bound proven for the actual TiDB version and approved connection path. The B09 MySQL disposable-target timeout proof does not prove TiDB cancellation behavior. If bounded execution and cleanup cannot be demonstrated without elevated/global privileges, do not connect.

### Phase A — verify provider binding without opening a database connection

Read only the effective Railway production application/service/environment/deployment metadata needed to establish which secret binding is selected. Record non-secret provider/project/service/environment/deployment identifiers, binding name, non-secret secret reference/version identifier if available, and evidence time. Do not print, export, paste, or place the credential-bearing value in logs or this shared artifact. Do not trigger a redeploy or edit service variables.

A Railway configuration label alone does not prove the running deployment's effective target. The binding must be tied to the active production deployment and then resolved through Database Authority. If the active runtime cannot be tied to one exact selected database fingerprint without exposing credentials, stop and return for a reviewed identity-resolution method.

### Phase B — exact-target approval, then three metadata-only statements

Before connecting, Database Authority must record the exact target fingerprint, sanitized identity, target class, approved read-only principal class, source-specific approval reference, operator, reviewer, issue/expiry time, query-bundle hash, bounded execution controls, and recipient of sanitized output. The expected target is production; unknown/shared targets are denied. Current policy's b09-source-census operation is disposable-worktree-only. Any production identity check must use a separately approved read-only operation and must not invoke the B09 census command.

After that approval only, execute the exact three statements in [the request-only query bundle](b09-tidb-readonly-identity-probes-2026-09-28.sql), SHA-256 5334dfccd58957c7c7275ae056f5d20119fe241d16c9d175d106e1ccd41ff589:

- One exact selected database/server-version/effective-account identity row.
- Presence or absence of only sql_migration_history and sql_migration_attempts in the selected schema, at most two rows.
- Column name, ordinal, type, and nullability metadata for only those two table names, with 129 rows as an overflow sentinel.

Run no more than these three statements against one exact target. Do not enumerate unrelated tables or schema objects. Do not read application rows, migration ledger rows, user/listing/enquiry/payment/media content, or object storage. The query bundle is preparation only and has not been executed. If any statement is unsupported, any target value differs, the result exceeds its bound, or the ledger mapping is missing/unknown, stop; do not issue compatibility variants or fallback SQL.

### Phase C — migration-ledger state is a separate reviewed follow-up

The three probes identify the current selected target and the physical names/shapes of the two migration-control tables; they do not verify the current migration head or attempt state. Because TiDB is at a historical schema and no historical ledger mapping has been accepted in this workstream, no ledger-row query is included or authorized here.

Only after Phase B evidence is reviewed may a separate historical-mapping decision bind exact column mappings and an exact bounded query/hash for the current migration history and attempt state. That review must establish lineage, checksums, attempt outcome and cleanup state without running the 0094 census or any alternate-schema fallback. If a safe exact query cannot be established from observed metadata and canonical authority, stop and preserve evidence. No migration, retry, repair, convergence, import, restore, or switch follows from a read-only result.

## Read scope and output controls

Phase B requests metadata-only reads from the selected database identity and the two named migration-control table definitions. It requests no SELECT on application data tables, no global process visibility, no DML/DDL, no migration, no grants, and no object-storage access.

The shared result should contain only a sanitized provider/service/deployment binding description, target class and fingerprint hash, database name, server version, sanitized principal class, the two table-presence findings, bounded column metadata, query-bundle hash, approval reference, timings, and stop/pass outcome. Keep credential values, secret-bearing URLs, raw account identifiers not needed for review, personal information, and any unrelated schema inventory private. Do not claim current migration head/attempt state from this metadata-only phase.

## Separate Azure B08 boundary and B16 insertion text

Azure MySQL target admission and migration/cutover verification remain with B08 and its own exact-target procedure. Do not include Azure in this TiDB request, point production at Azure, or treat founder intent as cutover approval.

For the current B16 packet, replace the B09 source-role summary with:

> Edward / Founder confirms TiDB database listify_property_sa is the current production runtime source and legacy migration source; current Railway binding and exact target fingerprint remain unverified. Edward reports TiDB incompatibility with required application/database behavior; this rationale is not independently verified and does not change the canonical 0094 repository schema authority. Azure MySQL is the intended production database target, pending separate B08 target admission and migration/cutover verification. B09 runner v2 is accepted only for canonical-0094 disposable-target verification and must not run against historical TiDB schema 0065. A three-statement metadata-only TiDB verification request is prepared but not authorized or executed. Historical ledger mapping, source-specific protected read approval, B09 census/disposition, B15, and B16 remain open.

The B16 worktree itself was not changed because it contains another task's staged source and evidence. The insert is prepared for its owned packet.

## Exact identities, status, and boundary

| Item | Identity or status |
| --- | --- |
| B09 accepted runner tree | 2214802b6b18be3cf6d2ce7b957900c456462b35 |
| B09 runner / query-scope hashes | b92f877daeb618ee46f1fc6c6636e577cdeca34b056e08de4e8c8c51e308d31f / eb12f8f58c71225575051757a59a3e3f1349aa66dcd7146a20434e5e1fa58fdb |
| Founder-reported TiDB database | listify_property_sa; current Railway production binding awaits independent verification |
| Historical TiDB fingerprint | 68f2582a6dc7af8c54cf6f31a396e8abe4c4030696c923b0ea3b1679ba6f5b5e; comparison-only, dated 2026-09-24 |
| Azure MySQL | Intended target per founder; B08 admission/cutover verification pending |
| Canonical schema authority | Unchanged; accepted repository head 0094_content_topics_primary_key.sql |
| Source access this turn | None. Only local Database Authority status was checked; its disposable target was unreachable and schema/ledger state not evaluated. No database was provisioned. |

No source-specific access, migration, repair, production switch, storage access, merge, deployment, or activation is authorized by Edward's confirmation or this request. B09, B15, and B16 remain open.
