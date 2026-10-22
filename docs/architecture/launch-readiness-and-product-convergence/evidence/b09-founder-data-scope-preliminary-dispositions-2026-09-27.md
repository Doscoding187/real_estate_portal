# B09 founder data-scope input and preliminary dispositions — 2026-09-27

**Status: PRELIMINARY FOUNDER INPUT RECORDED; B09 SOURCE CENSUS AND FINAL
DISPOSITION OPEN.** This record preserves Edward's direction. It is not a
source census, does not identify any verified authoritative system, and does
not authorize data access, transfer, archive, retention execution, or disposal.

## Accountable owner

**Edward / Founder — Property Listify (Pty) Ltd.** Edward is accountable for
approving which source data is transferred, retained, archived, disposed of,
or deferred for the Paid MVP launch.

## Source authority boundary

No historical database, storage account, provider, or prior production system
is authoritative merely because it was previously used or described as
production. The governed B09 census must identify and verify actual source
systems and their launch-relevant data from current, source-specific evidence.
Potential prior production database, storage, and provider systems may be
evaluated only on such evidence; no candidate is presumed authoritative.

Before census execution, obtain the required source-specific **read-only
Database Authority authorization** and use the exact authorized source and
read scope. Do not access TiDB or another historical source based only on prior
identification. No such source-specific authorization is present in the
founder input recorded here. No historical source was accessed for this
preparation.

The first local preflight attempt on 2026-09-27 exited 1 before the authority
script ran because `tsx` was unavailable and worktree `node_modules` was
missing. That historical tooling failure resolved after the pinned install
recorded below; it did not resolve or authorize any source system.

## Toolchain and local authority preflight follow-up — 2026-09-27

`pnpm install --frozen-lockfile` completed with exit code 0 and no lockfile
change. The repository-pinned `tsx` is 4.21.0. A subsequent
`pnpm db:authority:status` completed with exit code 0. It resolved only this
registered worktree's exact-owned `disposable-worktree` target, fingerprint
SHA-256 `339d7923f89f6571fba282918d80f0ca30efbaf943a9f2d98bccc8a128d5e3a1`,
against manifest digest
`93d871e6f8760477f460b8821685d71d212374eb86ddd53bc6e2ccfc30608efc` and
expected head `0094_content_topics_primary_key.sql`. Its local database
service was `database-unreachable` (service fingerprint
`2425e54d0472ee5b308127a7c63380733f077ec7531767d6dba21a2c2a9177f2`), so
ledger, attempts, schema, and data checks were not evaluated. No database was
provisioned or started. No historical/protected source connection, source
query, provider access, or mutation was attempted.

This local preflight is tooling evidence only. It is not a B09 source check or
authorization. See the sanitized record
[`b09-database-authority-preflight-2026-09-27.json`](b09-database-authority-preflight-2026-09-27.json)
and the bounded request
[`b09-read-only-census-authorization-packet-2026-09-27.md`](b09-read-only-census-authorization-packet-2026-09-27.md).
The packet records candidate provenance, exact historical fingerprints where
available, unresolved identities, the missing supported census runner, and
the approval and scope required before any source access.

## Preliminary founder dispositions

All dispositions below are **preliminary**. They guide census classification
and require source-specific evidence plus Edward's final approval. They are
not an instruction to mutate any source, target, or archive.

| Data category | Preliminary disposition | Census condition / limit |
| --- | --- | --- |
| Founder/admin identity and required company configuration | RETAIN / TRANSFER where required for launch authority | Verify identity, current source, provenance, and which configuration is required for launch authority. |
| Legitimate Agent, Agency/member and Developer accounts required for launch | TRANSFER only where verified real, current, and required | Establish record provenance, current status, ownership, and launch need. |
| Historical test, demo, synthetic, or disposable identities | DISPOSE unless a specific accepted test/evidence requirement requires preservation | Distinguish synthetic/test records from real accounts using evidence; preserve only an identified accepted evidence requirement. |
| Legitimate production-quality listings/developments intended to survive launch | TRANSFER where verified current and required | Verify owner, provenance, publication/operational status, and launch requirement. |
| Test/sample/synthetic listings or developments | DISPOSE | Identify as test/sample/synthetic from source evidence. |
| Real customer enquiries/leads with continuing operational value or obligations | RETAIN / TRANSFER | Verify real origin, recipient/custody, unresolved follow-up, and continuing obligations. |
| Synthetic/test enquiries and leads | DISPOSE | Identify synthetic/test origin; do not infer from age or appearance alone. |
| Real commercial/payment/invoice/proof records | RETAIN and TRANSFER or ARCHIVE under applicable accounting, audit, and legal retention requirements | Verify real transaction, source lineage, applicable hold/retention requirement, and required destination or archive. |
| Test/synthetic payment, invoice, and proof records | DISPOSE unless required as retained engineering/audit evidence | Identify any accepted evidence requirement before proposing disposition. |
| Audit/security/history records with continuing evidentiary, compliance, or recovery value | RETAIN through TRANSFER or ARCHIVE as census and launch requirements determine | Establish evidence, compliance, or recovery purpose and the applicable retention basis. |
| Session, cache, temporary, disposable test, and transient technical data | DISPOSE unless required by an accepted operational dependency | Verify data class and whether a specific accepted dependency requires it. |
| Media/files belonging to retained legitimate records | TRANSFER with their authoritative parent records | Verify ownership, provenance, parent-record relationship, and completeness. |
| Orphaned, synthetic, or disposable test media | DISPOSE | Verify orphan/test status; do not classify media as orphaned until parent searches are authorized and complete. |
| Data whose ownership, purpose, provenance, or continuing requirement cannot be established | DEFER pending explicit review | Do not guess; identify the uncertainty and obtain Edward's explicit decision. |

## Required governed census evidence

Before proposing a final transfer/retain/archive/dispose/defer plan, the
source-specific, authorized read-only census must establish:

- what launch-relevant data actually exists and where it exists;
- the identity and authority of each actual source system, verified from
  current source-specific evidence rather than historical assumption;
- provenance, ownership, current/real versus test/synthetic status, purpose,
  and continuing launch requirement for the records in scope;
- applicable accounting, legal-retention, customer-support, security,
  evidentiary, and recovery obligations;
- parent relationships and completeness for media belonging to retained
  records, including evidence before classifying anything as orphaned; and
- an evidence-backed proposed disposition for each in-scope class and each
  excluded/deferred class for Edward's explicit final approval.

The detailed category-level retention and disposal schedule used by B15 must
then be reconciled to this accepted census so that customer disclosures match
data Property Listify actually holds.

## Authorization and action limits

- Census status: **NOT EXECUTED**.
- Source-specific read-only Database Authority authorization: **NOT PROVIDED /
  REQUIRED BEFORE EXECUTION**.
- `pnpm install --frozen-lockfile`: exit 0; `pnpm db:authority:status`: exit
  0 for the local disposable worktree target only. Sanitized evidence is
  [`b09-database-authority-preflight-2026-09-27.json`](b09-database-authority-preflight-2026-09-27.json).
- Source-specific authorization: **NOT PROVIDED**. Census runner: **NOT
  IDENTIFIED / REQUIRED**. The read-only request is
  [`b09-read-only-census-authorization-packet-2026-09-27.md`](b09-read-only-census-authorization-packet-2026-09-27.md).
- Historical source access, source connections, census queries, provider
  access, exports, transfers, archives, record changes, and deletions: **NOT
  PERFORMED**.
- Destructive action: **NOT AUTHORIZED** by these preliminary dispositions.

The task-owned worktree is
`/home/edwardspc/Desktop/Dev/worktrees/property-listify-b15-founder-privacy-input-2026-09-27`,
branch `docs/b15-founder-privacy-input-2026-09-27`, HEAD
`a05868c66f493e3cbc972a119074c91a10797777`, with accepted product/runtime
anchor tree `b21f454e215d8b02129e4daa14ba6f8d338406d1`. This is documentation
only; the accepted product/runtime source was not changed.
