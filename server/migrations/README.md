# SQL migration authority

`manifest.json` is the machine authority for active membership, numeric
sequence, checksum, parent/checksum ancestry, statement policy, and expected
head. The runner never chooses order by scanning filenames or by consulting a
database ledger.

`0000_canonical_launch_baseline.sql` is the immutable establishment migration
for a fresh Property Listify database. It creates 180 application tables, no
views or data, and must never be rewritten. Historical SQL under `_archived/`
is non-executable evidence.

## Add a future migration

1. Rebase the dedicated database-authority worktree on current `origin/main`.
2. Update the canonical Drizzle model and regenerate inventory evidence.
3. Select the one next contiguous four-digit identity through serialized
   manifest review—not branch age, PR number, or an existing ledger.
4. Add one lowercase top-level SQL file and one manifest entry with exact
   checksum and parent checksum.
5. For `incremental-ddl`, use exactly one independently verifiable DDL
   statement. For `transactional-data`, use DML only. Exceptional entries need
   an explicit approval contract.
6. Prove malformed identity, duplicate number, membership drift, checksum
   drift, broken ancestry, cycle, multiple heads, archive execution, and unsafe
   statement policy all fail.
7. Run `pnpm db:migrate:plan` against an owned disposable database, then apply,
   schema congruency, readiness, and focused consumer evidence.

Do not add a product migration merely to test future sequencing; use isolated
manifest fixtures for `0000 -> 0001 -> 0002`.

## Planning and attempt state

`runSqlMigrations.ts` resolves and authorizes the operation before connection.
Plan mode reports target hash, accepted old head, ordered pending set, expected
new head, manifest digest, and plan digest without locks or mutation.

Apply takes the manifest lock and revalidates the plan. It stores successful
history in `sql_migration_history` and durable running/failed/blocked/succeeded
evidence in `sql_migration_attempts`. An incomplete attempt blocks normal
continuation. MySQL/TiDB DDL is not transactionally rolled back; do not delete
attempt evidence, edit history, silently retry ambiguous DDL, or record partial
work as success.

## Commands

```sh
pnpm db:authority:manifest
pnpm db:migrate:plan
pnpm db:migrate:apply -- --accepted-old-head=<head-or-none> --expected-new-head=<manifest-head>
pnpm db:release:plan
pnpm db:release:apply -- --ack=<exact-release-ack>
pnpm db:schema:congruency
pnpm db:readiness
```

Migration is an explicit operation, never application startup work. Generic
migration commands reject staging and production. Protected targets require
the explicit release operation, exact protected-target approval, and release
evidence; apply additionally requires exact acknowledgement. The current
`listify_local` is quarantined and cannot be migrated.
