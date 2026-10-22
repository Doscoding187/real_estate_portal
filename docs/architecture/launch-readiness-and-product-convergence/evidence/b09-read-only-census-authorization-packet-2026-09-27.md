# B09 read-only source census authorization request — 2026-09-27

**Status: PREPARED FOR EDWARD / DATABASE AUTHORITY REVIEW; NOT AN
AUTHORIZATION.** B09's source census and final data disposition remain open.
This packet requests a narrowly bounded read-only census. It grants no
connection, provider access, export, transfer, archive, retention execution,
record mutation, or deletion.

## Decision requested

Edward / Founder is the accountable data owner for Property Listify (Pty) Ltd.
Before any source access, Edward must authorize each exact source and census
purpose in writing. For database sources, Database Authority must independently
bind an approved read-only operation to the current exact target fingerprint,
approved command and code/query hashes, least-privilege principal, output
limits, and expiry. For object storage or other providers, the owning
security/provider authority must approve the corresponding exact read-only
operation and scope. These approvals are separate prerequisites.

The repository has no supported B09 census command in its Database Authority
contract. `pnpm db:target` is a guarded read-only target diagnostic, not a
record census. Prior `db:b08:tidb-v1:*` inventory/assessment work is historical
investigative evidence and is not a supported operational command under
`docs/database-authority/residual-utility-authority.json`. Do not revive or
re-run those historical commands. Database Authority must identify or register
a supported, purpose-bound aggregate census runner before source queries can
be authorized. Do not substitute hand-written SQL or infer schema variants.

## Candidate systems and provenance

| Candidate / role | Exact identity known from existing evidence | Provenance and limits | Required before access |
| --- | --- | --- | --- |
| Railway Production-bound TiDB database — **primary database-source candidate; authority not established for B09** | TiDB Cloud instance `listify-property-canonical`, instance ID `10492391619114516879`, region `AWS Tokyo (ap-northeast-1)`, database `listify_property_sa`; historical target fingerprint SHA-256 `68f2582a6dc7af8c54cf6f31a396e8abe4c4030696c923b0ea3b1679ba6f5b5e`, observed 2026-09-24. Railway binding recorded as project `8cdd7515-ddd2-4252-bbee-df5a5c209d4b`, environment `63070d99-357a-40ba-99c3-6d1368f61652`, service `db88a720-2d1f-4afc-a3a8-6228b6b08d3e`. | B08 records TiDB as the unchanged Railway database and rollback/evidence source; the owner-supplied instance identity matched the Railway binding. B08's historical reader inventory observed 218 tables, 7 non-empty tables and 152 rows, with 15 classified there as application rows. That snapshot is not the B09 census, may be stale, does not classify ownership or purpose, and found a behind/incongruent schema. An earlier supplied admin identity did not match the Railway cluster and was rejected; do not reuse it. | Edward must confirm this remains a source in current accepted production configuration. Database Authority must re-resolve identity and fingerprint under a fresh exact-target approval; the old fingerprint is a comparison value only. Provide an approved read-only principal and runner. No current authorization is present. |
| Configured S3-compatible/AWS public media bucket — **candidate for listing/development media only; exact bucket unresolved** | Existing B11 record deliberately withheld bucket name, ARN and object keys. Exact account, region, bucket identity, prefix and current binding are not available in the sanitized record. | B11's 2026-09-24 historical `ListBuckets` / `GetBucketLocation` observation found one bucket, the configured public-media bucket, and no distinct private payment-proof bucket. It did not inspect objects. Production private proof storage was not configured in that evidence. This neither proves present configuration nor identifies media ownership/completeness. | Edward/provider owner must supply accepted-config provenance and exact bucket ARN/name, region, allowed prefix, and current binding. The owning security/provider authority must approve an exact bucket-scoped listing principal and operation. No account-wide discovery, object reads, or bucket mutation. |
| Azure MySQL — **established database target; not evidenced as current B09 source** | Sanitized target fingerprint SHA-256 `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`; selected database `propertylistify_database`; established head `0094_content_topics_primary_key.sql` as of 2026-09-24. | B08 evidence establishes Azure and its schema. The founder spend gate explicitly deferred Railway cutover and preserved TiDB as current Railway database. The Azure fingerprint and schema head do not establish that Azure holds the current launch data. | Exclude from source census unless current accepted configuration or source-specific evidence shows an authorized writer/data source there and Edward separately authorizes it. Do not treat it as a fallback source. |
| Other payment, identity, support/email, backup/archive or provider stores — **unresolved; not yet identified as source systems** | No exact provider/resource identifiers or fingerprints are established in the records reviewed for this packet. | Current accepted provider configuration has not been inspected for B09. B11 documents missing private proof storage; B12 diagnostic evidence does not inspect provider configuration or databases. | Edward and each relevant provider owner must identify sources and provenance from the accepted configuration/inventory. Add each as a separate exact target and authorization line before access. |

The current local preflight is separate from all source candidates. Its sanitized
evidence is
[`b09-database-authority-preflight-2026-09-27.json`](b09-database-authority-preflight-2026-09-27.json): the target is an exact-owned disposable worktree identity, but its service is unreachable and its ledger/schema are unevaluated. It is not a source inventory and no database was provisioned.

## Governed command and permission envelope

The local preflight already completed successfully after the repository-pinned
install:

```sh
pnpm install --frozen-lockfile
pnpm db:authority:status
```

For a future protected-source operation, first use the Database Authority
entry's preflight sequence in the exact authorized process context:

```sh
pnpm db:authority:status
pnpm db:authority:manifest
pnpm db:authority:context
```

Those commands must resolve the approved source fingerprint, exact target
class, operation, and read-only credential class without printing credentials
or a complete connection URL. If context does not match the authorization,
stop. `pnpm db:target` may only be used if the exact protected `read-only-connect`
operation and target are explicitly approved; it verifies connectivity and
identity and does not perform the census.

Database Authority must provide the supported B09 aggregate census command
and the reviewed schema-to-category mapping before any counts are queried.
The authorization record must bind the executable path/version/hash and query
bundle hash to the exact source fingerprint. Use catalog visibility only for
the approved schema, then `SELECT` on only the reviewed census tables. Deny
`INSERT`, `UPDATE`, `DELETE`, DDL, `GRANT`, account administration, file access,
procedures, and migration/ledger mutation. Do not use provider administrator,
application-runtime, migrator, or broad account-wide credentials.

For object storage, use only a provider-approved, bucket-scoped listing path
for the approved prefix, sufficient to compare referenced object existence
and aggregate size/count. The specific supported command/client and code hash
must be supplied by the storage authority; do not improvise SDK calls. Do not
grant `GetObject`, put, delete, ACL, policy, versioning, or account-wide
listing unless a separately reviewed requirement and authorization explicitly
adds it. This packet requests no file content inspection.

## Bounded census scope and required results

The census is limited to aggregate counts and relationship/completeness
statistics for Edward's 14 preliminary categories in
[`b09-founder-data-scope-preliminary-dispositions-2026-09-27.md`](b09-founder-data-scope-preliminary-dispositions-2026-09-27.md).
Do not return row-level records. Use the canonical model and exact source
schema; first report any schema/model mismatch for review instead of guessing
or reading alternate legacy shapes.

Report, by source and observed snapshot time:

- table/object totals and row/object counts for the in-scope categories;
- counts grouped by supported account/record type, status and explicit
  test/demo/synthetic provenance markers, with an **unclassified** bucket
  where evidence does not support real/test classification;
- account-to-role/profile and account-to-organisation/member ownership
  relationship counts, including missing, duplicate and cross-owner links;
- listings/developments grouped by owner/organisation, publication/status and
  parent relationships;
- enquiries/leads grouped by owning organisation/recipient, linked listing or
  development, assignment/follow-up/history state, and missing-parent or
  inconsistent-owner counts;
- canonical billing invoices, payments, payment-document/proof metadata and
  audit/provider-event totals by billable-account owner, status and date band;
  report legacy billing families separately and do not infer conversion from
  table names;
- audit, security/history, session, cache, temporary and transient class
  counts by category and coarse age band, with legal/operational holds marked
  unknown until verified;
- media pointer counts for retained-candidate parents, matching object count,
  missing objects, duplicate pointers, unreferenced objects, and pointers with
  absent/ambiguous parent ownership. Compare approved object-key listings
  transiently in memory; evidence output contains aggregate counts only; and
- per-category retain/transfer/archive/dispose/defer proposal counts, the
  provenance basis, unresolved count, required obligation and confidence.

No test-versus-real classification may rely on age, naming, or appearance
alone. The report must show the evidence rule and unresolved count. Media
completeness can be called verified only for an identified source snapshot and
approved prefix; if comparable DB/object observations cannot be established,
label the result provisional and stop short of an orphan disposition.

## Sanitization and evidence retention

Retain the command and code/query hashes, Database Authority plan/context and
sanitized result, exact source fingerprint, approval scope and expiry, query
start/end and snapshot marker, group counts, relationship findings, and all
stop-condition events. Evidence may contain provider/system names and approved
fingerprint hashes but must not contain credentials, connection URLs, tokens,
raw personal information, raw user/organisation IDs, invoice numbers, payment
proofs, object keys, file names, message bodies, or media contents.

Do not write source rows, result dumps, object lists or temporary exports to
the worktree or other local storage. Aggregate in the authorized process. If
stable linkage is essential, obtain a separately approved protected
pseudonymization method before the census; otherwise emit only totals. Keep
sanitized evidence in the governed B09 evidence location and record its
checksums in the B16 manifest and B15 facts register.

## Stop conditions

Stop immediately, preserve sanitized output/state and notify the authority
owner if any of these occurs:

- source-specific written authorization or exact fingerprint is absent,
  expired, or disagrees with the live target;
- source provenance/current binding cannot be verified, credentials resolve
  to an unexpected cluster/account, or an Azure/TiDB source classification
  conflicts with current owner evidence;
- the operation requests or exposes broader grants, row-level results,
  unexpected PII, object contents, or any write/mutation capability;
- the approved census command, code/query hash, schema mapping, scope, snapshot
  behavior, timeout, or sanitized output contract is missing or changes;
- schema/lineage differs from the approved model, a category cannot be mapped
  without guessing, query cost/runtime exceeds its approved bound, or results
  suggest corruption or inconsistent ownership;
- object listing reveals an unapproved bucket/prefix or cannot be safely
  reconciled without object reads or local export; or
- any mutation, export, transfer, archive, deletion, or unexpected provider
  side effect is observed.

Do not retry against another host, credential, database, bucket or schema and
do not clean up or repair source data. Preserve only the allowed sanitized
failure evidence.

## Authorization fields still required

Before execution, complete one row per exact source with: accountable approver;
source provider/project/resource and provenance evidence; exact current target
fingerprint; target class; purpose and categories; reviewed supported command,
executable and query hashes; snapshot/cutoff and maximum run time; minimum
principal and grants; result fields and sanitization; authorized operator;
start/end window and expiry; output location; and explicit confirmation that
the request authorizes **read-only aggregate census only**, not export or any
disposition action.

Current status: these source-specific approvals, the supported B09 database
census runner, and any supported provider-scoped media listing path are **not
supplied**. B09 census and final Edward-approved disposition remain open. B15 retention wording remains unreconciled pending accepted census
evidence. No source access, export, transfer, archive, retention execution,
record change, deletion or database provisioning occurred for this request.
