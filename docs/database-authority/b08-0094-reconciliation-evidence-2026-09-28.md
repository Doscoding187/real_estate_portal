# Repository reconciliation evidence — 2026-09-28

- Branch: `fix/b08-0094-release-reconciliation`
- Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-b08-0094-release-reconciliation`
- Base: `4e012b3044628fc06da7489c0055e9ce01bdc8d9`
- Tested implementation commit: `247f4a8506e7efb142304352002986ea83ef5c45` (subsequent commit adds documentation evidence only).
- Review status: prepared, not merged or deployed.

## Executed validation

| Command/check | Result |
|---|---|
| pnpm db:authority:status | Local disposable target resolved; unavailable, not provisioned; no remote DB connection |
| pnpm db:authority:check | PASS: 39 files / 342 tests; utility authority, schema sanity, inventory, lifecycle passed |
| pnpm schema:inventory:check | PASS |
| pnpm check | PASS |
| pnpm lint:check | PASS (exit 0) |
| Focused comparator ESLint after final test addition | PASS, 0 errors; 25 formatting warnings in B08-derived test file |
| pnpm build | PASS; bundle-size advisory remains |
| git diff --check | PASS |
| Independent historical byte comparison | PASS: all 0000–0090 SQL bytes and manifest entries identical to base |
| B08 migration manifest identity | PASS: exact SHA-256 recorded in decision |
| Live / physical / write-based integration | NOT RUN: prohibited in this task |

Static tests include transactional-email model integration, unique/FK/index and
microsecond contracts; they are not a claim that 8.4 physical enforcement has run.
The new comparator test covers unknown drift, canonical collisions and unavailable
settings in addition to the B08 exact-case/folding/physical-collision coverage.
Onboarding's barrier-based concurrency regression preserves the persisted winner;
non-duplicate errors and missing winners propagate.

No Azure/TiDB write, migration, DATABASE_URL change, upgrade, deployment, unrelated
B08/B10 runtime promotion, checksum alteration or reference reseed occurred.
Production remains TiDB by the supplied verified state and absence of deployment
or configuration changes; this task did not reread production credentials.
Azure remains the migration target. ARM-only server metadata was refreshed.
No secrets are included.

## Exact changed files

- `docs/database-authority/azure-84-upgrade-revalidation-gate-2026-09-28.md`
- `docs/database-authority/b08-0094-reconciliation-evidence-2026-09-28.md`
- `docs/database-authority/b08-0094-release-decision-2026-09-28.md`
- `docs/database-authority/migration-tree-authority.json`
- `drizzle/schema/canonical-model-inventory.json`
- `drizzle/schema/core.ts`
- `drizzle/schema/explore.ts`
- `drizzle/schema/index.ts`
- `drizzle/schema/transactionalEmail.ts`
- `scripts/databaseAuthorityCli.ts`
- `server/__tests__/contract.b08-release-reconciliation.test.ts`
- `server/__tests__/contract.database-canonical-model-authority.test.ts`
- `server/__tests__/contract.migration-execution-authority.test.ts`
- `server/_core/__tests__/databaseTls.test.ts`
- `server/_core/databaseAuthority/__tests__/contextAuthorization.test.ts`
- `server/_core/databaseAuthority/__tests__/dataAdapters.test.ts`
- `server/_core/databaseAuthority/__tests__/isolatedCiCredentials.test.ts`
- `server/_core/databaseAuthority/__tests__/schemaCongruency.test.ts`
- `server/_core/databaseAuthority/context.ts`
- `server/_core/databaseAuthority/readiness.ts`
- `server/_core/databaseAuthority/schemaCongruency.ts`
- `server/_core/databaseTls.ts`
- `server/migrations/0091_transactional_email_deliveries.sql`
- `server/migrations/0092_transactional_email_attempts.sql`
- `server/migrations/0093_user_onboarding_state_primary_key.sql`
- `server/migrations/0094_content_topics_primary_key.sql`
- `server/migrations/__tests__/canonicalListingLocationMigration.test.ts`
- `server/migrations/__tests__/manualLocationWithoutCoordinatesMigration.test.ts`
- `server/migrations/__tests__/migrationManifest.test.ts`
- `server/migrations/__tests__/runSqlMigrations.test.ts`
- `server/migrations/manifest.json`
- `server/migrations/runSqlMigrations.ts`
- `server/services/__tests__/onboardingStateCreation.test.ts`
- `server/services/onboardingService.ts`
- `server/services/onboardingStateCreation.ts`
- `server/userRouter.ts`
- `vitest.database-authority-static.config.ts`
