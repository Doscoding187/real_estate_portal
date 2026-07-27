# Canonical local test database rebuild

Use `pnpm db:test:rebuild` only when the disposable local `listify_test`
database is stale, partially initialized, or rejected by the canonical
migration guard.

The command is deliberately destructive to **only** `listify_test`. Before any
destructive operation it requires the test runtime, `APP_ENV=test`, MySQL on
`127.0.0.1:3307`, the exact `listify_test` name, the approved native temporary
root, and an exact acknowledgement embedded in the package command. It prints
only target metadata, never connection strings or passwords.

The workflow starts and waits for the repository-authorized local service,
recreates the test schema through `scripts/local-db.sh`, then invokes
`pnpm db:migrate:test`. The migration runner is the only component that applies
the canonical launch baseline and creates its `sql_migration_history` record.
The workflow then performs read-only verification of that ledger and the
canonical application schema.

Use `pnpm db:local:stop` for cleanup. Do not use `db:local:destroy` for this
purpose: it is broader and may remove the co-resident local-development and E2E
databases.
