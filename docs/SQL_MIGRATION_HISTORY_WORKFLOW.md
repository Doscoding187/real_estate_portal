# Canonical SQL Migration Workflow

Property Listify has one executable SQL migration authority:

- `server/migrations/0000_canonical_launch_baseline.sql`
- future top-level incremental SQL files in the same directory

The canonical baseline executes only when migration history is empty and the
database contains no application tables.

A database containing the retired pre-canonical ledger or an existing schema
without the canonical baseline ledger entry is never upgraded implicitly.
Because the platform is pre-launch, it must be deliberately rebuilt from the
canonical launch baseline.

Normal execution records the committed filename and SHA-256 checksum with
`application_mode = 'executed'`. Applied SQL files are immutable; checksum
changes fail before execution.

The runner uses a named database lock. SQL failures are never swallowed or
recorded as applied. A partially created fresh database must be destroyed and
rebuilt before retrying.

Production authority:

    pnpm release:predeploy:production

Local fresh bootstrap authority:

    pnpm db:reprovision:local

Archived SQL under `server/migrations/_archived/` is audit evidence only and
is never executable migration authority.
