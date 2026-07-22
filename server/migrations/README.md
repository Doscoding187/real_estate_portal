# SQL Migration Authority

`0000_canonical_launch_baseline.sql` is the executable launch bootstrap
authority for a fresh Property Listify database.

It is generated from `drizzle/schema.ts`, sanitized only by removing Drizzle's
`--> statement-breakpoint` markers, and validated against
`drizzle/schema/canonical-model-inventory.json`.

Baseline contract:

- exactly 180 canonical physical tables
- no noncanonical physical tables
- no views
- no data inserts or backfills
- no destructive SQL
- no quoted `CURRENT_TIMESTAMP` literals
- all foreign-key targets resolve within the baseline

Historical pre-baseline SQL is retained under
`_archived/pre-canonical-baseline/` for audit reference only. The custom SQL
runner executes only top-level `.sql` files in this directory.

Future schema changes must be introduced as new top-level incremental SQL
migrations generated from the accepted canonical model authority.
