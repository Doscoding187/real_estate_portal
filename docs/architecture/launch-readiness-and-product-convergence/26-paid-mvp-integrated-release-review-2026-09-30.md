# Paid MVP integrated release — senior review packet

**Disposition: READY FOR SENIOR INTEGRATION REVIEW, subject to exact-head PR checks. Paid launch remains NO-GO.** October 5–7 is a conditional staffed opening window. This work composes accepted product and reviewed database/geography engineering; it does not close hosted, operational, independent-review or opening gates.

## Source, ownership and provenance

| Item | Identity |
| --- | --- |
| Published integration base | `4e012b3044628fc06da7489c0055e9ce01bdc8d9`, refreshed with `git fetch origin main` and GitHub main read; no newer main delta |
| Task branch | `feat/paid-mvp-integrated-release-20260930` |
| Task worktree | `/home/edwardspc/Desktop/Dev/worktrees/property-listify-paid-mvp-integrated-release-20260930` |
| Accepted paid input | `a05868c66f493e3cbc972a119074c91a10797777`, tree `b21f454e215d8b02129e4daa14ba6f8d338406d1` |
| Reviewed database/geography input | `b625a6dd0be7b105e100383dbc8f919a64d8b0bb`, tree `bb492b81293209136547b523bb64e81b26f224ee`, PR #582 still draft/open at that exact head |
| Composition | Merge paid anchor into verified base (`5c3f7eab`), then merge database anchor (`227b07ed`); both reviewed anchors are ancestors. No branch-tip substitution. |
| Bounded integration correction | `b1c7f6f7`: add Node 22 JSON import attribute to rehearsal authorization. |
| Fixture correction | `0e7cd93c`: four explicit canonical product keys in existing invitation/publication fixtures; no runtime relaxation. |
| Tested source anchor | `0e7cd93cd36f5f93423d5d0b16530e94775b49e3`; tree `a662fa561a5eed52ce82c25750d3382a491050fa` before final documentation/evidence commit. Browser runs used the same runtime source at `b1c7f6f7`; only test fixtures changed afterward. |
| Draft PR | [#583](https://github.com/Doscoding187/real_estate_portal/pull/583), task-owned, base `main`; no merge authorized. |
| Later verification corrections | `0a2d511c`: catalog fixture product keys and explicit configured CI server inventory; `fbf8ce2b`: synthetic CI signing key and contained synthetic Places transport. |
| Final PR identity | Obtain the final commit/tree from the PR head and `git rev-parse HEAD HEAD^{tree}`; final evidence records the verification source separately to avoid a self-referential commit hash. |

[Source provenance](evidence/paid-mvp-integration-2026-09-30/source-provenance.json) records each imported artifact's original absolute path, source HEAD and SHA-256. All nine staged B16 source files equal their contents in `a05868c6`; they were **not** reapplied. Relevant historical B03–B07/PLE evidence was copied byte-for-byte. The B14 accepted procedure has digest `80545f1092297fb0bf7d634ed54005be45326d49bc634f0fa3d3a610d73b3acf`. B15 founder facts v0.6 and review copy v0.4 are preserved as drafts, including Edward's review ownership and supplied contacts; none is exact-copy approval. The September 30 audit supersedes old B09 import/census planning with fresh Azure accounts and TiDB archival.

No files in other worktrees were staged, committed, reset, cleaned, moved or deleted. The existing shared native MySQL service was already running; this work created and later recycled only its own collision-resistant disposable target. Other application databases and the quarantined `listify_local` were untouched.

## Conflict resolutions and integration defects

| File | Resolution | Accepted contract preserved |
| --- | --- | --- |
| `server/_core/databaseAuthority/context.ts` | Retained reviewed registration of the protected recovery target and exact purpose/resource-bound rehearsal classification alongside the existing Azure classification. | No generic runtime access to rehearsal targets; protected operations still require exact authority. |
| `server/_core/databaseAuthority/__tests__/contextAuthorization.test.ts` | Retained all paid candidate's B08 identity/grant negative tests and database candidate's rehearsal/recovery coverage; reconciled formatting. | Both exact identity protections and newer protected-target rules remain executable. |
| `server/migrations/runSqlMigrations.ts` | Use database candidate's verified-OFF fast path; change GIPK only when currently ON, then recheck required settings and same connection. | Restricted CI identity need not acquire unnecessary privileges; immutable-baseline safeguards and visible failure remain. |
| `server/migrations/__tests__/runSqlMigrations.test.ts` | Retained additional OFF-session, connection-change and state-change negatives. | Session optimization cannot bypass identity/state verification. |
| `server/_core/databaseAuthority/__tests__/schemaCongruency.test.ts` | Retained newer unknown-table/case-fold collision and invalid-setting negatives plus existing coverage. | Physical drift is reported; canonical names do not fold ambiguously. |
| `server/__tests__/contract.database-final-closure-authority.test.ts` | Include both exact B08 inspection and bounded archive modules in the source probe inventory. | Both reviewed diagnostic/preservation paths are present; no alternate-schema runtime selection added. |

Automatic merges were inspected at overlapping authorization/connection/readiness/CLI and onboarding paths. They retain exact B08 credentials/grants, newer bounded archive/rehearsal factories, commercial and geography reference adapters, accepted contained fixtures and the database candidate's concurrent fresh-onboarding creation. `userRouter` retains paid billable-account behavior while using canonical race-safe onboarding creation. Search discovery contains reviewed geography resolution and accepted publication eligibility.

Execution found the following runtime and test-setup issues:

- **Node 22 browser import failure:** the rehearsal module's bare JSON import prevented Playwright from discovering any journey. Adding `with { type: 'json' }` fixes module loading. Typecheck and all 429 authority tests pass after this fix, and all three browser journeys run successfully. The authorization record's contents and expiry checks are unchanged.
- **Stale test fixtures:** two existing unit files supplied named Launch Access plans without mandatory `commercial_product_key`. The strict accepted product check correctly rejected them. Four fixture records now carry the exact product key; all 35 affected tests pass. No name-based fallback or legacy billing behavior was added.
- **Broader test setup:** the catalog audience fixtures also lacked three explicit product keys; these were corrected. The CI test job now supplies a synthetic signing key before module import so production-mode stale-session rejection actually executes. Synthetic Google Place IDs now use a local rejected transport response in the database hierarchy test, avoiding a live provider request and timeout. All 27 affected cases pass; no runtime behavior was relaxed.
- **CI role-fixture ordering:** the scenario creates a canonical super-admin. CI now executes all five B07 role/session/audit cases on the fresh unseeded target before reference/scenario preparation, then excludes that already-run file from the seeded server batch. Vitest 2 workspace projects ignored the CLI `--exclude` option, so CI now derives the configured server file inventory and removes only the role file already run in full. The 416-file selected inventory was verified locally. No canonical reviewer is deleted or demoted, and no case is skipped.

## Fresh validation and limits

| Check | Result / boundary |
| --- | --- |
| Typecheck | `pnpm type-check` passed; repeated after the runtime import fix. |
| Lint | `pnpm lint`: zero errors, 13,420 existing warnings. Changed integration files also lint with zero errors. No broad warning cleanup. |
| Build | `pnpm build` passed. The later runtime-only import fix does not change frontend build inputs. |
| TypeScript suppression baseline | `pnpm lint:tsnocheck-baseline`: 69 allowlisted files, no drift. |
| Database Authority static gate | `pnpm db:authority:check` passed, including 47 files / 429 tests, migration tree, utilities, lifecycle, schema sanity and inventory. Full authority suite passed again after JSON correction. |
| Canonical migration identity | Both reviewed anchors and combined candidate have byte-identical active SQL and manifest through 0094; see [migration identity](evidence/paid-mvp-integration-2026-09-30/migration-identity.json). |
| Fresh physical MySQL | Governed worktree target migrated from `none` through `0094_content_topics_primary_key.sql`; [fresh migration](evidence/paid-mvp-integration-2026-09-30/fresh-migration.json). Verified OFF GIPK, required-primary-key OFF, UTC and connection identity. |
| Physical schema and database contract | Congruency passes; `pnpm db:verify:ci` passes. [Schema evidence](evidence/paid-mvp-integration-2026-09-30/schema-congruency.json), [DB contract](evidence/paid-mvp-integration-2026-09-30/database-contract.json). |
| Geography | Catalog: 1,414 runtime rows; canonical reference verify: 9 provinces, 340 cities, 1,089 suburbs. Artifact probes 1,705/1,705. Location contracts: 5 files / 44 tests. |
| Canonical foundation/scenario | Three exact products/amounts/90-day terms verified. Full supported post-migration consumer sequence passes reference/foundation/scenario, distribution, physical congruency and Search-to-Lead application readiness on the freshly migrated target. |
| Changed client contracts | 52 files / 237 tests pass. |
| Shared policy/fixtures | 10 files / 103 tests pass after four fixture corrections. Includes sales pause, unsupported products, term semantics, storage guards and fresh-onboarding race behavior. |
| Agent browser | 2/2 pass on composed runtime. |
| Agency/member browser | 1/1 complete joined journey passes, including invitation/membership, publication, enquiry/follow-up and revocation. |
| Developer browser | 1/1 complete joined journey passes, including reviewed geography selections, organisation/payment/media/unit publication and enquiry/follow-up/expiry. |
| Shared database contracts | Initial matrix: 12 files / 107 tests pass; last-admin file's two sole-admin assertions fail on a target containing canonical/browser reviewers. Fresh unseeded target: 1 file / 5 tests pass; all shared contracts pass with their correct fixture boundaries. |
| Broader server inventory | 417 files: initial 2,619 pass, 5 fail, 67 existing skips. All five failures rechecked successfully after the documented setup corrections (27 affected tests plus all 5 isolated role tests). [Broad result](evidence/paid-mvp-integration-2026-09-30/broad-server-result.json) lists file counts and every existing skipped case. This is not claimed as a single green full-suite run. |
| Exact PR CI | Record check status on the final PR head; earlier #582 checks are historical input evidence and never attributed to this combined tree. |

[Sanitized case results](evidence/paid-mvp-integration-2026-09-30/test-case-results.json) retain titles/statuses and raw-output hashes. Private browser/runtime/mail captures remain outside Git. Initial failed executions are preserved as evidence boundaries: static worker RPC timeouts and a socket-recovery race under machine memory contention passed on rerun; scenario verification initially used development mode and was rerun read-only in required test mode; paid fixture negatives were corrected with canonical metadata; B07 sole-admin tests require a fresh target without reviewer accounts. No failed migration was retried and no ledger/data repair was performed.

The automatic Vercel Preview check failed on the integrated draft. Authenticated Vercel build logs are unavailable in this session, so its cause is unconfirmed; local frontend build and GitHub Frontend Build Guard pass. Before merge, obtain the exact-head preview build logs, resolve the failure or document an independently approved check disposition, and repeat the check. No provider settings were changed and no manual deployment was invoked.

Local mail capture, media proxy/adapter, in-memory Redis and disposable native MySQL prove application composition only. They do not prove Resend receipt, private hosted proof storage, durable production media, routed live enquiries, Azure deployment/cutover, recovery capacity or legal-copy acceptance. B17's 24-hour exercise and recovery objectives remain unchanged. Exact geography regeneration sources remain unavailable in hermetic CI; the approved frozen projection's integrity/probes are verified instead, with source recovery still separately governed.

## Pre-merge containment checklist — requires a separate operational action

A fresh read-only `get-service-config` observed the production binding:

- Project `successful-tranquility`, ID `8cdd7515-ddd2-4252-bbee-df5a5c209d4b`.
- Environment `production`, ID `63070d99-357a-40ba-99c3-6d1368f61652`.
- API service `real_estate_portal`, ID `db88a720-2d1f-4afc-a3a8-6228b6b08d3e`.
- Source `Doscoding187/real_estate_portal`, branch `main`, `source.checkSuites=false`; no staged change.

[Observation](evidence/paid-mvp-integration-2026-09-30/railway-source-observation.json) records the boundary. This read establishes the branch and disabled CI-wait setting; it does not prove an automatic-deployment hold. A later read of the broader service inventory/API was unavailable due DNS, so no fresh complete writer/service inventory is claimed.

Before a merge intended to remain undeployed:

1. Name the release operator/reviewer and record the exact approved PR head plus intended merge method. Refresh published main; investigate any new delta before merging.
2. In the API service's **Settings → GitHub source/autodeploy configuration**, read the current branch, autodeploy state and **Wait for CI**. Record a sanitized timestamped capture and current deployment ID/SHA.
3. Under separate authorization, click **Disable** for automatic deployments. Verify readback that autodeploy is disabled and no candidate deployment is queued/running. `checkSuites=true` alone is insufficient to hold a green main merge for cutover.
4. Inventory every service/environment linked to this repo/main, workers/jobs, alternate CI/CD hooks and Vercel production promotion. Arrange equivalent holds where applicable; document any intentionally allowed preview behavior separately.
5. Verify production commercial activation/new sales stay closed, preserve current access/data, and confirm no release command or worker startup applies migrations/reference data implicitly.
6. Complete independent whole-change review and required final-head checks. Merge only under the later release authorization. Record resulting main SHA/tree, rerun post-merge checks while holds remain, and prove the active deployment has not advanced.
7. Keep holds through approved Azure geography plan/apply/verify, writer-freeze/final-archive/session-reset/configuration sequencing and writes-closed smoke. Separately authorize manual deployment of the approved SHA. Restore autodeploy only after the controlled release decision and readback.

The documented **Disable** control is [Railway's autodeploy hold](https://docs.railway.com/deployments/github-autodeploys#disable-automatic-deployments); **Wait for CI** is a distinct setting. This assignment changes neither.

## Remaining package disposition and next concrete actions

The [central register](03-launch-register.md) now carries B01–B07 scoped acceptance and keeps B08–B18 open. The next work is coordinated by outcome:

| Packages | Outstanding dependency | Next concrete action |
| --- | --- | --- |
| B16 | Independent review, exact-head CI, later controlled merge | Review this combined change/evidence, verify final checks and diagnose the failed Vercel preview using authenticated logs; separately perform the containment checklist before any merge. |
| B08/B09/B12 | Protected geography, bindings, old writers, final archive and sessions | Prepare a fresh geography plan on the approved release; inventory writers and exact Azure runtime/worker target identities; review final capture/custody and session-invalidation sequence. No legacy-account import. |
| B10/B11/B13 | Real email, public/private media and enquiry delivery | Review required provider variables/permissions and worker/job config (`railway.email-worker.json`, `railway.lead-job.json`); rehearse real recipient delivery, private cross-user denial and restart durability on a controlled hosted candidate. |
| B14 | Founder queues, monitoring and pause/absence operating proof | Rehearse one bank-match/activation/moderation/support cycle and the accepted weekend/holiday/absence/resumption cases during staffed hours. |
| B15 | Actual-provider disclosures and exact-copy approval | Resolve provider/retention/cookie facts using the final configuration, approve the exact copy/digest, then implement/render consent/Terms/Privacy/invoice consistency. Existing founder facts need not be requested again. |
| B17 | Representative application recovery/capacity and continuous alerts | Establish forecast/thresholds and attended alert routing; execute the required 24-hour exercise and independent application backup/recovery proof on the stable hosted composition. |
| B18 | Exact three-audience/buyer hosted acceptance and Edward's GO | After upstream evidence, execute writes-closed exact-artifact smoke, controlled cutover and first paying customer's observed value loop. |

No main merge, provider setting mutation, deployment command, protected database contact/apply, production binding/session/secret change, writer freeze, final source capture, payment or sales opening was performed. The candidate retains fresh Azure accounts, TiDB preservation and the requirement to invalidate old sessions; that live operation remains unperformed. After Azure accepts writes, recovery must follow the approved forward-recovery path rather than returning to a stale TiDB writer.
