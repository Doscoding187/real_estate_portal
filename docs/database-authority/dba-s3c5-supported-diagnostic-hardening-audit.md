# DBA-S3C5 — Supported Diagnostic Hardening Audit

## Executive authority decision

Gap 3 Slice 2B may proceed as a static authority-hardening implementation without opening a database connection.

The supported diagnostic capability is limited to `pnpm db:verify`, `pnpm db:verify:distribution`, `pnpm schema:sanity`, and `pnpm db:target`.

`scripts/db-contract-verify.ts` and `scripts/db-verify-distribution-schema.ts` must retain read-only query behaviour, load the canonical runtime environment, disclose a credential-free target fingerprint, and invoke the shared database-target guard before opening a connection.

`scripts/schema-sanity-check.mjs` remains the canonical offline schema-authority check. `scripts/print-db-target.ts` remains the non-connecting target-disclosure companion.

The uncalled duplicate diagnostics `scripts/check-db-schema.ts`, `scripts/check-db-status.ts`, `scripts/check-schema.ts`, and `scripts/quick-db-check.ts` have no approved operational owner or caller and should be retired rather than hardened.

## Audited capability inventory

| Capability | Path | Connection behaviour | Disposition |
| --- | --- | --- | --- |
| Contract verification | `scripts/db-contract-verify.ts` | Read-only `SHOW` and `SELECT` queries plus local checksum reads; currently connects before applying target governance. | Retain and harden. |
| Distribution verification | `scripts/db-verify-distribution-schema.ts` | Read-only `SHOW` queries; currently connects before applying target governance. | Retain and harden. |
| Schema sanity | `scripts/schema-sanity-check.mjs` | Repository file reads only; no database client or connection. | Retain unchanged except contractual ownership. |
| Target display | `scripts/print-db-target.ts` | Parses and reports `DATABASE_URL`; does not connect. | Retain as the guarded target-disclosure companion. |
| Legacy agents schema check | `scripts/check-db-schema.ts` | Read-only query, but failures can exit successfully and no target guard exists. | Retire. |
| Legacy migration status check | `scripts/check-db-status.ts` | Read-only queries against obsolete `__drizzle_migrations`; no target guard and weak failure semantics. | Retire. |
| Legacy development schema check | `scripts/check-schema.ts` | Read-only single-table query; no target guard and weak failure semantics. | Retire. |
| Production quick check | `scripts/quick-db-check.ts` | Loads `.env.production` and queries development records without the shared target guard. | Retire. |

## Implementation contract

The Database and Release Engineering capability owns the four supported diagnostics.

The two database-connected verifiers must:

1. Load runtime configuration through `loadAppRuntimeEnv`.
2. Require a valid `DATABASE_URL`.
3. derive and print a credential-free database fingerprint.
4. call `assertDatabaseTargetMatchesRuntime` before `mysql.createConnection`.
5. execute only metadata or read-only queries.
6. close the connection in all success and failure paths.
7. exit non-zero when target validation, connection, or verification fails.

The authority contract must assert that supported diagnostics contain no DDL or DML, that connected verifiers use the shared target guard before connection creation, and that retired duplicate diagnostics cannot return.

## Static validation boundary

Validation may include TypeScript checking, targeted linting and formatting, JSON parsing, source assertions, isolated contract tests with network access blocked, package and caller graph checks, and Git boundary checks.

No database connection, migration, seed, reset, Docker lifecycle command, deployment, or production environment file may be executed during this slice.
