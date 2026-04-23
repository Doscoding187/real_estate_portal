Archived legacy raw SQL migrations that duplicate schema changes already owned by
Drizzle migrations and the baseline schema.

These files are kept for reference only and must not live in `server/migrations`,
because `runSqlMigrations.ts` executes every top-level `.sql` file in that folder.
