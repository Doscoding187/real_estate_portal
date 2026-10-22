# B09 read-only census authorization packet — runner v2

**Prepared:** 2026-09-27
**Status:** runner verified on a governed disposable target; source identification, source-specific authorization, census and final disposition remain open.

This packet updates the local runner contract and verification evidence from the earlier v1 packet. The v1 packet and report remain unchanged as historical evidence. No historical/protected database or storage source was accessed. This packet is not approval to connect to a source, export records, transfer or archive data, or delete data.

## Current runner contract

The B09 runner supports only the canonical MySQL `0094_content_topics_primary_key.sql` model. The exact local synthetic verification used:

| Item                                 | Identity                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| B09 worktree branch                  | `feat/b09-db-census-runner-20260927`                                                               |
| Base commit / tree                   | `a05868c66f493e3cbc972a119074c91a10797777` / `b21f454e215d8b02129e4daa14ba6f8d338406d1`            |
| Accepted product candidate tree      | `b21f454e215d8b02129e4daa14ba6f8d338406d1`                                                         |
| Changed source-file manifest SHA-256 | `36056244f3fc27b697647f307a13cea14816910a18c1a18911dfd71a3df61f4b`                                 |
| Runner code SHA-256                  | `b92f877daeb618ee46f1fc6c6636e577cdeca34b056e08de4e8c8c51e308d31f`                                 |
| Query/scope SHA-256                  | `eb12f8f58c71225575051757a59a3e3f1349aa66dcd7146a20434e5e1fa58fdb`                                 |
| Scope / schema mapping               | `b09-launch-data-aggregate-v2` / `canonical-launch-0094-v2`                                        |
| Disposable target fingerprint        | `e5da91b9e0f98ee89230206fd11abb633094d106eff76cef3c06a2803156e0e2`                                 |
| Local Authority service fingerprint  | `2425e54d0472ee5b308127a7c63380733f077ec7531767d6dba21a2c2a9177f2`                                 |
| Result                               | exact owned `disposable-worktree`; target was created for this run and disposed after verification |

The read scope is 24 canonical application tables plus the two migration-control ledgers. The runner checks the entire ordered migration ledger prefix, including each sequence, filename and checksum; verifies there are no incomplete migration attempts; and compares physical table, column, index, foreign-key and check-constraint metadata for the exact 24-table scope against the corresponding canonical Drizzle model before running any census count. A matching `0094` head by itself is not sufficient. Unknown table/schema mappings, ledger gaps, duplicates, checksum drift, unsupported providers and incomplete attempts are refused before aggregate counts.

The single aggregate query returns 79 allow-listed nonnegative counts in one result row. It reports role and organisation relationships; development publication, units and publisher relationships; listing/property ownership; enquiry relationships and assignments; billing-account ownership, subscription, invoice, payment, private payment-document and billing-audit relationships; general audit actors; and database media attachment references. Billing checks compare each payment with its linked invoice account/owner/subscription and check corresponding invoice, private document and audit-event links. It returns no row identifiers, contact details, messages, invoice numbers, proof values, storage keys, filenames, media URLs or media contents.

Each census SELECT shares a 15-second execution budget. The MySQL session receives a server-side `MAX_EXECUTION_TIME` limit and a client deadline. On client deadline the runner opens a second connection to the same exact target, kills only its own query session, waits up to 3 seconds for query settlement, and destroys the client socket. Transaction control is bounded to 1 second; rollback cleanup is bounded to 1 second. If server termination or cleanup cannot be confirmed, the runner fails closed and requires preserving the disposable target for review. Census output is one aggregate row; migration ledger rows are capped at 128 and physical metadata at 1,500 rows per metadata query.

The B09 authorization document binds the exact target fingerprint/class, local credential class, query/code hashes, scope, mapping, manifest digest, reviewer string, issue/expiry window, row ceilings, and execution/cancellation/rollback limits. The local authorization file was mode `0600`, SHA-256 `a2cc463c037cf7f371c648f8d26b5bafb4112a3a13e5b345bb0b6dc811d4f58e`, and was removed after the disposable run. Its approval reference was explicitly limited to user-authorized local synthetic verification.

## Local verification on the disposable target

The canonical Database Authority workflow created a fresh target under the exact worktree ownership key, applied the complete 95-migration manifest from an empty ledger through `0094_content_topics_primary_key.sql`, and verified schema congruency before fixtures. Canonical geography, launch-foundation and search-to-lead fixtures passed. The runner then verified all 95 ordered ledger rows and checksums, physical mapping, and returned 79 aggregate metrics in 105 ms after billing-fixture rollback.

The timeout negative case ran the fixed synthetic `SELECT SLEEP(30)` probe with a 200 ms deadline. It completed cancellation in 211 ms, confirmed the timed-out server session was no longer present (`activeSessionCount = 0`), and confirmed that connection termination released the read-only transaction. The cancellation cleanup cap was 3 seconds.

The billing negative case inserted two synthetic invoices, a payment, a private payment-document row, and an audit event inside a bounded disposable-target transaction. One invoice intentionally linked account A to account B's subscription; the payment, document and audit event intentionally crossed the invoice/account boundary. Each of the invoice, payment, document and audit-event ownership-anomaly metrics increased by one. The transaction rolled back in 48 ms. A subsequent census returned zero invoice, payment, document and billing-audit rows and zero corresponding anomaly counts.

For the unchanged-head/invalid-physical-mapping case, the focused unit suite supplied the exact full 95-row ledger ending at `0094`, then returned synthetic `information_schema` metadata with the approved physical table mapping absent. The runner rejected the mapping before issuing the aggregate count query. This negative case is mocked metadata; no manual DDL was used because Database Authority prohibits manual schema mutation.

`pnpm install --frozen-lockfile`, `pnpm check`, the 37-file/337-test `pnpm db:authority:check` gate and the focused B09/schema suite (47/47) passed. The runner and complete sanitized results, source-file hashes, test counts and cleanup evidence are in [`b09-census-runner-synthetic-verification-2026-09-27-v2.json`](b09-census-runner-synthetic-verification-2026-09-27-v2.json). Source-file checksums are in [`b09-census-runner-source-sha256-2026-09-27-v2.txt`](b09-census-runner-source-sha256-2026-09-27-v2.txt); the v2 checksum sidecar is [`b09-census-runner-sha256-2026-09-27-v2.txt`](b09-census-runner-sha256-2026-09-27-v2.txt).

The local search-to-lead verifier used an in-memory Redis fallback, mock/log email delivery to `invalid.example`, and a local listing-media adapter. Those substitutes do not establish hosted-provider readiness. No external storage provider was configured or inspected. The media figures cover database attachment relationships only, not object presence, orphaned objects or private-proof storage.

## Candidate source systems and evidence still needed

Prior records identify possible systems, not verified current authoritative sources. Their old fingerprints are comparison evidence only and do not authorize a new connection.

| Candidate                                                            | Previously recorded identity                                                                                                                                                                                 | Provenance and outstanding verification                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Railway-bound TiDB                                                   | Instance `listify-property-canonical`, instance ID `10492391619114516879`, database `listify_property_sa`; historical fingerprint SHA-256 `68f2582a6dc7af8c54cf6f31a396e8abe4c4030696c923b0ea3b1679ba6f5b5e` | B08 evidence from 2026-09-24 described 218 tables, migration head `0065_auth_verification_token_cleanup.sql`, an incomplete failed attempt and schema incongruence. This does not establish current authority or record classification. Source role, current exact binding, provenance, owner and a separate historical-schema mapping review are missing. Comparison evidence: `b08-tidb-v1-candidate-2026-09-24.json`, SHA-256 `cccbf6cf71f01ac51e88ec39f6137c99c29f0e18345404a12c12ac43a6f94e83`. |
| Azure MySQL                                                          | Database `propertylistify_database`; historical fingerprint SHA-256 `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`                                                                       | B08 evidence from 2026-09-24 established the 0094 schema at that time, not that the database currently holds launch-relevant authoritative data. Confirm current source role, binding, owner and data provenance. Comparison evidence: `b08-azure-establishment-2026-09-24.json`, SHA-256 `5bffb40e970d38557dd4fa007a5afe5076b66ed1958cc9b960f1d37749c0a8ae`.                                                                                                                                        |
| AWS/S3-compatible media                                              | Current account, bucket, region, prefix and binding are unknown.                                                                                                                                             | B11's 2026-09-24 account-level metadata observation noted one public-media bucket and no separate private payment-proof bucket; no object listing was performed. Identify the accepted current provider configuration and exact object scope. Obtain separate review of a provider-owned listing procedure and authorization before storage access. Comparison evidence: `b11-private-proof-readiness-2026-09-24.md`, SHA-256 `c240536742238e1fe96cbb79cf5ac9c16f678e82d3e070e50385de07b7ee2c45`.    |
| Identity, email/support, billing, backup/archive and other providers | No current exact source identity or fingerprint is established in reviewed evidence.                                                                                                                         | Identify each system from accepted current production configuration and verify its actual source role and data provenance with its owner.                                                                                                                                                                                                                                                                                                                                                            |

Before any source operation, Edward / Founder must confirm which candidates remain current and authoritative and which data categories are launch-relevant. A separate source-specific Database Authority review must bind a current exact target identity/fingerprint, approved read scope, operator, source-specific SELECT-only principal, query/code/manifest hashes, approval reference, reviewer, execution window and expiry. The required metadata access and the output recipient must be explicit. The current operation policy refuses protected targets; a protected-source census needs separately reviewed policy and implementation authorization. A historical TiDB schema at `0065` is unsupported by this runner and must not be queried using the 0094 mapping.

The census is bounded to aggregate counts and defined ownership/relationship anomalies over the approved tables. No source row export, record-level classification, media-object listing, transfer, archival execution or deletion is part of this request. Source systems that are absent, ambiguous, drifted, timed out, outside the approved scope, or not owned as expected must be left untouched while sanitized evidence is preserved.

## Data-owner input and unresolved disposition

Edward / Founder is the accountable data owner for approving what is transferred, retained, archived, disposed of or deferred. The founder-supplied 14-category disposition remains preliminary:

1. Founder/admin identity and required company configuration — retain or transfer where required for launch authority.
2. Legitimate Agent, Agency/member and Developer accounts — transfer only where the census establishes each record is real, current and required.
3. Historical test, demo, synthetic or disposable identities — dispose unless a specific accepted test/evidence requirement requires preservation.
4. Legitimate production-quality listings/developments intended to survive launch — transfer where verified as current and required.
5. Test/sample/synthetic listings or developments — dispose.
6. Real customer enquiries/leads with continuing operational value or obligations — retain or transfer.
7. Synthetic/test enquiries and leads — dispose.
8. Real commercial/payment/invoice/proof records — retain, and transfer or archive according to applicable accounting, audit and legal retention requirements.
9. Test/synthetic payment, invoice and proof records — dispose unless required as retained engineering/audit evidence.
10. Audit/security/history records with continuing evidentiary, compliance or recovery value — retain through transfer or archive according to census findings and launch requirements.
11. Session, cache, temporary, disposable test and transient technical data — dispose unless required by an accepted operational dependency.
12. Media/files belonging to retained legitimate records — transfer with their authoritative parent records.
13. Orphaned, synthetic or disposable test media — dispose.
14. Data whose ownership, purpose, provenance or continuing requirement cannot be established from the census — defer pending explicit review rather than guess.

These are preliminary founder dispositions only. They do not authorize source access or destructive action.

The governed census must establish the actual source systems, records present, provenance and ownership, relationships, launch need, legal/accounting/security/recovery holds, and media completeness. Edward must then approve the final category counts and disposition against that evidence. B09 census and disposition remain open; B15 and B16 remain open.

## Stop conditions and current authorization boundary

Stop and preserve sanitized evidence on target/fingerprint mismatch, missing or expired approval, changed query/code/scope/manifest, unsupported provider/head/mapping, ledger checksum or physical-schema mismatch, incomplete migration attempts, exceeded row/time bounds, unexpected result shape, query timeout, unconfirmed query termination, rollback/control cleanup failure, or any unexpected Database Authority result. Do not retry against another target, credential, schema, historical source or provider.

No protected or historical database, TiDB instance, cloud provider, object store or media storage was accessed in this verification. The only target was the exact local disposable worktree database identified above. It was disposed through Database Authority, its ownership profile was removed, the target became unreachable while the local service was available, and the local service was stopped and recovered as a safe no-op. No production, staging, hosted ingress, proxy, outage, merge or deployment claim follows from these local results.
