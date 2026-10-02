# Preliminary TiDB archive — 2026-09-30

Status: captured and authenticated; **not a final cutover archive**.

Edward's continuation request authorized completing the existing preliminary
source preservation work. This is protected read-only archival work, now in
verify/handoff phase. It changes no schema authority, migration, application
row, account, deployment, or target configuration. The active authority remains
the canonical Drizzle model and 95-entry manifest through
`0094_content_topics_primary_key.sql`.

## Capture evidence

- Source: production TiDB `listify_property_sa`.
- Exact fingerprint: `68f2582a6dc7af8c54cf6f31a396e8abe4c4030696c923b0ea3b1679ba6f5b5e`.
- Operation: `read-only-connect`, existing source-reader credential; connection
  created only by `connectionAuthority.ts`, with selected database and UTC
  session verification.
- Capture began: `2026-09-30T07:54:52.888Z`.
- Captured: 218 base-table schemas and 152 rows; 461,431 plaintext bytes.
- Archive SHA-256: `069a0e9bf6f966750856ecaaaafa0b783c8fb6d184b21788d3d08d8560d2fc71`.
- Encryption: AES-256-GCM with a random 256-bit key, random 96-bit nonce and
  authenticated format header. The key is separate from the encrypted archive.
- On-disk authenticated readback passed. Independent structural readback
  matched all table/row counts, footer, archive hash and mode-0600 file checks.
- Storage directories are owned, mode 0700, distinct and free of symlink aliases.
- No plaintext source rows or credential values are committed or printed.

Private archive and adjacent evidence file:
`~/.local/state/property-listify/tidb-preliminary-archive-20260930/tidb-preliminary-20260930075814719.enc`.

Private key:
`~/.config/property-listify/archive-keys-20260930/tidb-preliminary-20260930075814719.key`.

## Implementation and limits

`pnpm db:source:archive:preliminary -- --archive-dir=<private-directory> --key-dir=<separate-private-directory>`
uses the existing protected approval environment channel and refuses other
fingerprints or credential classes before connecting. The exact source-reader
URL belongs only in the command's environment, never in command arguments.

The capture validates driver result shapes and TiDB/selected-database/UTC
identity, uses repeatable-read with a consistent snapshot, captures `SHOW
CREATE TABLE` and rows, then rolls back and closes the connection. TiDB's
`READ ONLY` transaction syntax does not enforce a write prohibition; the
restricted source account is the privilege boundary. See the
[provider transaction reference](https://docs.pingcap.com/tidb/stable/sql-statement-start-transaction/).
Only SELECT, SHOW, transaction setup and ROLLBACK are issued by capture.

Archive-specific driver settings preserve date/time strings (including
microseconds), large integer and decimal strings, and JSON strings. Binary
values use tagged base64. Unsafe integer numbers, non-finite numbers, Date
objects and unrecognized objects fail closed. Limits are 512 base tables,
100,000 total rows and 64 MiB serialized plaintext; an excess or unsupported
view inventory refuses capture. This is bounded preservation, not a general
backup/restore utility, executable migration, or alternate schema authority.

Writer freeze has **not** been established. No final-cutover completeness,
TiDB retirement, independent off-machine backup, restore rehearsal or Azure
import is claimed. Final preservation requires the writer census/freeze and
reviewed cutover procedure. These artifacts are preliminary evidence only.

## Verification

- Database Authority full gate passed, including canonical model inventory,
  lifecycle contract and static tests. Final static run: 46 files / 415 tests.
- Typecheck passed; repository lint has zero errors (existing warnings remain).
- Production frontend build passed (existing chunk-size warnings remain).
- Full test run: 591 files passed, 50 skipped; two failures in the existing
  listing lifecycle fixture exposed its September 20 confirmation expiry.
  The fixture clock is now pinned to September 1, within its declared window;
  this changes only test time, not production freshness validation. The subsequent
  full local run passed: 592 files / 4,096 tests, with 50 files / 238 tests skipped.
- CI subsequently exposed shared runtime initialization in the two mocked
  connection suites. Both now use the existing suite-scoped `SKIP_DB_INIT`
  boundary and restore its prior value afterward. All 15 tests pass under CI
  flags with initialization otherwise enabled and an unreachable fixture URL;
  production connection and authorization behavior is unchanged.
- Migration runner's earlier conditional GIPK session fix remains in
  `dc53b63d`; GitHub DB Contract Verification passed for that commit.

Worktree: `property-listify-retained-azure84-upgrade-packet`.
Branch: `docs/retained-azure84-upgrade-packet` (PR 582).
Local inspection target: disposable-worktree, hash
`64b0e2d9e1f7ac442bbc3640074e75cbc4f91d070247fa3f191b8b71078d354a`;
manifest-head-ready, schema-congruent, no incomplete migration attempts.
No local lifecycle mutation or protected migration/release apply was performed.
