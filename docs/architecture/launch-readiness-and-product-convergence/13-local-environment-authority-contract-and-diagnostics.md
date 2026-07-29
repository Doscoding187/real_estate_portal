# Local-Environment Authority Contract and Non-Mutating Diagnostics

| Field            | Current authority                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stage            | **Stage 2B — bounded implementation only**                                                                                                                         |
| Contract version | `stage2b-2`                                                                                                                                                        |
| Scope            | Consumer inventory, name-only contract, read-only diagnostics, focused tests, and documentation                                                                    |
| Exclusions       | No environment reconciliation, symlink repair, service start, migration, seed, provider connection, preview creation, worktree inspection, or product feature work |

## 1. Executive decision

**Claim:** Property Listify now has an explicit variable-by-variable local-environment contract and a non-mutating diagnostic boundary.

**Mechanism:** The contract catalog classifies active environment names into nine primary categories. The diagnostic inspects only the requested repository worktree and the proposed central authority, parses names without emitting values, and returns sanitized human-readable or JSON status.

**Sequence:** Consumer references and tracked templates were searched; existing database-authority utilities were read; the contract and diagnostic were implemented; synthetic fixtures tested path states and name validation; the control worktree was inspected once after tests.

**Evidence:** The focused diagnostic suite passes 26 tests. The control result is `REGULAR_FILE_CONFLICT` for `.env.local`, central authority `REGULAR_FILE` with `SAFE_0600` and `OWNER_CURRENT_USER`, nine central names, approved local database target `listify_local`, no malformed, duplicate, test-only, or prohibited names, and no emitted values.

**Boundary:** This establishes a diagnostic and decision contract. It does not reconcile any environment file, create a link, start a service, connect to a database, create a preview, or establish Stage 3 readiness.

## 2. Scope and exclusions

This stage may inspect environment consumers, define authority, add value-safe diagnostics, add focused tests, and document sanitized results. It must not:

- alter `.env`, `.env.local`, the central machine-local file, or any symlink;
- print or record secrets, complete URLs, passwords, tokens, or API-key values;
- start application, database, or background services;
- run migrations or seeds or connect to external providers;
- inspect or alter the six preserved launch-risk worktrees;
- create a canonical preview or begin Stage 3;
- delete, clean, repair, switch, reset, rebase, or retire worktrees or branches.

## 3. Consumer-inventory methodology

The inventory searched active TypeScript/JavaScript consumers for `process.env.*` and `import.meta.env.*`, the tracked `.env*.example` templates, runtime bootstrap, Vite configuration, database-authority utilities, test configuration, and launch-relevant server services. Generated output, dependencies, archived evidence, and comments without an active consumer were excluded.

The search produced 119 active consumer names, including two legacy names (`DB_HOST`, `DB_NAME`) found in utility consumers. The contract catalog contains 130 distinct name-level entries after adding relevant tracked-template names. A name is not treated as authoritative merely because it appears in a template. Active consumer behaviour, fallback behaviour, target risk, and runtime surface determine the classification.

## 4. Variable classification contract

Each name has exactly one primary classification:

| Classification                       | Authority rule                                                    | Presence / variation                                                     | Diagnostic treatment                        | Later correction authority                           |
| ------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------- |
| `TRACKED_SAFE_DEFAULT`               | Tracked example/default or bounded runtime default                | Usually optional; worktree variation only for an approved bounded reason | Report name and presence state; never value | Documentation or separately authorized config change |
| `REQUIRED_MACHINE_LOCAL_SECRET`      | `~/.config/property-listify/local.env`                            | Required for approved local journeys; no worktree variation              | Report name-only missing/present state      | Founder-approved preservation/reconciliation         |
| `REQUIRED_MACHINE_LOCAL_NON_SECRET`  | Central authority or approved tracked default                     | Required only where the consumer cannot honestly default                 | Report name-only state and routing risk     | Founder-approved contract update                     |
| `OPTIONAL_LOCAL_INTEGRATION`         | Central authority only for an approved local/non-live integration | Optional; must disable honestly when absent                              | Report absent/present and integration risk  | Integration-specific authorization                   |
| `WORKTREE_SPECIFIC_OVERRIDE`         | Explicit test or temporary worktree invocation                    | May vary only for a recorded bounded reason                              | Report only when supplied to the diagnostic | Workstream owner and founder approval                |
| `TEST_ONLY`                          | Test/audit runner invocation                                      | Never shared local authority                                             | Report as test-only if found centrally      | Test-authority owner                                 |
| `PRODUCTION_ONLY_PROHIBITED_LOCALLY` | Provider/production runtime, never central local authority        | Prohibited locally                                                       | Report name as a blocker; never connect     | Deployment authority in Stage 4                      |
| `DEPRECATED_OR_STALE`                | No shared authority unless active use is proven                   | Do not add centrally                                                     | Report for disposition                      | Consumer owner or later cleanup authorization        |
| `UNKNOWN_PENDING_EVIDENCE`           | No authority assigned                                             | Do not add centrally                                                     | Report name as a warning                    | Focused evidence review                              |

The catalog includes runtime mode/routing, database and authentication, storage/media, email, payment, maps/AI/CMS, Redis/cache, feature tuning, test-only, provider/production metadata, and legacy/unknown names. Representative name groups are:

| Surface                      | Catalog names                                                                                                                    | Primary classification                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Runtime and routing          | `NODE_ENV`, `APP_ENV`, `PORT`, `APP_URL`, `FRONTEND_URL`, `VITE_API_URL`, `VITE_API_BASE_URL`, `VITE_APP_URL`, `VITE_DEPLOY_ENV` | Safe defaults or required local non-secret          |
| Database and authentication  | `DATABASE_URL`, `LOCAL_DEMO_AGENCY_PASSWORD`, `JWT_SECRET`, `SAVED_SEARCH_ACTION_TOKEN_SECRET`                                   | Required local secret or optional local integration |
| Storage and media            | `AWS_*`, `S3_BUCKET_NAME`, `CLOUDFRONT_URL`, `MEDIACONVERT_*`, `BILLING_PROOF_*`                                                 | Optional local integration                          |
| Email and notifications      | `RESEND_*`, `EMAIL_FROM`, `VITE_USE_MOCK_EMAILS`, `SAVED_SEARCH_SCHEDULER_*`                                                     | Optional local integration                          |
| Payments and billing         | `STRIPE_*`, `PAYSTACK_SECRET_KEY`, `BILLING_EFT_*`                                                                               | Optional local integration; non-live only           |
| Maps, AI, CMS, observability | `GOOGLE_*`, `VITE_GOOGLE_MAPS_API_KEY`, `OPENAI_API_KEY`, `CONTENTFUL_*`, `VITE_CMS_*`, `VITE_SENTRY_*`                          | Optional local integration                          |
| Cache and feature tuning     | `REDIS_*`, `CACHE_ENABLED`, `FEATURE_*`, `VITE_FEATURE_*`, `AUTOCOMPLETE_*`, `DISTRIBUTION_AFFORDABILITY_*`                      | Optional integration or tracked safe default        |
| Test/audit authority         | `LISTIFY_E2E_DATABASE_URL`, `LOCAL_SEED_*`, `CI`, `DOE_S1_BROWSER_AUDIT_DIR`                                                     | Test-only                                           |
| Provider/production          | `VERCEL_*`, `RAILWAY_*`, `TIDB_*`, `PROD_*`, `PROD`                                                                              | Production-only prohibited locally                  |
| Legacy/uncertain             | `DB_HOST`, `DB_NAME`, `DEV`, `MODE`, `BUILD_TIME`, `OWNER_OPEN_ID`, `OAUTH_SERVER_URL`, `API_SECRET`, `NUXT_PUBLIC_API_BASE`     | Deprecated/stale or unknown pending evidence        |

The complete name-level catalog is encoded in `scripts/localEnvironmentAuthorityContract.ts`; values are never encoded in the contract or tests.

## 5. Authoritative-location rules

The proposed complete machine-local authority remains:

`~/.config/property-listify/local.env`

It must be a regular file with mode `0600`, owned by the current effective user, and contain only names permitted by the contract. Ownership states are `OWNER_CURRENT_USER`, `OWNER_MISMATCH`, and `OWNER_UNAVAILABLE`; mismatch or unavailable ownership is a conservative compliance blocker. `.env.local` is intended to be an ignored symbolic link to that exact path for a worktree that is later approved for complete local preview use.

The contract does not authorize copying the control worktree’s regular file into the central authority. Existing regular files, incorrect links, and missing links are preserved until a separate founder-approved reconciliation decision.

The required local-variable set is loaded from `docs/database-authority/authority-manifest.json` through the existing typed manifest loader and validator. Stage 2B validates that the manifest retains the canonical database, credential, and four routing requirements; it extends that authority and does not replace or weaken it. A missing, malformed, or contradictory manifest is a known compliance failure.

## 6. Central-file structural contract

The diagnostic checks, without printing values:

- path existence and regular-file type;
- mode exactly `0600`;
- ownership equal to the current effective UID where supported;
- blank and comment handling;
- assignment-name syntax;
- duplicate names;
- unknown names;
- deprecated/stale names;
- test-only names;
- provider/production-prohibited names;
- missing required names;
- empty assignments;
- sanitized database-target classification.

Quoted values are parsed internally only to determine name-level status. They are never returned in human-readable or JSON output.

## 7. Worktree environment-state model

| State                       | Safe observation                                          | Severity                      | Stage 3 effect                                          | Future correction authority                  |
| --------------------------- | --------------------------------------------------------- | ----------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| `CANONICAL_LINK`            | Resolve `.env.local` without following values             | No structural blocker         | Eligible for link requirement, subject to full contract | Approved environment reconciliation          |
| `MISSING`                   | `lstat` reports no path                                   | Blocker for canonical preview | Blocks Stage 3                                          | Approved link creation                       |
| `REGULAR_FILE_CONFLICT`     | `lstat` reports regular file                              | Preservation blocker          | Blocks Stage 3                                          | Founder-approved preservation/reconciliation |
| `INCORRECT_LINK`            | Link resolves to an existing non-canonical target         | Preservation blocker          | Blocks Stage 3                                          | Founder-approved link correction             |
| `BROKEN_LINK`               | Link target does not exist                                | Unsafe/indeterminate          | Blocks Stage 3                                          | Founder-approved link correction             |
| `NON_FILE_PATH`             | Existing path is not a regular file or symlink            | Unsafe                        | Blocks Stage 3                                          | Owner review and separate correction         |
| `UNREADABLE`                | Metadata or target cannot be safely read                  | Indeterminate                 | Blocks Stage 3                                          | Owner/permission authority                   |
| `OUTSIDE_ALLOWED_AUTHORITY` | Symlink target is outside the central authority directory | High risk                     | Blocks Stage 3                                          | Founder-approved reconciliation              |
| `UNKNOWN`                   | Safe state cannot be established                          | Indeterminate                 | Blocks Stage 3                                          | Focused evidence review                      |

The diagnostic never replaces, removes, creates, unlocks, or repairs a path.

## 8. Diagnostic behavior and exit codes

Entry point:

`pnpm env:authority:status [--json] [--worktree <path>]`

The default target is the current worktree. An explicit target must resolve through Git to a repository root. The command does not scan all registered worktrees. Human output reports state, classifications, names, counts, blockers, warnings, and boundaries. JSON adds a stable contract version, timestamp, repository root, sanitized target classification, summaries, and exit code.

Exit semantics:

- `0`: requested diagnostic is structurally compliant;
- `1`: known compliance failure, such as a missing link or prohibited name;
- `2`: unsupported or indeterminate target/state.

Unsupported or indeterminate worktree resolution is caught and returned as a sanitized result with `targetClassification: UNSUPPORTED`, `stage3Eligibility: false`, and exit `2`; no stack trace is emitted.

The diagnostic makes no database or provider connection. Database-target compliance is a name-only URL classification; it is not a connectivity or migration check. An approved local target requires protocol `mysql:`, an approved local host, and exact pathname `/listify_local`; an approved test target requires protocol `mysql:`, an approved local host, and exact pathname `/listify_test`. Other protocols, extra path segments, malformed URLs, and remote hosts are not approved.

## 9. Database-target versus complete-application compliance

An approved local database target means only that `DATABASE_URL` parses to an approved local host and `listify_local` or `listify_test` database. It does not prove that frontend routing, authentication, media, mail, payments, cache, flags, or other integrations are complete.

Complete-application compliance additionally requires a valid canonical manifest, all manifest-declared required names, no unknown/deprecated/test-only/prohibited names, current ownership, an approved exact database target, and a safe worktree environment state. Stage 3 eligibility requires complete-application compliance and `CANONICAL_LINK`.

## 10. Stage 3 eligibility rules

Stage 3 remains unauthorized. A future status result may identify structural eligibility only when:

1. central authority is a safe regular file with mode `0600`;
2. assignments are syntactically valid and non-duplicated;
3. required names are present;
4. no unknown, deprecated, test-only, or locally prohibited names remain in central authority;
5. ownership is current and the database target is approved by the exact MySQL/local-path invariant;
6. the requested worktree has a canonical link;
7. no preservation conflict remains unresolved.

The result is a readiness signal, not permission to start services or create a preview.

## 11. Preservation-first future reconciliation requirements

No reconciliation was performed. A later separately authorized plan must first preserve metadata and a secure recovery copy outside Git, compare names and semantic groups without exposing values, classify each unique setting, and obtain founder approval for retain/retire/override decisions. A regular file or incorrect link must never be overwritten merely to make the diagnostic pass.

## 12. Security and redaction rules

The implementation does not print or serialize parsed values. It emits only variable names, sanitized state, host/database classification, counts, and boundaries. It does not read the user’s process environment as a fixture, load a provider SDK, open a database connection, start a service, or use a real central file in tests.

## 13. Test evidence

The focused suite `server/__tests__/localEnvironmentAuthorityStatus.test.ts` passes 11 tests covering:

- canonical, missing, regular-file, incorrect-link, broken-link, and non-file states;
- malformed assignments and duplicate names;
- test-only central names and canonical manifest-derived required routing names;
- malformed or unavailable canonical manifests;
- exact MySQL local/test target invariants and rejected protocols, paths, and hosts;
- current, mismatched, and unavailable central-file ownership;
- unsupported Git targets with sanitized exit code `2`;
- missing required names;
- unknown, deprecated, test-only, and production-prohibited names;
- approved local target versus complete-application compliance;
- deterministic JSON with an injected clock;
- no value emission;
- no file, link, permission, or fixture mutation.

## 14. Current control-worktree diagnostic result

**Claim:** The control worktree is not Stage 3-ready under the current contract.

**Mechanism:** The diagnostic was run once with `--worktree /home/edwardspc/Desktop/Dev/property-listify-main` after focused tests passed.

**Sequence:** Central and worktree metadata were read; names were parsed; database-target classification was performed without connecting; sanitized JSON was scanned for sensitive-value patterns.

**Evidence:** Exit code `1`; target `SUPPORTED`; `.env.local` state `REGULAR_FILE_CONFLICT`; central authority `REGULAR_FILE`, `SAFE_0600`, `OWNER_CURRENT_USER`, nine names; zero unknown, deprecated, test-only, prohibited, duplicate, or malformed names; database target `local`, approved, host `127.0.0.1`, database `listify_local`; complete-application compliance `false`; Stage 3 eligibility `false`. The only blocker is the preserved regular-file conflict, with a warning that reconciliation was not performed.

**Boundary:** This result does not authorize replacing the control file, creating a link, starting a service, checking migration state, or creating a preview.

## 15. Remaining unknowns

- Whether all optional integrations are needed for the MVP journeys.
- Which local media, email, payment, cache, and external integration settings are non-live and safely isolated.
- Whether any deprecated or unknown consumer remains active in a launch-critical journey.
- The founder-approved disposition of the control `.env.local` regular-file conflict.
- Hosted Vercel/Railway environment bindings, which belong to Stage 4.

## 16. Next authorized stage

Stage 2B remains the current implementation boundary until this change is reviewed and merged. Afterward, a separately authorized preservation/reconciliation plan may address named blockers. Stage 3 canonical integrated preview work must not begin automatically from this diagnostic.
