# B09 census runner and source authorization packet — 2026-09-27

**Status: PREPARED FOR SENIOR REVIEW; SOURCE ACCESS IS NOT AUTHORIZED.** The
runner is locally verified on synthetic data in an owned disposable database.
B09's authoritative source census and final data disposition remain open. This
packet requests review of the runner and records what is still required before
any historical or protected source operation.

## Reviewed source composition

The task-owned branch is `feat/b09-db-census-runner-20260927`, based on
accepted product candidate commit
`a05868c66f493e3cbc972a119074c91a10797777`, tree
`b21f454e215d8b02129e4daa14ba6f8d338406d1`. Product runtime files from that
accepted candidate were preserved. The branch adds the B09 authority runner,
its tests, and Database Authority registration.

The runner's current identity is:

| Item | Exact value |
| --- | --- |
| Database Authority operation | `b09-source-census` |
| Scope ID | `b09-launch-data-aggregate-v1` |
| Schema mapping | `canonical-launch-0094-v1` |
| Expected migration head | `0094_content_topics_primary_key.sql` |
| Expected migration manifest digest | `93d871e6f8760477f460b8821685d71d212374eb86ddd53bc6e2ccfc30608efc` |
| Query SHA-256 | `180963587bc3db7cdc9f33807af1ed447ccdbf45e0f78d1c2518cfb34f1e0a8f` |
| Execution code SHA-256 | `4c912b78d93bb73944dc428a5ab962e1932424b3218efc86e540f38c0b5f3392` |
| Current authorization target | `e5da91b9e0f98ee89230206fd11abb633094d106eff76cef3c06a2803156e0e2` (`disposable-worktree`, exact task owner) |
| Sanitized local result | [`b09-census-runner-synthetic-verification-2026-09-27.json`](b09-census-runner-synthetic-verification-2026-09-27.json) |

The execution hash covers the runner, CLI, Database Authority context,
authorization and connection boundaries, operation and authority manifests,
connection-path inventory, package scripts and frozen dependency lock. The
separate query hash covers the static aggregate SQL, exact schema mapping,
expected head and fixed table scope. Any change to a hashed file requires a
new authorization document and a new run.

## Runner boundary and minimum scope

The operation policy permits this command only on an exact owned
`disposable-worktree`. It denies clean-main, staging, production, shared,
unknown and other target classes before connection. The current policy cannot
be used for the protected-source census requested by B09; source execution
requires a later reviewed operation-policy change and source-specific
authorization. No source access is granted here.

Before opening its connection, the command requires a short-lived authorization
document that must exactly bind the current target fingerprint and class,
credential class, approval reference and actor, operation, scope, schema
mapping, manifest head and digest, table allow-list, query and code hashes,
issue/expiry times, 15,000 ms execution ceiling and one-row result ceiling.
Unknown fields, extra tables, stale hashes, a different fingerprint, an
expired document, a different migration head, or an incomplete migration
attempt cause a fail-closed refusal. The document is not a connection URL and
contains no credentials.

The only implemented mapping is `canonical-launch-0094-v1`. Its fixed
26-table scope is:

```text
sql_migration_history, sql_migration_attempts, users, agencies, agents,
developer_organisations, developer_organisation_memberships,
catalogue_publishers, developments, development_units, development_drafts,
listings, properties, propertyImages, videos, leads, lead_activities,
prospect_identities, billable_accounts, subscriptions, billing_invoices,
billing_payments, billing_payment_documents, billing_audit_events, audit_logs,
managerial_audit_logs
```

Execution uses three fixed bounded reads inside a read-only transaction: verify
the exact migration-ledger head, count incomplete migration attempts, and run
one static aggregate query. Each query receives the remaining portion of a
15-second total budget. The final query returns exactly one row containing 77
allow-listed nonnegative counts. Extra columns, result rows, or unsupported
shapes are rejected. It does not enumerate the schema, use `information_schema`,
accept SQL or identifiers from callers, return record IDs, or fall back to
legacy tables. It does not call or re-enable the historical B08 inventory or
assessment commands.

The result includes account-role and organisation membership totals,
publication/listing/development counts, lead assignment and parent-link
anomalies, billable-account/subscription/invoice/payment/payment-document
ownership anomalies, audit actor links, and database media attachment
relationships. It does not select contact details, names, messages, invoice
numbers, proof data, storage keys, filenames, media URLs or contents.

The synthetic verification used Database Authority's `local-owner` credential
on the disposable worktree target, with a read-only transaction and static
`SELECT` statements. This is local-fixture authority, not evidence of a
least-privileged hosted identity. Any future source execution must use a
source-specific principal limited to `SELECT` on only the reviewed table
scope; it must not use application-runtime, migrator, provider-admin, or broad
account credentials. The authorized operator, source-specific expiry and
approval reference must be recorded per exact source before that operation.

## Candidate source systems and provenance

Existing records identify candidates, not authoritative B09 sources. The
historical fingerprints below are comparison evidence only; the command must
re-resolve and verify any future exact target under a new authorization.

| Candidate | Exact identity in prior records | Provenance and unresolved requirement |
| --- | --- | --- |
| Railway-bound TiDB — historical primary DB-source candidate | TiDB Cloud instance `listify-property-canonical`, instance `10492391619114516879`, database `listify_property_sa`; fingerprint SHA-256 `68f2582a6dc7af8c54cf6f31a396e8abe4c4030696c923b0ea3b1679ba6f5b5e` | B08 read-only evidence from 2026-09-24 records 218 tables, a 66-migration head at `0065_auth_verification_token_cleanup.sql`, an incomplete failed attempt and schema incongruence. It does not prove that TiDB remains an authoritative current source or classify its records. Current fingerprint/binding, owner confirmation and explicit review of any historical mapping are required. Evidence: `b08-tidb-v1-candidate-2026-09-24.json`, SHA-256 `cccbf6cf71f01ac51e88ec39f6137c99c29f0e18345404a12c12ac43a6f94e83`. |
| Azure MySQL — established target, source role not established | Database `propertylistify_database`; fingerprint SHA-256 `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced` | B08 records canonical head `0094_content_topics_primary_key.sql` and schema congruency on 2026-09-24. This establishes the target's schema at that time, not that it holds current launch data or is an authoritative source. Current role, binding and data ownership require evidence. Evidence: `b08-azure-establishment-2026-09-24.json`, SHA-256 `5bffb40e970d38557dd4fa007a5afe5076b66ed1958cc9b960f1d37749c0a8ae`. |
| AWS/S3-compatible public media | Exact current account, bucket, region, prefix and binding are not present in sanitized evidence. | B11's historical account-level metadata observation from 2026-09-24 found one public-media bucket and no separate private payment-proof bucket, but did not inspect objects. It is not a current identity or storage census. Storage identification, exact bucket/prefix authorization and a separate supported listing procedure are still required. Evidence: `b11-private-proof-readiness-2026-09-24.md`, SHA-256 `c240536742238e1fe96cbb79cf5ac9c16f678e82d3e070e50385de07b7ee2c45`. |
| Other identity, email/support, backup/archive, billing or provider systems | No current exact source identity or fingerprint established in reviewed records. | Identify each system from the accepted current production configuration and verify its provenance. Do not infer authority from historical use or configuration names. |

Founder input names Edward / Founder as accountable data owner and supplies
preliminary dispositions for 14 categories. The founder's dispositions remain
preliminary until a governed source census verifies what exists, provenance,
ownership, continuing purpose and obligations. The accepted input record has
SHA-256 `71419a969e6452dbe7d9ea42aa0f0dbb00c675a1781f76decb8256a1014045e2`.
The earlier authorization-preparation packet has SHA-256
`aaea4f53b3fd518b230d16289deb41d0685bfa39bf5593b76ed8e2884c9406bd`; this
packet supersedes only its missing-runner statement. It does not authorize
sources or resolve the preliminary dispositions.

The packet and sanitized synthetic verification checksums are listed in
[`b09-census-runner-sha256-2026-09-27.txt`](b09-census-runner-sha256-2026-09-27.txt).

## Local verification and limits

The runner was exercised on a governed, disposable database created and
migrated by the canonical Database Authority workflow. Canonical geography,
launch foundation and search-to-lead synthetic fixtures were prepared and
verified. The successful report contains 77 aggregate metrics; it includes
synthetic users, organisations, listings, a published development, enquiries
and billing-account relationships, with zero reported broken links in those
relationships. The final run completed in 24 ms, below the 15-second cap.

Focused B09 tests pass 16/16. They cover exact-target/scope/hash/time checks,
unsupported target/schema mappings, extra fields and rows, output sanitization,
bounded integer timeouts, migration-head and incomplete-attempt stops, and
suppression of database error contents. CLI checks for an injected retired
table, expired authorization and different target fingerprint each exited 1
before opening the connection. `pnpm check` and `pnpm db:authority:check` pass;
the latter reports 327/327 static tests, 120 classified database utility
surfaces, canonical schema sanity and lifecycle checks.

Three local runner defects were reproduced and corrected before the passing
run: transaction-control statements sent through prepared execution were
unsupported; the monotonic clock could leave a fractional timeout; and the
physical lead assignment column is `assigned_to`. Each was fixed without
changing the accepted product runtime or introducing schema fallbacks.

The local metrics do not prove production provenance, classify real versus
test records, determine per-record ownership, produce final disposition counts,
or supply age bands/retention holds. The media figures cover database
attachments only; object presence, missing/unreferenced objects, and private
proof storage remain unverified. The run used synthetic data and the
task-local credential; it is not the protected source census required to
close B09.

## Required next authorizations and stop conditions

Before any source query, Edward / Founder must confirm which candidate systems
remain current, their authoritative role, the data purpose and the exact
launch categories. Database Authority must then bind a reviewed command/code
and query hash to each newly resolved exact target, scope, read-only principal,
approval reference/actor, operator, window/expiry and output location. The
current operation policy denies protected targets. A historical schema such
as the recorded TiDB head at `0065` must receive explicit schema-mapping review
and a separate code/policy change before execution; do not use the current
0094 mapping by assumption. No storage access is permitted until the object
source identity and provider-owned listing procedure are separately reviewed.

Stop and preserve sanitized evidence on target/fingerprint mismatch, absent or
expired approval, changed query/code/scope, unsupported head or schema,
incomplete migration attempts, query timeout, unexpected result shape, or an
unexpected provider/authority effect. Do not retry on another target,
credential, historical schema or provider. Do not export rows or object lists,
transfer/archive data, mutate source records, or execute any preliminary
disposition.

No historical/protected source or storage provider was accessed. After the
synthetic run, the exact target became unreachable while its local Authority
service was still available. The governed service-stop command then reported a
clean shutdown through the exact Unix socket; recovery was a safe no-op, and
the final service status is stopped. See the sanitized verification record for
the target fingerprint and exact cleanup commands. B09, B15 and B16 remain
open. This is preparation for senior review, not approval to execute the source
census.
