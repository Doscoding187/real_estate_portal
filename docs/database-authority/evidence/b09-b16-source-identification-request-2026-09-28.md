# B09/B16 source-identification request — accepted runner v2

**Prepared:** 2026-09-28
**Status:** Prepared for owner response; not source-access authorization. B09 census and final disposition remain open. B16 remains open.

This addendum records the senior-accepted B09 runner identity and requests source identification needed to prepare a separate, source-specific census authorization. It does not authorize connecting to any historical, protected, shared, staging, production, TiDB, or storage target. It authorizes no export, transfer, archive, or deletion. The accepted runner and v2 evidence remain unchanged.

## Accepted runner identity and scope

| Identity | Accepted value |
| --- | --- |
| B09 branch and worktree | feat/b09-db-census-runner-20260927; /home/edwardspc/Desktop/Dev/worktrees/property-listify-b09-db-census-runner-20260927 |
| Base commit and product-candidate tree | a05868c66f493e3cbc972a119074c91a10797777 / b21f454e215d8b02129e4daa14ba6f8d338406d1 |
| Senior-accepted staged source tree | 2214802b6b18be3cf6d2ce7b957900c456462b35 |
| Runner code SHA-256 | b92f877daeb618ee46f1fc6c6636e577cdeca34b056e08de4e8c8c51e308d31f |
| Query/scope SHA-256 | eb12f8f58c71225575051757a59a3e3f1349aa66dcd7146a20434e5e1fa58fdb |
| Source-file count and manifest SHA-256 | 13 files; 36056244f3fc27b697647f307a13cea14816910a18c1a18911dfd71a3df61f4b |
| Supported scope and mapping | b09-launch-data-aggregate-v2; canonical-launch-0094-v2; head 0094_content_topics_primary_key.sql |
| Accepted v2 packet SHA-256 | 0b64e1c001dace5f022702fa2d786c1f5d10c2b5748c99d737330b935313d7d0 |
| Accepted synthetic verification SHA-256 | fd90e6cf4de4f50c5d745b6705c2040fa5ea7d82aabd8b6eb27e793fd40fd2b7 |
| Accepted source-hash manifest SHA-256 | 6e5c06344132065e2693b74a7b58d9ef98b2d92059547df5a36fbc546073e135 |
| Previously used disposable-target fingerprint | e5da91b9e0f98ee89230206fd11abb633094d106eff76cef3c06a2803156e0e2; local-only, disposed after synthetic verification |

The senior acceptance closes the three runner-v2 findings for its canonical-0094 disposable-target scope only. It does not establish a source census, source authority, current system binding, B09 final disposition, or compatibility with historical TiDB schema 0065.

The source code and all accepted v2 evidence files are preserved byte-for-byte. The current read-only Authority status preflight reports the worktree's local disposable target as unreachable and its ledger/schema state as not evaluated. No database was provisioned or queried for this packet update.

The runner's read contract is fixed in code and cannot be enlarged by an authorization document. It allows aggregate queries over these 24 application tables plus two migration-control tables:

- Application: users, agencies, agents, developer_organisations, developer_organisation_memberships, catalogue_publishers, developments, development_units, development_drafts, listings, properties, propertyImages, videos, leads, lead_activities, prospect_identities, billable_accounts, subscriptions, billing_invoices, billing_payments, billing_payment_documents, billing_audit_events, audit_logs, managerial_audit_logs.
- Migration controls: sql_migration_history and sql_migration_attempts.

Schema validation reads scoped metadata from information_schema.tables, columns, statistics, key_column_usage, referential_constraints, table_constraints, and check_constraints, plus @@global.lower_case_table_names. Timeout verification may inspect only the runner's own session identifier in information_schema.processlist. It does not request global process visibility. The census result is one row of 79 allow-listed aggregate counts and ownership/relationship anomaly counts; it does not return record identifiers or personal, payment, proof, or media values. Migration-ledger verification reads the bounded ordered lineage and checksums. Database media attachment counts do not establish object-storage presence or completeness.

## Source-identification request for Edward, the data owner, and infrastructure/source owners

Please complete one row for every candidate database system that may hold launch-relevant data. Use existing configuration, service ownership records, provider control-plane metadata, backups/replication documentation, and accountable owner knowledge. Do not connect to the candidate database to fill this request. If a fact is unknown, mark it unknown rather than infer it from an old production label or fingerprint.

For each candidate, provide:

| Requested fact | Required answer |
| --- | --- |
| Current system binding | Provider and service; account/organization/project; environment; region; cluster or instance; current endpoint hostname and port; database/schema; accepted application configuration binding name or key. Do not include a credential-bearing URL or secret. |
| Source role | Explicit classification: current authoritative write source; current authoritative read source/replica; backup/archive; historical/retired; staging/test; or other with explanation. State which application and data paths use it, the source owner's name/role, as-of date, replication/failover relationship, and evidence supporting currentness and authority. |
| Exact target | Database Authority-resolved target class, sanitized identity, and fingerprint hash for the specific endpoint/database; provider account/instance identifiers sufficient to distinguish it; expected source ownership; and evidence date. A historical hash is comparison evidence only, not a current target identity. |
| Access binding | Name or non-secret identifier of the read-only principal/secret-manager binding, credential permission class, owner, rotation/version reference, and how it is bound to the exact target. Never provide a secret value, password, token, or full connection URL. No principal or grant is requested by this identification step. |
| Provenance | Evidence that records on this system originate from the stated source, relevant load/cutover/replication dates, known gaps or failed attempts, and accountable source owner. |
| Candidate decision | Keep as a candidate for separate census authorization; exclude with evidence; or defer because identity/role/provenance is unresolved. Edward remains accountable for launch data scope and final disposition. |

Current candidate records to verify—not presumed authoritative:

| Candidate | Previously recorded identity | Identification status |
| --- | --- | --- |
| Railway-bound TiDB | Instance label listify-property-canonical; instance ID 10492391619114516879; database listify_property_sa; historical fingerprint SHA-256 68f2582a6dc7af8c54cf6f31a396e8abe4c4030696c923b0ea3b1679ba6f5b5e | Current binding, source role, exact current target and provenance are unknown. Prior 2026-09-24 evidence reported head 0065_auth_verification_token_cleanup.sql, an incomplete failed attempt and schema incongruence. Runner v2 cannot read it. Historical mapping needs separate review before any proposed operation. |
| Azure MySQL | Database propertylistify_database; historical fingerprint SHA-256 b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced | B08 evidence established a 0094-shaped schema at its evidence date, not current authority or launch-data provenance. Current binding, source role, exact target and owner confirmation remain unknown. |
| Other database, identity, email/support, billing, backup or archive systems | No current exact identity or fingerprint is established in the reviewed records. | Identify only if accepted current configuration or owner evidence shows launch-relevant database records. Do not assume an old system is authoritative. |
| Storage and media providers | Intentionally not included in this database request. | Storage identification and its provider-owned listing procedure are separate prerequisites and require separate authorization. No bucket, object or media access is requested. |

## Minimum scope for a later source-specific request

If a candidate is confirmed as current and its role/provenance supports census, request a separate review binding the exact target, operation, read-only principal, reviewer, operator, query/code/scope/schema-mapping hashes, issue and expiry time, row/time limits, and output recipient.

The current runner's narrowest supported data scope is SELECT access required by its fixed query to only the 24 named application tables and SELECT on sql_migration_history and sql_migration_attempts for lineage and incomplete-attempt checks. Metadata inspection is limited to the exact selected schema and listed physical-mapping catalogs. The target must be read-only for census execution; no INSERT, UPDATE, DELETE, DDL, grant administration, migration, seed, or repair permission is requested.

Any proposed grant must be reviewed against the provider's actual privilege model. The fixed runner returns aggregates, but table-level SELECT can technically expose full columns to a different query; the source-specific reviewer must explicitly accept the principal's containment and execution controls. Do not broaden to the entire schema, global metadata, unrestricted processlist, or global administrative permissions. Timeout cleanup may terminate only the runner's own connection/query within the accepted bounded cleanup contract. If the provider cannot support that safely with the exact approved principal and scope, stop and request a separately reviewed design; do not add elevated privileges.

The runner enforces a 15-second census execution ceiling, one aggregate result row, 128 migration-ledger rows, and at most 1,500 physical-metadata rows per metadata query; it cancels timed-out server work and bounds transaction control and rollback. Exact accepted code and query/scope hashes above must be rebound in any later authorization. A different provider, schema, mapping, target, principal, query, or code identity is outside this acceptance.

## Separate reviews and stop conditions

The existing operation policy permits b09-source-census only on an exact owned disposable-worktree target with read-only or local-owner credentials. It does not permit protected, shared, staging, production, Railway, or TiDB census. This packet changes no policy and does not grant an exception. Any protected-source request requires separate review of the exact target, operation policy, implementation controls, access principal and approval window before execution.

Historical TiDB schema 0065 is unsupported by canonical-launch-0094-v2. Do not attempt a 0094 mapping, compatibility query, schema fallback, connection, or census there. A historical mapping and any policy change need separate explicit review first. Storage identification remains separate.

Stop if the source role, current binding, exact fingerprint, ownership, provenance, privilege scope, expected schema/migration lineage, timeout cancellation, or authorization is unresolved or mismatched. Preserve sanitized evidence and do not retry on another target or credential. No source connection is authorized by this request.

## B16 packet identity and update text

The referenced B16 packet snapshot is in worktree branch prep/b16-converged-candidate, with HEAD f3f99f806ea9ae6be3132e093ce1cf1a6f185a32 and staged product tree b21f454e215d8b02129e4daa14ba6f8d338406d1. The packet SHA-256 is 01879bfea040befb20ab1b5b4de7a4a8a40c2a6968e44f1c6c432a58abcbc104; its manifest SHA-256 is 1b11a62062e886904638498474b121ad01e11bf7db4fea0f1c3028314f26af7d. The B16 worktree contains another task's staged source and evidence, so it was not edited. The following text is prepared for insertion into that exact packet snapshot; it is not evidence of B16 acceptance.

For the B16 integration packet's B09 section, use this current statement:

> B09 runner v2 is senior-accepted for canonical-0094 disposable-target verification only. Accepted staged source tree: 2214802b6b18be3cf6d2ce7b957900c456462b35; runner SHA-256: b92f877daeb618ee46f1fc6c6636e577cdeca34b056e08de4e8c8c51e308d31f; query/scope SHA-256: eb12f8f58c71225575051757a59a3e3f1349aa66dcd7146a20434e5e1fa58fdb. This does not constitute the source-data census or final disposition. Current system binding, source role, exact target and minimum read-scope approval remain pending under the B09/B16 source-identification request dated 2026-09-28. Historical TiDB 0065 and protected-operation policy require separate review; storage identification is separate. B09 and B16 remain open.

This wording updates B16's understanding of B09 evidence without claiming that B09 itself has been accepted or closed. The insert text is provided for the B16 workstream to apply to its owned packet.

## Decision boundary

Edward / Founder remains accountable for approving launch data scope and final category dispositions. All 14 preliminary data dispositions remain provisional until the governed census establishes actual existence, source role, ownership, provenance, relationships, launch need, legal/accounting/security/recovery holds, and database-side media references. Unknown ownership, purpose or requirement remains deferred for explicit review. No destructive action is authorized.

No protected or historical database, cloud provider, storage provider or media object was accessed for this request. No database was provisioned, migrated, seeded or disposed during this packet update. B09, B15 and B16 remain open; no merge, deployment or production activation is authorized.
