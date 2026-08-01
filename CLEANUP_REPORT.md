# Retired ad-hoc database cleanup utilities

This historical note is retained only to explain why the former cleanup
utilities are absent. The following paths are prohibited and must not be
recreated as operator commands:

- `cleanup-production-data.ts`
- `execute-cleanup.ts`
- `scripts/perform-cleanup.ts`
- `simple-cleanup.ts`
- `verify-cleanup.ts`

No production-wide cleanup or delete authority exists in the repository. A
future repair capability requires a separately approved owner, target guard,
confirmation policy, audit output, and restore procedure.

For supported database operations, use the canonical migration and local/test
lifecycle commands documented in `server/migrations/README.md`, the
[database change protocol](docs/database-authority/database-change-protocol.md),
and the database authority entry contract.
