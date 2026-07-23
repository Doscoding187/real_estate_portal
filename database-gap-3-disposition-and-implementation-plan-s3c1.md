# Database Gap 3 Disposition and Implementation Plan — S3C1

## Decision matrix and gate

| Asset class | Future disposition | Dependency |
| --- | --- | --- |
| Canonical runner, baseline and ledger | retain as canonical | None. |
| `server/migrations/_archived/**` | retain as historical evidence | Must remain non-executable. |
| Ten wrappers reading removed `drizzle/migrations/**` | retire | Static proof: paths do not exist and no caller is active. |
| Direct DDL/schema repair utilities | retire | Canonical baseline/schema supersede them. |
| Read-only diagnostics | retain as non-migration diagnostic or retire | Require target guard and explicit ownership. |
| Data repair/admin utilities and seed scripts | retain as controlled data-repair utility, replace, or retire | Requires an approved operating contract; no migration authority. |
| `drizzle/*.sql` | delete after caller retirement | Two direct wrapper callers; historical docs also need correction. |
| `drizzle/meta/**` and `fix_snapshot.js` | retire/delete after generation-dependency check | Journal is not `sql_migration_history`. |
| Root `migrations/**`, root SQL, `scripts/*.sql` | delete after caller retirement, except bounded diagnostics/local-test artifacts | Documentation and any surviving repair tool must be resolved first. |
| Local/test initialization and test fixtures | retain as canonical supporting/non-migration | Must not apply application schema. |
| `bundle_attributions` subsystem | retain current Gap 2 classification: dead legacy | Later application-code cleanup, not this authority decision. |

`GAP_3_IMPLEMENTATION_GATE=OPEN`

The gate is open for a narrowly staged, static-first implementation. No active canonical omission is unresolved; no manual legacy utility is active migration authority; every temporary SQL surface has a disposition. Database-dependent data-repair questions are separated and do not block retirement of broken schema utilities or historical SQL.

## Ordered future implementation slices

### Slice 1 — retire broken manual migration wrappers

**Files to modify/delete:** the ten missing-`drizzle/migrations` wrappers listed in the utility audit; `setup-explore-feed.ps1`; `verify-explore-feed.ts`; `scripts/fix_snapshot.js`; any direct wrapper documentation.

**Dependency:** none beyond static reference proof. The referenced SQL directory is already prohibited/absent.

**Validation:** repository-text search for each path, package/CI/startup graph inspection, manifest/contract static checks, diff hygiene. No database access required.

**Restoration:** Git history/revert. No data rollback is needed because no utility is executed.

### Slice 2 — separate diagnostics and data repair from migration authority

**Files:** read-only diagnostics under `scripts/` and `server/scripts/`; controlled seed/repair utilities; `scripts/*.sql`; local/test SQL examples.

**Action:** retain only named diagnostics with read-only intent and target guard; move or document repair tools as administrative operations, or retire them. Do not let any tool generate/apply schema.

**Dependency:** product owner for each data-repair capability. Schema-mutating scripts must be retired rather than reclassified.

**Validation:** static import/reference graph and explicit no-DDL/no-legacy-SQL contract assertions. Database access is not needed to remove authority claims; any later repair-capability acceptance may need approved read-only evidence.

### Slice 3 — correct current operational documentation

**Files:** `README.md`, `DATABASE_MANAGEMENT_OPTIONS.md`, `DATABASE_SETUP_GUIDE.md`, `DEVELOPMENT_SUBMISSION_GUIDE.md`, `DEVELOPMENT_WIZARD_SCHEMA_COMPLETE.md`, `EXPLORE_DISCOVERY_MIGRATION_GUIDE.md`, `EXPLORE_PAGE_ERRORS_FIX.md`, `FIX_NOW.md`, `LOCATION_PAGES_IMPLEMENTATION_ROADMAP.md`, `PHASE10_IMPLEMENTATION_GUIDE.md`, `PHASE3_4_IMPLEMENTATION_GUIDE.md`, `PHASE5_LOCATION_INTELLIGENCE_GUIDE.md`, `PHASE8_ADVANCED_LOCATION_INTELLIGENCE_GUIDE.md`, `QUICK_FIX_RAILWAY.md`, `RAILWAY_FIX_EXPLORE_TABLES.md`, `RUN_RAILWAY_MIGRATION_NOW.md`, `RUN_TIDB_MIGRATION_NOW.md`, `SUBSCRIPTION_MODULE_DELIVERABLE.md`, `SUBSCRIPTION_SYSTEM_COMPLETE.md`, `TESTING_EXPLORE_FEED.md`, `TASK_1_DATABASE_SCHEMA_COMPLETE.md`, `UNIT_TYPES_IMPLEMENTATION_COMPLETE.md`.

**Action:** replace active instructions with the Gap 2 command graph or mark a wholly historical guide superseded. Do not rewrite historical narrative unnecessarily.

**Validation:** static documentation command search and link checks. No database access required.

### Slice 4 — remove now-unreferenced temporary SQL and generated metadata

**Files:** the 45 `drizzle/*.sql`, 17 `drizzle/meta/**`, root `migrations/**`, root `*.sql`, and `scripts/*.sql` according to the reconciliation matrix; preserve approved local/test and diagnostic exceptions.

**Dependency:** Slices 1–3; the manifest must no longer list deleted paths.

**Validation:** update `docs/database-authority/migration-tree-authority.json` and `server/__tests__/contract.migration-tree-authority.test.ts`; static tracked/untracked SQL inventory; package/CI/startup/docs search; full file-boundary review. No database lifecycle proof is authorized by this static cleanup.

### Slice 5 — final governance tightening

**Files:** manifest, migration-tree authority contract, focused authority documentation, and Gap 3 implementation report.

**Action:** allow only canonical active SQL, archival evidence, explicitly approved local/test initialization, and explicitly bounded diagnostics. Reject a new unclassified SQL surface, manual schema executor, generated journal-as-ledger claim, or legacy documentation workflow.

**Validation:** contract mutation tests and static Git checks. A later, separately approved lifecycle proof may use a database; it is not part of the Gap 3 authority cleanup.

## Database-dependent questions

| Candidate | Static conclusion | Minimum later evidence/approval |
| --- | --- | --- |
| Location, listing, brand, media, and seed repair utilities | Their source is unsafe as schema authority; static code cannot prove whether any specific data repair is still valuable. | Explicit owner and use case; read-only inventory query against a disposable/local approved environment; separate authorization before connection. |
| Super-admin and local/demo seed scripts | May be useful for controlled local/test provisioning, but legacy SQL is not proof. | Confirm current supported seed workflow and required rows in an approved non-production environment. |
| Diagnostic SQL | May be read-only, but source cannot prove production need or permissions. | Approved read-only target, query review, and no-write enforcement. |
| Drizzle metadata removal | Static sources show no canonical runner dependency; a supported Drizzle generation workflow may have repository-tool expectations. | Explicit toolchain-owner confirmation; no database connection is necessary. |

## Quantitative decision record

| Measure | Result |
| --- | ---: |
| Direct schema/legacy utility candidates | 87 (one test-only) |
| Broad database-adjacent utility candidates | 324 (87 direct plus 237 query/seed/diagnostic) |
| Missing legacy SQL dependency wrappers | 10 |
| Active package references to legacy manual migration utilities | 0 |
| CI references | 0 |
| Startup/deployment references | 0 |
| `drizzle/*.sql` | 45 |
| `drizzle/meta/**` | 17 |
| Root `migrations/**` SQL | 38 |
| Root `*.sql` | 11 |
| `scripts/*.sql` | 7 |
| Adjacent SQL | 5 |
| Genuine current canonical omissions | 0 |

## Audit constraints

This is an audit-only worktree. No repository utility, test, TypeScript/JavaScript module, environment file, Drizzle component, MySQL client, or database command was run. The next action is founder and senior-architect review of the proposed slices; no implementation worktree has been created.
