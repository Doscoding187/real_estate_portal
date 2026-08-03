# Migration Lock Protocol

## 🔒 Source of Truth

The `server/migrations` directory is the **Source of Truth** for the database schema.
The `drizzle/schema.ts` file defines the application's view of the data, but the SQL migrations dictate the actual database structure.

## 🚨 Release commands

First produce the exact protected plan:

```bash
pnpm release:predeploy:production
```

That command does not mutate the database. A separately approved operator must
bind the approval and exact acknowledgement to the same target fingerprint,
artifact, accepted old head, and expected new head before running:

```bash
pnpm db:release:apply -- --accepted-old-head=<head-or-none> --expected-new-head=<head> --ack=<exact-ack>
```

Generic `db:migrate:*` commands reject staging and production targets.

## 🚫 Forbidden Actions

- **DO NOT** use `drizzle-kit push` in production. It can cause schema drift and skipped migrations.
- **DO NOT** manually modify the database schema (e.g., via CLI or UI) without a corresponding migration file.
- **DO NOT** assume a column exists in code until the migration has been run and verified.

## ✅ Verification

Use `pnpm db:verify` to compare the target database against the current application schema contract.

See `server/migrations/README.md` for the canonical migration and verification command boundary.
