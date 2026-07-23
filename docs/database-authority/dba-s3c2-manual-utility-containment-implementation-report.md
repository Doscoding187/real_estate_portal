# Gap 3 Slice 1 — Manual Utility Authority Containment

## Executive authority decision

This Slice 1 patch removes only conclusively broken or superseded direct schema-execution wrappers. It does not delete retained legacy SQL or Drizzle metadata, change the canonical schema, or decide whether a live database needs data repair. The only canonical migration executor remains `server/migrations/runSqlMigrations.ts`, invoked through `pnpm db:migrate`, `pnpm db:migrate:test`, and `pnpm db:migrate:local`.

## Exact utility retirement inventory

The S3C1 direct-utility matrix classified 16 files as E (broken/legacy): ten wrappers that read removed `drizzle/migrations/**`, one snapshot mutator, two direct manual SQL/schema executors, and the two legacy Explore wrappers. All 16 had no package, CI, startup, deployment, production-caller, or approved operational-owner evidence. This slice also retires the two directly invoked D-class wrappers named by the approved boundary because their SQL is retained only as temporary legacy history.

| Path | Audit class | Retirement reason |
| --- | --- | --- |
| `scripts/apply-financial-migration.ts` | D — superseded | Applies retained historical financial SQL outside the canonical runner. |
| `scripts/apply-unit-types-migration.ts` | D — superseded | Applies retained historical unit-types SQL outside the canonical runner. |
| `scripts/fix_snapshot.js` | E — broken/legacy | Mutates generated Drizzle snapshot history. |
| `scripts/push-schema-with-fk-disabled.ts` | E — broken/legacy | Uses direct Drizzle push with foreign-key disabling. |
| `scripts/run-development-location-migration.ts` | E — broken/legacy | Reads a removed `drizzle/migrations/**` file. |
| `scripts/run-development-wizard-migration.ts` | E — broken/legacy | Reads removed `drizzle/migrations/**` files. |
| `scripts/run-enhanced-unit-types-migration.ts` | E — broken/legacy | Reads a removed `drizzle/migrations/**` file. |
| `scripts/run-google-places-monitoring-migration.ts` | E — broken/legacy | Reads removed SQL and probes obsolete result tables. |
| `scripts/run-location-performance-migration.ts` | E — broken/legacy | Reads removed index SQL and creates/probes legacy indexes. |
| `scripts/run-manual-migration.ts` | E — broken/legacy | Direct MySQL executor for obsolete railway setup SQL. |
| `scripts/run-mission-control-phase1-migrations.ts` | E — broken/legacy | Direct executor for removed `drizzle/migrations/**`. |
| `scripts/run-phase-optimization-migration.ts` | E — broken/legacy | Reads removed `drizzle/migrations/**` SQL. |
| `scripts/run-price-insights-indexes.ts` | E — broken/legacy | Reads removed `drizzle/migrations/**` index SQL. |
| `scripts/run-unit-types-spec-variations-migration.ts` | E — broken/legacy | Reads removed `drizzle/migrations/**` SQL. |
| `scripts/run-wizard-optimization-migration.ts` | E — broken/legacy | Reads removed `drizzle/migrations/**` SQL. |
| `scripts/run-wizard-v2-migration.ts` | E — broken/legacy | Reads removed `drizzle/migrations/**` SQL. |
| `setup-explore-feed.ps1` | E — broken/legacy | Executes unreachable legacy Explore setup SQL. |
| `verify-explore-feed.ts` | E — broken/legacy | Verifies an incompatible legacy Explore schema. |

No other E-class utility is retained outside this slice: the complete S3C1 E list is the 16 E-class paths above. The remaining D-class direct executors are deferred because their individual retirement or controlled-data-repair disposition belongs to later Slice 1 review follow-up or a later Gap 3 slice; this patch intentionally does not delete the 324-file manual-utility census wholesale.

## Surviving utility boundary

No surviving manual utility is migration authority. The manifest now gives exact path classifications for approved migration verification, local/test initialization, read-only diagnostics, controlled data repair, local/test fixtures, historical evidence, deferred Gap 3 utilities, and retired prohibited executors. `scripts/local-db.sh` and `scripts/localDbWorkflow.ts` remain deferred D-class schema executors rather than approved local initialization. Diagnostics must remain non-mutating; controlled repairs must not claim a migration command; repairs require explicit environment, owner, and approval controls before any future execution.

## Documentation disposition

`README.md` is corrected to point schema work to the canonical command graph. `DATABASE_MANAGEMENT_OPTIONS.md`, `DATABASE_SETUP_GUIDE.md`, and `EXPLORE_DISCOVERY_MIGRATION_GUIDE.md` already carried the Gap 2 supersession boundary and are retained unchanged. The other 18 approved current-looking documents now begin with a prominent database-execution supersession notice, link to `server/migrations/README.md`, and state that data repair requires separate approval.

## Manifest and contract containment

`migration-tree-authority.json` now records a deterministic 87-path direct schema/legacy candidate registry plus exact classifications and an explicit retired-path list. It does not use a broad executable allowlist. The migration-tree authority contract is extended to reject a returned retired path, an unclassified schema/setup/snapshot executor, an operational reference to a retired executor, a diagnostic changed into DDL, a data-repair utility claiming migration authority, and current-looking documentation that invokes a retired wrapper. Existing SQL-tree protections remain in place.

Static adversarial cases deferred to the isolated executable review gate are: restoring any retired path; adding `scripts/run-legacy-schema-migration.ts`; adding a package script for a retired wrapper; adding current guidance invoking one; adding a snapshot-mutating script; and converting an approved diagnostic to `CREATE TABLE` or `ALTER TABLE` without reclassification.

## Retained SQL and metadata

All temporary Gap 3 SQL and Drizzle metadata remain byte-identical. Slice 1 retires callers before any dependent SQL-tree deletion: top-level `drizzle/*.sql`, `drizzle/meta/**`, root `migrations/**`, root SQL, `scripts/*.sql`, local/test initialization, diagnostic SQL, archive SQL, and the canonical baseline remain out of this patch.

## Environment safety and validation

No repository utility, migration runner, application runtime, test, Vitest invocation, database client, Docker command, Drizzle command, `.env`, or `.env.test` loader was executed. Runtime contract execution is deliberately deferred because prior closure evidence showed `.env.test` can cause an attempted local MySQL initialization. Slice validation is static only: Git boundary checks, JSON parsing, standalone manifest coverage checks, text searches, Markdown/link checks, whitespace checks, and protected-hash comparison. Results and refreshed SHA-256 values are recorded after the final static validation pass.

## Deferred work

The next authorized Gap 3 slice may review the remaining D-class executors and controlled repair/diagnostic ownership, then delete temporary legacy SQL only after callers are retired or repointed. It must separately decide whether any data repair is needed using explicit database-evidence authorization. The unreachable bundle-attribution application subsystem remains later application cleanup, not this slice.

## Database-operation confirmation

Database connection opened: no. Migration executed: no. Reset executed: no. Deployment performed: no.

## Base reconciliation record

The reviewed Slice 1 patch was reconciled without content redesign from previous base `d645e905574831f31feb8c25c3a85ed2676cd548` to new base `d306f4e6214a0813ec8c8a1fa71deeb6ea082164`. PR #389 introduced feature commit `468b0d8f7351a550aa3b7762f8f0754b34c4443c` and merge commit `d306f4e6214a0813ec8c8a1fa71deeb6ea082164`.

The incoming paths were the six AAE-S1A evidence documents `10` through `15` and `docs/architecture/commercial-value-proposition-acquisition-engine/index.md`. They have zero path overlap and no semantic overlap with manual-utility containment. The preserved patch was captured in stash object `680996bad34e5050b568606bce8ec39c9576d585` (`dba-s3c2-base-reconciliation-safety`), applied without conflict after a fast-forward, and rechecked for its 18 deletions, 19 approved document modifications, three authority modifications, and one untracked report. The safety stash is dropped only after final static validation.

Static revalidation repeats JSON parsing, explicit manifest/candidate registration checks, retired-path absence, operational-reference searches, documentation-structure checks, whitespace checks, protected hash comparisons, and equality of the seven incoming AAE paths with `origin/main`. Runtime validation remains intentionally deferred: no Vitest, type-check, build, repository utility, environment loader, database client, or migration command is used in this reconciliation. The final review-handoff patch and report hashes are supplied outside this report so the report does not attempt to self-attest a hash that changes when that hash is written.

## Senior review and isolated executable validation

Senior review found two concrete containment defects and corrected only the manifest, contract, and this report. First, the 87 direct schema-executor candidates were registered but did not each have a primary class. The manifest now assigns every one exactly once: 18 retired prohibited, 53 deferred schema executors, eight controlled data-repair candidates, seven verification or diagnostic candidates, and one test-only candidate. This is the direct-executor subset from the S3C1 matrix, not a claim that the full 324-file broad census is governed by this manifest.

Second, the contract checked only the 22 named guidance documents, so a new current-looking Markdown guide could have invoked a retired wrapper. The contract now scans all tracked and non-ignored Markdown files, exempting only the explicit `.kiro/**` evidence root and nine exact historical/evidence files. A document with a leading historical, superseded, or prohibited boundary is permitted to quote an obsolete command; a current-looking guide fails with its path and retired utility. The contract also detects direct `exec`, `execFile`, `spawn`, and `spawnSync` references to MySQL, Drizzle, or migration commands. Approved diagnostics are checked before generic candidate classification so schema-mutation drift reports the diagnostic-specific rule.

The contract import graph is limited to `node:child_process`, `node:fs`, `node:path`, and Vitest APIs. It reads repository text and JSON and invokes Git only for inventory. It imports no server module, Drizzle module, router, service, startup, setup file, environment bootstrap, or audited utility.

The isolated test used a temporary Vitest config outside the repository with the implementation worktree as root, an empty external `envDir`, `authority-contract` mode, only `server/__tests__/contract.migration-tree-authority.test.ts`, no setup or global setup, Node environment, one fork, no watch mode, and `passWithNoTests: false`. The normal `vitest.config.ts` and `vitest.setup.ts` were not used; static inspection confirmed the latter loads `.env.test` and may initialize MySQL, which is why it remained excluded. A temporary CommonJS preload blocked `net`, `tls`, `http`, `https`, and `dgram` connection APIs with `DBA_S3C2_NETWORK_ACCESS_BLOCKED`. The baseline isolated run passed one file and five tests without a guard trigger.

| Mutation | Result |
| --- | --- |
| Recreated `scripts/run-manual-migration.ts` | Failed: retired path return rule named the path. |
| Added SQL-reading `scripts/run-legacy-schema-migration.ts` | Failed: unclassified manual schema executor named the path. |
| Added package script for retired wrapper | Failed: non-canonical runner and retired operational-source rules named `package.json`. |
| Added current Markdown guide invoking retired wrapper | Failed: current documentation rule named the guide and path. |
| Added Drizzle-journal mutator | Failed: unclassified manual schema executor named the path. |
| Added `CREATE TABLE` to approved diagnostic | Failed: diagnostic became a schema-mutation rule named the diagnostic. |
| Classified controlled data repair as canonical executor | Failed: canonical-runner authority rule. |
| Added harmless `scripts/fix-readme.ts` | Passed. |
| Added explicitly historical/prohibited command note | Passed. |
| Added approved untracked authority-contract SQL fixture | Passed. |

Every mutation was restored byte-for-byte or removed before the next run. Executable contract review is complete; general Vitest, normal setup, type-check, build, schema sanity, and repository utilities remain intentionally unrun. No network guard trigger, database attempt, migration, reset, or deployment occurred.

## Final bounded confirmation review

The final review independently reconfirmed the two prior logical corrections: each of the 87 direct candidates has exactly one primary class, and repository-wide current-looking Markdown is checked while the historical/evidence exceptions stay explicit and narrow. No further logical correction was required.

The only final-review source edit was the pre-authorized Prettier layout normalization of `server/__tests__/contract.migration-tree-authority.test.ts`. Its before/after diff changes indentation and line wrapping only; no string literal, regular expression, path, expectation, or detection rule changed. The exact-file Prettier check reported the known formatting issue before write, and `pnpm exec eslint server/__tests__/contract.migration-tree-authority.test.ts --max-warnings=0` completed with zero warnings afterward.

The isolated authority-contract configuration was recreated with an external empty `envDir`, no setup/global setup, one Node fork, and the same external network guard. The formatted baseline passed one test file and five tests. The ten mutation cases were repeated: the seven prohibited cases failed with the relevant path/rule, while the harmless `fix` utility, explicitly historical prohibited-command note, and approved authority-contract fixture each passed. Every temporary mutation was removed or restored; no temporary configuration, environment directory, guard, dependency symlink, test result, build output, or stash remains after cleanup.

Final documentation-reference reconciliation remains: three superseded approved documents, 13 `.kiro/**` historical-evidence files, nine exact historical/evidence files, and this implementation report; there are zero invalid current operational references. Final SHA-256 values are supplied in the review handoff rather than self-recorded here. No logical correction, database attempt, repository utility execution, migration, reset, or deployment occurred in this final review.
