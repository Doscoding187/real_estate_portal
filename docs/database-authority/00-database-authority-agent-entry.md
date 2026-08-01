# Database Authority Agent Entry Contract

Use this operating contract before database analysis or modification. It is the
first operational authority; detailed audits are evidence, not alternate
instructions.

## Authority at a glance

| Concern | Current authority | Keep / extend / retire |
| --- | --- | --- |
| Schema establishment | `server/migrations/0000_canonical_launch_baseline.sql` | Keep |
| Migration execution | `server/migrations/runSqlMigrations.ts` and `sql_migration_history` | Keep |
| Runtime schema model | `drizzle/schema/` and `canonical-model-inventory.json` | Keep |
| Historical migrations | `server/migrations/_archived/pre-canonical-baseline/` | Keep as evidence only |
| Local target guard | `scripts/localDbWorkflow.ts` | Keep |
| Local MySQL lifecycle | `scripts/local-db.sh` | Keep |
| Local demo consumer | `server/scripts/localDemoSeed.ts` | Keep and contract-test |
| Schema/demo verification | `scripts/db-verify-distribution-schema.ts`, `server/scripts/verifyLocalDemoSeed.ts` | Keep |
| Authority classification | `docs/database-authority/migration-tree-authority.json` | Keep |
| Operating manifest and commands | `authority-manifest.json`, `db:authority:*` | Extend |
| Database change workflow | `database-change-protocol.md` | Keep and follow |
| CI consumer proof | `db:authority:consumer-contract` | Extend |

The machine-readable companion is
[`authority-manifest.json`](authority-manifest.json). It points to authority;
it does not replace it.

The canonical change workflow is
[`database-change-protocol.md`](database-change-protocol.md). Normal schema
evolution follows that protocol and does not reopen the programme.

## Rules

- Active migrations are top-level `server/migrations/*.sql`; the canonical
  launch baseline is `0000_canonical_launch_baseline.sql`.
- `drizzle/schema/` is the runtime model authority. The migration ledger is
  `sql_migration_history`.
- `_archived/pre-canonical-baseline/` is historical evidence only. Never run,
  scan for runtime authority, or revive it.
- The only ordinary local target is an approved local host and exactly
  `listify_local`. Production, staging, Railway, TiDB, and remote databases
  are excluded.
- A stale seed, fixture, test helper or runtime query must be reconciled to the canonical schema. The canonical schema must not be changed merely to satisfy a stale consumer.
- Never use `db:push`, schema generation, manual DDL, or retired schema
  executors unless an approved task explicitly creates a new migration.
- Never reconstruct or print `DATABASE_URL`, credentials, passwords, tokens,
  or complete database URLs. Existing destructive commands retain their exact
  acknowledgement requirements.

## Approved workflow

Run the read-only orientation command first:

```sh
pnpm db:authority:status
```

For ordinary local product data, then run:

```sh
pnpm db:authority:bootstrap:local
```

That thin orchestrator validates the local target, starts/waits for local
MySQL, applies canonical migrations, seeds the local demo, and verifies the
distribution schema and demo data. It never generates migrations, pushes a
schema, destroys the database, or modifies tracked files.

The machine-local development authority is `~/.config/property-listify/local.env`
(resolved from the operating-system home directory, never committed). It must
be mode `0600`; each worktree’s ignored `.env.local` is a symlink to it. On a
new worktree bootstrap creates that link. It never overwrites a normal or
incorrect `.env.local` link: preserve the file, reconcile it into the central
environment, then replace it with the approved link. Status reports only
sanitized path, linkage, permission, and variable state.

## Local demo access

| Account | Role |
| --- | --- |
| `admin@listify.local` | super administrator |
| `agency@listify.local` | agency administrator |
| `developer@listify.local` | property developer |
| `agent@listify.local` | agency agent |
| `referrer@listify.local` | referral user |
| `buyer@listify.local` | buyer/prospect |

All six seeded demo accounts use the password supplied through
`LOCAL_DEMO_AGENCY_PASSWORD`; its value is never tracked or reported.

Use only the package commands named by the status report and manifest. Do not
use `db:reprovision:local`, `db:local:destroy`, or `db:test:rebuild` without
their existing explicit acknowledgement. Stop and report if status says the
target is not an approved local or test target.

When a consumer fails after migration, treat it as consumer drift: compare the
consumer with the focused canonical model, reconcile it, and run the fresh
consumer contract. Do not add fallback columns, schema guessing, alternate SQL,
or legacy writes.

## Required scope and evidence

Open a separate database-authority PR for any canonical model, baseline,
incremental migration, migration-runner, ledger, target-guard, or compatibility
exception change. Read the policy and exception register first. Product work
that merely changes a consumer stays focused on that consumer and its matching
schema model.

Return: target classification (never URL), commands/tests run, migration ledger
state, consumer-contract result when relevant, and confirmation that no remote
target, secret, migration rewrite, or schema push was used. Report the exact
consumer/schema disagreement when blocked.

## CI consumer contract

`pnpm db:authority:consumer-contract` requires a fresh disposable local
`listify_test` MySQL schema. It proves, behaviourally: canonical baseline,
local demo seed, distribution verification, and demo verification. It detects
missing seed columns, retired fixture assumptions, incomplete migrations,
missing demo records, and seed failures. Seed transaction rollback has focused
unit coverage in `localDemoSeedCanonicalSchema.test.ts`. Its direct entrypoint
also refuses any runtime other than exactly `NODE_ENV=test` and `APP_ENV=test`.

CI runs this contract on every pull request to `main` or `develop` and every
push to `main`; it is intentionally not path-filtered, so the listed database
surfaces and their consumers cannot bypass the fresh-schema proof.

## Compact prompt header

> Before database analysis or modification: read
> `docs/database-authority/00-database-authority-agent-entry.md`; run
> `pnpm db:authority:status`; use only its reported paths and commands; never
> treat archived migrations as runtime authority; do not use db:push, schema
> generation, or manual DDL without an approved new-migration task; do not scan
> the repository unless authority checks fail; reconcile stale consumers to the
> canonical schema; stop and report an unapproved target.

## Token-efficient boundaries

- Database-independent work: do not scan migrations or schema files.
- Local product data: run status, then local bootstrap, then continue.
- Consumer change: read this contract, manifest, consumer, matching canonical
  model, and focused tests—no full audit.
- Schema authority change: create a dedicated database-authority branch and do
  the full migration review.
