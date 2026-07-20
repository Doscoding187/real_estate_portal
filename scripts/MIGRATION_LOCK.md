# Migration Lock Protocol

## 🔒 Source of Truth

The `server/migrations` directory is the **Source of Truth** for the database schema.
The `drizzle/schema.ts` file defines the application's view of the data, but the SQL migrations dictate the actual database structure.

## 🚨 Migration Command

To apply migrations in PRODUCTION, you must run:

```bash
pnpm release:predeploy:production
```

This runs the production launch preflight and the canonical `pnpm db:migrate` migration chain.

## 🚫 Forbidden Actions

- **DO NOT** use `drizzle-kit push` in production. It can cause schema drift and skipped migrations.
- **DO NOT** manually modify the database schema (e.g., via CLI or UI) without a corresponding migration file.
- **DO NOT** assume a column exists in code until the migration has been run and verified.

## ✅ Verification

Use `scripts/verify-schema.ts` to inspect the live database schema and ensure it matches expectations.
