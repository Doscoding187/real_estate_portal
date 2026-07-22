# Archived SQL Migrations

Files under this directory are historical reference material and are not
executable migration authority.

`pre-canonical-baseline/` contains the former 54-file custom SQL chain. That
chain was retired because applying it after the consolidated launch baseline
would recreate canonical tables, create retired noncanonical tables, alter the
accepted launch schema, and run legacy data backfills.

The active custom SQL runner executes only top-level `.sql` files directly
inside `server/migrations`.
