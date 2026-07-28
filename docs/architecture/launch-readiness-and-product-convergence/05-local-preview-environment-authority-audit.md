# Local Preview Environment Authority Audit

| Field | Authority |
| --- | --- |
| Status | **Stage 2A review closure. Environment reconciliation is not authorised.** |
| Audit base | `2550d42ded45804e1378ff9c7e44d3b1de709420` / tree `a66e071afebe617bad682485966b4c0a3f901706` |
| Scope | Local configuration selection and worktree linkage only. No environment, service, database, storage, deployment, or CI state was changed. |

## A. Executive verdict

**Verified:** a central machine-local environment authority exists at `~/.config/property-listify/local.env`, is a regular file owned by the local user with mode `0600`, and is recognised by the database-authority manifest and `scripts/localEnvironmentAuthority.ts`.

**Verified:** it is not used consistently. The control worktree has an ignored, mode-`0664` regular `.env.local` rather than the required link. The newly created Stage 2A worktree has no `.env.local`. Of 42 registered worktrees, none has the approved central link; 33 are missing it, eight have regular files, and one has an incorrect symlink.

**Verified:** the normal backend development bootstrap loads `.env` and then `.env.local`, with `.env.local` overriding `.env`. The control regular file therefore wins at runtime instead of the central authority.

**Decision:** a canonical integrated preview must not be created yet. The three Stage 2A review findings are addressed in this corrective documentation change and are ready for publication review. The next separately authorised slice must define the complete local-environment authority contract and implement non-mutating diagnostics; it must not reconcile worktree links.

The central nine-variable file cannot automatically replace the control seventy-seven-variable file. Some control-only variables may be obsolete or unnecessary, some may be essential, some may be production-dangerous, and some may have safe local fallbacks. Their existence does not justify copying all seventy-seven into the central file; their absence does not justify deleting them. Only names, categories, required behaviour, and sanitized validation states may be compared or documented—never secret values.

Principal risks are:

1. Replacing the control regular file would discard 69 variable names not present in the central file, including storage, payments, email, map, cache, and production-control groups.
2. Missing or divergent environment files can make two worktrees run materially different applications from the same Git tree.
3. Frontend fallbacks can silently route media or legacy UI paths to localhost, while server-side defaults enable some feature behaviour or storage assumptions.
4. Existing setup guidance still directs developers to copy regular `.env.local` files, conflicting with the later central-link authority.
5. The normal bootstrap is not an audit command because it can create a missing link and start/migrate/seed local MySQL. The mandatory status command is safe only after implementation review and only for its read-only approved-local/test path.

## B. Verified loading architecture

| Surface | Verified loading path | Precedence / consequence | Status |
| --- | --- | --- | --- |
| Frontend development and build | `vite.config.ts` sets `envDir` to repository root; `pnpm dev:frontend` and `pnpm build:frontend` invoke Vite. | **Inferred from Vite convention:** shell variables take precedence, then mode-specific and local files according to Vite's development/production mode. The repository does not call `loadEnv` itself. Only `VITE_*` values are exposed to browser code. | Partial |
| Backend development | `pnpm dev:backend` runs `server/_core/start.ts`; it calls `loadAppRuntimeEnv`. | **Verified:** runtime resolves `APP_ENV`, Railway/Vercel hints, then `NODE_ENV`; development loads `.env`, then `.env.local` with the latter overriding. | Conflicted |
| Backend staging/production | The same bootstrap loads `.env`, then `.env.staging` or `.env.production`; `pnpm start:prod` pins `NODE_ENV` and `APP_ENV` to production. | **Verified:** the environment-specific mode file is loaded with `override: true`, so it may replace existing Railway/Vercel process variables. Platform variables remain authoritative only when no later mode file overrides them or the relevant mode file is absent. This is a Stage 4 deployment-authority risk. | Partial / Stage 4 concern |
| Database-authority bootstrap | `pnpm db:authority:bootstrap:local` establishes/validates the central file, ensures the worktree link, loads `.env.local`, validates the exact local database target, then starts/waits/migrates/seeds/verifies MySQL. | Mutating; not run. It preserves regular-file conflicts by throwing rather than overwriting. | Verified tooling, unsafe for audit |
| Database-authority status | `pnpm db:authority:status` reads the central file and link state, then opens a MySQL connection only after classifying the target as approved local/test. | **Run in Stage 2A review closure from the control worktree:** manifest validation passed; central file found with safe permissions; worktree state was `conflicting-file`; required local states were configured; target classified approved local; the migration ledger was reachable. It performed only a read-only ledger `SELECT`. | Verified mandatory orientation |
| Other database/utility scripts | `scripts/localDbWorkflow.ts` explicitly loads `.env.local` without override; many legacy scripts use bare `dotenv.config()` (default `.env`) or their own explicit orders. | No single repository-wide script-loading authority exists. Some scripts can select a different configuration from the backend. | Conflicted |
| Tests | `vitest.setup.ts` loads `.env.test` with override and can connect to/migrate the test database. Focused integration and Playwright configurations also load `.env.local`, sometimes then `.env.playwright.local` with override. | Not run; default test execution is not safe for this audit. Test loading is intentionally distinct but inconsistent across focused suites. | Partial |
| Vercel build | `vercel.json` invokes `pnpm build:frontend`; that runs `vite build`. | **Unknown:** actual platform environment values and preview isolation. The tracked `.env.vercel.example` is only a template. | Outside Stage 2A |
| Railway runtime | `railway.json` invokes `pnpm build:railway` and `pnpm start:prod`. | **Verified conflict:** `docs/railway-production-startup.md` instead names `pnpm start:prod:with-migrations`, which is not present in `package.json` or `railway.json`. Actual deployed service settings are **unknown**. | Stage 4 concern |

The frontend and backend therefore do not presently share one proven loading authority. The backend's explicit development rule makes a regular control `.env.local` authoritative for backend development; Vite's root `envDir` makes the same filename relevant to frontend development, subject to Vite's standard mode precedence.

## C. Central environment authority

### Database environment authority

| Property | Verified result |
| --- | --- |
| Path | `~/.config/property-listify/local.env` |
| Type / owner / mode | Regular file; local user ownership; `0600` |
| Timestamp | Present and modified on 2026-07-28; timestamp recorded during the audit without reading values into this document. |
| Structure | 9 variable names, no blanks, duplicates, or malformed assignment lines. |
| Names | `APP_ENV`, `APP_URL`, `DATABASE_URL`, `FRONTEND_URL`, `JWT_SECRET`, `LOCAL_DEMO_AGENCY_PASSWORD`, `NODE_ENV`, `VITE_API_BASE_URL`, `VITE_API_URL` |
| Recognised by | `docs/database-authority/authority-manifest.json`, `scripts/localEnvironmentAuthority.ts`, `scripts/databaseAuthorityStatus.ts`, and `scripts/databaseAuthorityBootstrapLocal.ts` |
| Intended role | Single machine-local development authority shared by ignored worktree `.env.local` symbolic links. |
| Current trust level | **Partial:** secure file mode and recognised structure; actual required-value/target validation was not run because the TypeScript runtime is unavailable in this new worktree and the status command would connect to MySQL. |

No environment values, credentials, URLs, or hashes are recorded here.

### Mandatory database-authority orientation (review closure)

Before execution, `AGENTS.md`, `package.json`, `scripts/databaseAuthorityStatus.ts`, `scripts/localEnvironmentAuthority.ts`, and the database-authority entry contract were inspected. The invoked path validates the manifest and file/link metadata, classifies the target before connecting, and returns without connection for unapproved targets. For an approved local/test target it performs only a migration-ledger `SELECT`; it does not run migrations, seed data, create or replace links, change permissions, or start/stop MySQL or Docker.

`pnpm db:authority:status` was then run from the clean control worktree during review closure. Sanitized result: authority manifest valid; central environment found with safe permissions; control worktree link state `conflicting-file`; required local variable states configured; target classification `local (approved)`; migration ledger reachable with the canonical baseline recorded. No secret value, credential-bearing URL, remote target, filesystem mutation, database mutation, or service lifecycle action occurred.

### Complete application environment authority

**Not yet established.** The nine-variable central file and its database-authority tooling provide meaningful database-target and local-authority controls. They do not prove that the central file contains every variable needed for a complete frontend, backend, database, storage, authentication, email, payment, maps, Redis, feature-flag, and integration preview. The control file contains sixty-nine additional names whose disposition remains unknown.

### Worktree linkage enforcement

**Missing `.env.local`:** the canonical database-authority bootstrap may establish the approved central link when that bootstrap is separately authorised for a database workflow. This establishes database-workflow linkage only; it does not prove complete application-environment authority or authorise canonical preview creation.

**Regular-file conflict:** preserve it; do not overwrite it. It requires variable-contract classification and separately approved reconciliation.

**Incorrect symlink:** preserve and investigate it. It requires separately approved reconciliation.

**Correct approved symlink:** it may be accepted for an authorised database-authority workflow, but complete application-contract compliance must still be assessed independently.

## D. Worktree linkage inventory

All paths in the **Worktree** column are relative to `/home/edwardspc/Desktop/Dev/`; together they are the complete registered-worktree paths. Expected target for every approved linked worktree: `~/.config/property-listify/local.env`. `correct symlink` means a resolving symbolic link to that path. `preserve before action` means a regular file exists and must not be replaced without a recorded preservation/reconciliation decision.

| Worktree | Branch/state | `.env.local` state | Mode / target | Git state | Risk |
| --- | --- | --- | --- | --- | --- |
| `real_estate_portal_clone` | `codex/navigation-cleanup-phase-2-pr` | regular file | `0777` | dirty | preserve before action |
| `listify-aae-s1b-proposition-architecture` | `audit/aae-s1b-master-audience-propositions` | missing | — | clean | missing authority |
| `listify-agent-worktree-governance-audit` | `audit/agent-worktree-governance-current-state` | missing | — | clean | missing authority |
| `listify-agent-worktree-governance-foundation` | `feat/agent-worktree-governance-foundation` | missing | — | clean | missing authority |
| `listify-commercial-proposition-architecture` | `audit/aae-s1-commercial-proposition-architecture` | missing | — | clean | missing authority |
| `listify-commercial-value-proposition-authority` | `audit/aae-s0-commercial-value-proposition-authority` | missing | — | clean | missing authority |
| `listify-dba-test-infra-repair` | `fix/dba-test-database-rebuild-authority` | missing | — | clean | missing authority |
| `listify-dba-ti-s1a-review-closure` | `fix/dba-test-rebuild-review-closure` | missing | — | clean | missing authority |
| `listify-developer-listing-engine` | `feature/dle-publication-lead-contract-hardening` | regular file | `0664` | dirty | preserve before action |
| `listify-development-delivery-updates-recovery` | `recovery/development-delivery-updates-control-rescue-20260721` | missing | — | dirty | missing authority |
| `listify-development-home-v1` | `feat/developer-development-home-v1` | missing | — | dirty | missing authority |
| `listify-dle-reconstruction` | `recovery/property-listing-engine-continuation-2026-07-02` | missing | — | dirty | missing authority |
| `listify-doe-s2-audit` | `audit/doe-s2-structured-updates-milestones` | missing | — | dirty | missing authority |
| `listify-explore-authority` | `feat/explore-option-a-authority` | missing | — | dirty | missing authority |
| `listify-explore-discovery` | `docs/explore-discovery-canonical-foundation` | missing | — | clean | missing authority |
| `listify-explore-phase-0` | `feat/explore-option-a-phase-0` | missing | — | clean | missing authority |
| `listify-explore-phase-1` | `feat/explore-option-a-phase-1` | missing | — | clean | missing authority |
| `listify-fpe-s1-feedback-id-fix` | `fix/fpe-s1-feedback-state-ids` | missing | — | clean | missing authority |
| `listify-fpe-s1-shared-foundation` | `feat/fpe-s1-shared-frontend-foundation` | missing | — | clean | missing authority |
| `listify-frontend-product-experience-audit` | `audit/frontend-product-experience-v1` | regular file | `0600` | clean | preserve before action |
| `listify-homepage-improvements` | `codex/homepage-clarity-trust` | incorrect symlink | `0777` → `real_estate_portal_clone/.env.local` | clean | conflicted |
| `listify-intelligent-listing-engine-v2` | `feature/ile-phase3d-draft-ui` | regular file | `0664` | clean | preserve before action |
| `listify-launch-agency-founding-access` | `feat/launch-agency-founding-access` | missing | — | dirty | missing authority |
| `listify-launch-readiness-audit` | `audit/launch-readiness-product-convergence` | missing | — | clean | missing authority |
| `listify-listing-wizard-overhaul` | `feature/listing-wizard-overhaul` | missing | — | dirty | missing authority |
| `listify-local-preview-authority` | `fix/local-preview-environment-authority` | missing | — | clean | missing authority |
| `listify-main-navigation-restoration` | `feat/main-platform-navigation-restoration` | missing | — | clean | missing authority |
| `listify-nav-s1-review-closure` | `fix/nav-s1-review-closure` | missing | — | clean | missing authority |
| `listify-plds-f1-canonical-frontend-foundation` | `feat/plds-f1-canonical-frontend-foundation` | missing | — | dirty | missing authority |
| `listify-plds-r1-units-audit` | `audit/plds-r1-units-responsive-scaling` | missing | — | clean | missing authority |
| `listify-pxf-s0-audit` | `audit/pxf-s0-whole-product-readiness` | missing | — | clean | missing authority |
| `listify-pxf-s1` | `feat/pxf-s1-public-prospect-convergence` | missing | — | clean | missing authority |
| `listify-secret-exposure-containment` | `security/secret-exposure-containment-20260726` | missing | — | clean | missing authority |
| `listify-services-engine-clean` | detached | regular file | `0664` | dirty | preserve before action |
| `listify-services-engine-phase0` | `feature/services-engine-phase0` | missing | — | dirty | missing authority |
| `listify-single-property-engine` | detached | missing | — | clean | missing authority |
| `property-listify-aalc-s1` | `aalc-s1-canonical-listing-publication-entitlement` | missing | — | clean | missing authority |
| `property-listify-aalc-s2` | `aalc-s2-retire-legacy-property-create` | missing | — | clean | missing authority |
| `property-listify-aalc-s3` | `aalc-s3-principal-bootstrap-authority` | missing | — | clean | missing authority |
| `property-listify-main` | `main` | regular file | `0664` | clean | preserve before action |
| `property-listify-prospect-process-fix` | `fix/prospect-journey-process-group-lifecycle` | missing | — | clean | missing authority |
| `property-listify-saved-search-ci-repair` | `fix/saved-search-ci-baseline` | missing | — | dirty | missing authority |

No inventory entry was altered. The Stage 2A worktree was created without an `.env.local`, proving ordinary `git worktree add` does not establish the required link. A missing link is not itself a conflicting-file condition: it may later be established only through the separately authorised canonical database bootstrap, and that remains database-workflow linkage rather than complete application authority.

## E. Control-worktree conflict

The control path `property-listify-main/.env.local` is an ignored, untracked regular file, mode `0664`, owned by the local user. It has 77 variable names, no duplicates, and no malformed lines; the central authority has nine names. Eight names overlap. Sixty-nine names exist only in the control file; `LOCAL_DEMO_AGENCY_PASSWORD` exists only in the central authority.

The central file's required linkage model makes the control file a conflict, not a safe replacement target. In development, `server/_core/runtimeBootstrap.ts` loads `.env.local` after `.env` with override, so the regular file is the backend's effective source. Vite also uses the repository root as its environment directory.

Before any repair, preserve a metadata record and a secure recovery copy outside Git, compare variable names and semantic groups without exposing values, and obtain Edward's approval for each unique group to retain, retire, or move. Replacing this file now could remove active local integration settings or silently change a developer's database, media, email, payment, map, cache, or feature-flag behaviour.

`.env.local` is ignored and currently untracked in both control and Stage 2A worktrees. Ignore rules reduce accidental tracking but do not make force-add technically impossible; no separate worktree-creation hook was found in this audit.

## F. Variable authority map

The following is a name-only map from the control-file inventory and tracked templates. It identifies authority/risk, not values.

| Group | Names observed | Local-preview authority and risk |
| --- | --- | --- |
| Runtime and public routing | `NODE_ENV`, `APP_ENV`, `PORT`, `APP_URL`, `FRONTEND_URL`, `BASE_URL`, `NEXT_PUBLIC_APP_URL`, `API_URL`, `VITE_API_URL`, `VITE_API_BASE_URL`, `VITE_APP_URL`, `VITE_APP_ENV`, `VITE_DEPLOY_ENV`, `VITE_APP_ID` | Core. Wrong values change backend mode, cookies/CORS, frontend API routing, and visible application identity. Browser-exposed `VITE_*` must never contain secrets. |
| Database and local seed | `DATABASE_URL`, `LOCAL_DEMO_AGENCY_PASSWORD`, `LOCAL_SEED_ALLOWED`, `SKIP_DB_INIT` | Highest risk. Must be approved local `listify_local` for local preview; test workflows require isolated `listify_test`; no shared, Railway, TiDB, staging, or production target. |
| Authentication and privileged bootstrap | `JWT_SECRET`, `OWNER_OPEN_ID`, `OAUTH_SERVER_URL`, `PROD_SUPERADMIN_EMAIL`, `PROD_SUPERADMIN_PASSWORD` | Secret/privileged. Missing `JWT_SECRET` breaks authentication; production bootstrap controls must remain absent/disabled locally. |
| Storage and media | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `S3_BUCKET_NAME`, `CLOUDFRONT_URL`, `VITE_CLOUDFRONT_URL`, `VITE_ASSETS_BASE_URL`, `MAX_IMAGE_SIZE_MB`, `ENABLE_VIDEO_PIPELINE`, `MEDIACONVERT_ENDPOINT`, `MEDIACONVERT_ROLE_ARN`, `MEDIA_RULES_PATH` | High risk. Current local/development versus production media separation is not yet established; defaults and static URLs can make local media appear to use public infrastructure. |
| Email and notifications | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `EMAIL_FROM`, `VITE_USE_MOCK_EMAILS`, `SAVED_SEARCH_ACTION_TOKEN_SECRET`, `SAVED_SEARCH_SCHEDULER_ENABLED`, `SAVED_SEARCH_SCHEDULER_INTERVAL_MS` | High risk. Missing/false configuration may fall back to mock behaviour or disable delivery; live credentials could send real messages. |
| Payments and billing | `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BILLING_*` template variables | High risk. Local preview needs explicit non-live/mocked behaviour; production billing settings must not enter the shared local authority. |
| Maps, AI, CMS, third parties | `GOOGLE_*`, `VITE_GOOGLE_MAPS_API_KEY`, `OPENAI_API_KEY`, `CONTENTFUL_SPACE_ID`, `CONTENTFUL_API_KEY`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | External-cost/data risk. Absence can produce feature failure or client placeholders; browser `VITE_*` keys are public by design and need scoped restrictions. |
| Redis/cache | `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` | High risk. Backend initialization may depend on cache configuration; a shared endpoint would invalidate local isolation. |
| Feature flags/tuning | `FEATURE_DISTRIBUTION_NETWORK`, `VITE_FEATURE_TEAM_INVITATIONS`, `VITE_FEATURE_AUTO_SEND_INVITES`, `VITE_MAX_TEAM_INVITATIONS_PER_AGENCY`, `VITE_ONBOARDING_DRAFT_EXPIRY_HOURS`, `AUTOCOMPLETE_*`, `DISTRIBUTION_AFFORDABILITY_*` | Product-parity risk. Several defaults enable behaviour when values are absent, so a missing flag can be misleading rather than visibly failing. |
| Production/deployment metadata | `PROD`, `PROD_RESET_ENABLED`, `PROD_RESET_CONFIRM`, `CI`, `DEV`, `MODE`, `VERCEL_*`, `GITHUB_SHA`, `COMMIT_SHA`, `RAILWAY_*` | Must not be centrally shared as local values. Runtime bootstrap reads platform hints before `NODE_ENV`; incorrect values could select production/staging loading paths. |

Verified fallback examples: `client/src/lib/mediaUtils.ts` falls back to a localhost API for media when `VITE_API_URL` is absent; `client/src/const.ts` supplies localhost/default UI values; `client/src/lib/env.contract.ts` fails closed for one API-contract path; and server `ENV` defaults some feature/storage values. A missing variable therefore does not reliably mean a visible startup failure.

## G. Tooling assessment

| Tool / document | Verified behaviour | Audit suitability |
| --- | --- | --- |
| `scripts/localEnvironmentAuthority.ts` | Defines central path, required variables, `0600` requirement, approved local database hosts, link inspection, and preservation-first link creation. It refuses normal files and incorrect links. | Library has focused tests in `scripts/__tests__/localEnvironmentAuthority.test.ts`; no standalone read-only CLI was found. |
| `scripts/databaseAuthorityBootstrapLocal.ts` | Can create central file, create a missing worktree symlink, then start/wait/migrate/seed/verify local MySQL. | Mutating; deliberately not run. |
| `scripts/databaseAuthorityStatus.ts` | Validates manifest, reads central/link state, classifies target, and queries migration ledger only for approved local/test targets. | Inspected and run during review closure. The observed path performed a read-only local ledger query and returned sanitized authority status. |
| `scripts/localDbWorkflow.ts` | Validates local target and can start, verify, or reprovision database. | `target` still reads `.env.local`; other paths connect/mutate. Deliberately not run. |
| `.gitignore` | Ignores `.env`, `.env.local`, mode-specific environment files, and Vercel local files. | Verified; not sufficient to prevent deliberate force-add. |
| `docs/local-development-setup.md` | Documents regular-file copy setup and older local workflows. | Conflicts with central-link policy and needs later reconciliation after Stage 2B design approval. |

The authority library has explicit preservation protections, but the workflow has missing capabilities: a non-connecting `status` mode, a dry-run/plan for one worktree, a safe name-only reconciliation report, automatic worktree-link integration, and drift detection across registered worktrees. The new worktree proves no automatic integration currently exists. A future diagnostic must not treat the existing nine-variable central file as the complete application authority until the Stage 2B contract is approved.

## H. Recommended final authority model

1. Stage 2B must first define the complete local-environment authority contract. Only then can it decide whether `~/.config/property-listify/local.env` remains the single complete machine-local authority, which names it contains, and which approved worktree overrides are permitted.
2. The central file's database-target controls remain meaningful, mode exactly `0600` remains required, and no production/deployment, production storage, live payment, or shared third-party credential may be copied into it without later explicit authority.
3. A future diagnostic must separately report central-file structural compliance, database-target compliance, complete-application contract compliance, worktree-link state, conflict-preservation requirements, production-target risk, and missing/optional/deprecated/unknown variables. It must not treat the nine-variable file as complete application authority before the contract is approved.
4. A separately authorised database workflow may use the canonical bootstrap to establish a missing approved link. Only after the complete contract and preservation plan are approved may a future slice decide whether an active runtime worktree should use that link for complete application preview. Documentation-only worktrees may remain missing it.
5. Never overwrite a regular file or incorrect link. First record metadata and variable names, create an owner-approved secure recovery copy outside Git, classify each unique setting, and approve its disposition. No Stage 2A or Stage 2B diagnostic may perform this reconciliation.
6. Treat database target validation as a mandatory gate before startup, migration, seed, or browser testing. Local preview may use only approved local development data; test workflows need their own exact test target.
7. Candidate verification should later record the approved environment-contract version, sanitized target classification, migration state, and feature/configuration manifest alongside candidate commit/tree identity.

## I. Proposed repair sequence

| Step | Objective and likely paths | State change | Validation / preservation | Edward gate |
| --- | --- | --- | --- | --- |
| 1 | Stage 2B: define the complete variable-by-variable local-environment authority contract and implement only non-mutating diagnostics. | Repository source only | No link creation; name-only/sanitized output; any database status path must be separately inspected and limited to approved local/test read-only behaviour; focused tests isolated from real machine files. | Approve contract and diagnostic design. |
| 2 | Produce a control-worktree preservation and disposition plan for `/home/edwardspc/Desktop/Dev/property-listify-main/.env.local` and the central file. | None | Group-by-group decision; no values in reports or source; secure recovery procedure defined but not executed. | Approve exact retain/retire/override decisions. |
| 3 | Later: reconcile approved development-only values into the central authority. | Machine-local environment only | Approved contract and preservation evidence; database target classified approved local; no service starts. | Separate repair approval. |
| 4 | Later: replace only the named control conflict with an approved link after preservation evidence. | One machine-local symlink | Verify target/resolution, ignored/untracked state, permissions, and no unrelated diff. | Separate control-repair approval. |
| 5 | Later: add safe worktree-creation integration and drift detection. | Repository source and future new-worktree setup only | Tests prove missing-link handling, conflict refusal, incorrect-link refusal, and no broad repair. | Separate automation approval. |

Rollback is preservation-first: restore the saved regular file only in the explicitly approved worktree and remove only the newly created link. Do not use reset, clean, or worktree cleanup as an environment-repair mechanism.

## J. Canonical-preview readiness decision

**Stage 2A review findings closed and ready for publication review. Ready for target-authority definition and non-mutating diagnostic implementation. Not ready for `.env.local` reconciliation. Not ready for canonical preview creation.**

## K. Future Stage 2B objective and open questions

Stage 2B is a future, separately authorised slice to define the **complete local-environment authority contract**. For every relevant variable name or group, it must assign one of these categories: required shared local authority; required secret local authority; safe tracked default; optional development integration; worktree-specific temporary override; test-only; production-only and prohibited locally; deprecated or stale candidate; or unknown pending evidence.

For each classification, Stage 2B must determine the consuming runtime, canonical-preview need, absence/fallback behaviour and whether it is honest, production-target risk, authoritative location, permitted worktree variation, and a value-safe validation method. It must not copy or document secret values.

Open questions:

| Question | Why it matters | Recommended default |
| --- | --- | --- |
| Which of the 69 control-only names are still required for launch-local journeys? | They cannot be discarded safely, but copying all into the central file could preserve live/shared integration risk. | Retain only names proven necessary for approved local journeys; use development-specific substitutes or explicit absence for everything else. |
| Is any local media credential/bucket currently shared with production? | It determines whether local testing can alter or expose public media. | Assume unsafe until Stage 5 proves separate development storage. |
| Which active worktrees require a runtime environment versus documentation-only inspection? | Broad link repair would alter unrelated workstreams. | Repair only the control worktree first; opt in other worktrees individually. |
| What are the actual Railway and Vercel environment bindings? | Repository files cannot prove hosted environment selection or preview isolation. | Keep them outside Stage 2B; verify in Stage 4 with read-only provider inspection. |
