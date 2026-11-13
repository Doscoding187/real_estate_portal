# Services Engine State Register

**Status:** Draft standing register, adopted 2026-10-28 with Edward's approval of the
approach. Facts are audited; **dispositions marked *Proposed* require explicit
founder approval before any execution.** This register is the Services
implementation-status and delivery-queue record. It does not amend or
independently approve changes to
`services-v1-product-contract.md` (authority for shipped public Services behaviour),
`services-v2-product-contract.md` (approved MVP direction), or the launch register.

**Companion assessment:** `services-v3-growth-journey-gap-assessment-2026-10-28.md`
(same branch) — the audited capability baseline. This register is the thin, standing
layer on top; the assessment explains detail, this register answers "what stage are
we at, what's next, what happened to the leftovers."

## How to use this register

1. Before touching any Services surface, read §1 (stage), §2 (what is superseded),
   and §3 (authorized queue). Then read the journey stage of the companion
   assessment that matches your work.
2. **Never start Services work from chat history, branches, or discovery.** If a
   change is not in §3, it needs a disposition entry first.
3. When your PR touches Services, update this register in the same PR (§5 rule).
   An unpruned branch or an unrecorded leftover after a merge is a register defect.

## Scope and update rule

Applies to: `client/src/pages/services/**`, `client/src/pages/pro/**`,
`client/src/features/services/**`, `client/src/components/services/**`,
`server/servicesEngineRouter.ts`, `server/services/servicesEngineService.ts`,
`server/services/__tests__/servicesEngine*`,
`drizzle/schema/servicesEngine.ts`, shared Services search types
(`shared/searchDiscovery.ts`, services page taxonomy in `shared/`), the Services
navigation entries in `client/src/lib/publicNavigation.ts`, and the Services
admin surface. A PR touching any of these must:

1. Update the affected queue lines (§3) — status and owning workstream.
2. Update or retire the asset lines (§4.2–4.4) the PR disposes of, lands, or creates.
3. Add a supersession note (§2) if the PR weakens or reinterprets recorded contract language.

Destructive dispositions (Retire/Archive execution) always run in their own
task-owned worktree with evidence recorded in the register line itself.

## §1 Engine stage statement

**As of `origin/main` @ `93723fdb` (#761, refreshed 2026-11-12):** the Services
engine is a contract-governed pilot marketplace and provider workspace —
the six-category directory (`/services` and `/services/:category`), provider
profiles, and five topic pages are indexable with canonicals; the localized
directory route was retired by #693. The engine also has fail-closed reviewed
publication with audit, one-to-one attributable requests with durable idempotent
request identity and server-validated property/listing/development context,
provider lead custody with a six-state lifecycle and notes, verified-request
reviews with moderation/report triage and transactionally recomputed aggregates,
a super-admin review workspace, and a gated provider workspace. DELTA-1 per-
service pages (#704), DELTA-3 response measurement (#701), DELTA-4 SEO (#700),
and DELTA-7 workspace upgrades (#702) are merged. Canonical Place coverage is
implemented through #693; broader service-by-Place landing pages remain future
work. Public provider applications remain held, and service-description editing
is incomplete in the visible provider editor. Campaign landing/capture,
provider media, export/handover, automated notifications, and monetization are
not implemented or approved for launch.

**Task branch update (2026-11-13):** DELTA-12 provider acquisition and the
approved provider service-description editor improvement are implemented in
`feat/services-master-product-vision-and-provider-acquisition-20261112` and
verified against the exact task-owned disposable MySQL database. The new
`server/__tests__/integration.services-provider-acquisition.test.ts` uses real
registration and verification HTTP routes, real authenticated provider
mutations and reads, persistent service-description writes, ownership checks,
public projection, and super-admin publication/unpublication. It proves the
profile remains private until review, blank descriptions clear, over-limit
content is rejected, foreign service IDs fail, and unpublished edits remain
private. Verification mail is captured in memory; no external email was sent.
The integration installs a synthetic local legal fixture, so current approved
legal content remains a separate release check. The client smoke reached the
acquisition and role-selected registration pages; it did not submit a browser
registration.

Focused Services/auth tests passed (13 files, 163 tests). `pnpm check` passed;
`pnpm run lint:check` exited 0 with zero errors and 12,809 warnings. The full
`pnpm test:authority` run completed with 812 files passed, 4 failed, 12 skipped
(5,914 tests passed, 22 failed, 99 skipped). Nineteen failures were in unrelated
S4 billing tests (one missing test-only `JWT_SECRET`, 18 stale legal-release
reads); three readiness-monitor tests timed out under full-suite load. The
remaining failed files reported legal-fixture setup/teardown errors. A focused
seven-file concurrent reproduction showed the shared mutable
`legal_active_release` race affecting S4, agency listing lifecycle, agency
principal bootstrap, and launch-readiness fixture cleanup; those affected paths
passed in serial reruns (S4 with an ephemeral test-only JWT secret). The 99
skips are existing explicit opt-in, future-schema, or retired legacy tests, not
database-startup skips.

The earlier authority attempt failed before test execution could use the local
database: the repository-owned 3307 MySQL service had a stale PID/socket/lock
set referring to absent PID 1676553, no listener, and no openers. The documented
`pnpm db:authority:service:recover` procedure removed only those stale runtime
artifacts and restarted the service; the exact task-owned database then passed
authority status and schema-congruency checks. No database files were removed,
and no shared/production database, schema, migration, deployment or provider
promotion was touched. The master vision remains the strategic product
authority; this register tracks implementation state only.

## §2 Supersession ledger

| # | Artifact | Status | Disposition |
| --- | --- | --- | --- |
| S-1 | `services-v1-product-contract.md` | **Authority for shipped public behaviour.** V2 review authorship/moderation/aggregates, DELTA-3 response measurement, DELTA-1 service pages, DELTA-4 SEO and canonical Place coverage are later shipped extensions. Reviewer staffing/cadence remains an operational dependency; contact evidence and formal quotes remain open. | Keep and reconcile current-state notes without removing dated history. |
| S-2 | `services-v2-product-contract.md` | Authority for approved direction. §6 "provider mini-site" vocabulary is superseded by the approved V3 web-presence/growth-journey model; its sequence (existing data first, schema only when evidenced) carries forward. | Keep as the source of the free controlled pilot, hosted presence, and review decisions; V3 is the approved growth contract. |
| S-3 | `.kiro/specs/services-marketplace-overhaul/` (`requirements.md`, `design.md`, `tasks.md`) | **Superseded.** Pre-contract UI-overhaul spec ("Angi-style" polish, wizard replacement, `Trust_Bar`, provider-card *response time and job count* — invented trust signals). It is the paper trail explaining the unmounted components in §4.2, which were built against this spec and never landed in routed code. | *Proposed: Archive in place* (no deletion, no merge). Never resurrect its response-time/job-count display: trust claims may come only from measured event truth (DELTA-3) and the platforms verified/reviews ladder. |
| S-4 | Phase-0 notification/orphan-scheduler implementation (`feature_services-engine-phase0`, recovery copies `origin/recovery/services-engine-clean-baseline-2026-07-02`, `origin/recovery/safety-2026-07-03/feature_services-engine-phase0`) | **Retired archive-only** (recorded in `docs/operations/repository-convergence-2026-08-31-classification.md:72`). Relies on retired migration/delivery assumptions. Local branch `feature/services-engine-phase0` no longer exists; local worktree path `/home/edwardspc/Desktop/Dev/listify-services-engine-phase0` is gone. | Do not resurrect. Any notification/reminder/delivery capability is created fresh only as DELTA-8 (new domain, new owner, new contract). |
| S-5 | `svc/future-state-wt` classification | Historical: broad alternative services-engine rewrite with retired `0062–0074` migration assumptions (convergence doc `:158`). Not a registered worktree today. | Reference-only. Any services schema replacement requires a fresh database-authority design. |
| S-6 | Explore integration | Approved as a subsequent channel (V2 §3.4) and **not in any current slice**; `explore` source surface rejected server-side; `/service/explore` route intentionally non-existent. | Boundary holds; Explore entries remain correct-absent. |

## §3 Authorized work queue

Statuses: `Proposed` (awaiting founder/V3 approval) · `Approved, not started` ·
`In flight (worktree/branch)` · `Done` · `Parked` · `Retired`.

| Delta | Work | Type | Status | Notes |
| --- | --- | --- | --- | --- |
| DELTA-1 Provider web presence (profile → homepage; per-service detail pages) | Code | **Done on `origin/main` #761** (PR #704, commit `bce489970`) | Per-service canonical pages reuse `getProviderPublicProfile` and shared slug authority, preserve price/trust truth and request attribution, add page metadata/structured data and sitemap entries, and link from profile services. No schema. |
| DELTA-2 Campaign landing pages + provider-attributed demand capture | Code + contract | Proposed | New context vocabulary; idempotency semantics preserved; `noindex`-by-default policy is a contract clause |
| DELTA-3 Measured response performance from `service_lead_events` | Code | **Done on `origin/main` #761** (PR #701, commit `b2dd9a18b`) | 90-day median from response-event truth; public display requires three measured leads |
| DELTA-4 Services SEO infrastructure (sitemap child, JSON-LD, slug canonicalization) | Code | **Done on `origin/main` #761** (PR #700, commit `dd5e11114`) | Category and eligible provider/service sitemap entries; localized URLs omitted; category aliases redirect to canonical slugs |
| DELTA-5 Provider media library | Schema (DB authority) | Proposed, evidence-gated | V2 MINI-1 |
| DELTA-6 Provider content model (case studies/projects) | Schema (DB authority) | Proposed, evidence-gated | V2 MINI-2 |
| DELTA-7 Lead workspace upgrades (filters/totals/event analytics) + client hygiene sweep | Code | **Done on `origin/main` #761** (PR #702, commit `3a18d781f`) | Fail-closed status filtering, request-mix and response-performance panels, honest below-sample states, and client hygiene cleanup; read-only queries, no schema change |
| DELTA-8 Fresh notification/delivery domain (alerts, reminders) | Contract + ops authority | Proposed | Fresh design only; S-4 stays retired |
| DELTA-9 Export/handover with POPIA consent semantics | Contract (+ legal review) | Proposed | Platform stays attribution system of record |
| DELTA-10 Canonical Place coverage and geography | Place Authority consumer slice | **Foundation shipped through #693** (commit `cbff3e7b3`); service-by-Place pages remain future | Provider coverage/search uses canonical Place IDs; this does not implement radius search or service-by-Place SEO routes |
| DELTA-11 Commercial model (tiers/placement/lead fees) | Founder decision | Proposed | V2 §3.1 gate: research then approval |
| DELTA-12 Provider acquisition and registration | Code + operations | **Implemented and task-local DB-backed verified; release email/legal verification pending** | Services acquisition route enters existing `service_provider` registration; real registration and verification HTTP routes established the provider role/session; onboarding completed against existing profile/service/Place authorities; pending provider remained private until super-admin publication. Evidence: `integration.services-provider-acquisition.test.ts`, role/auth/session/onboarding tests. Verification mail was captured in memory; current legal bundle and external delivery not verified. No schema, pricing, provider promotion or deployment. |
| DELTA-13 Provider-editable service descriptions | Code | **Implemented and task-local DB-backed verified; release validation pending** | Existing provider editor and `service_provider_services.description` authority are reused. Real DB integration proves save/reload, optional blank clear, 2,000-character limit, foreign-service rejection, public profile/service projection, and unpublished privacy. No schema or migration. Published edits remain immediate under V1; no edit-review state is implemented or claimed. |

**Current direction:** V3 is approved. DELTA-1/3/4/7 and the DELTA-10 canonical
Place foundation are shipped on the refreshed baseline. DELTA-12 and DELTA-13
have task-local DB-backed journey evidence and focused tests, but remain branch-
only until normal review/merge/release. The full authority suite is not green:
the remaining failure is shared legal-fixture concurrency and a missing
test-only JWT secret in unrelated suites, not database initialization or a
Services failure. Actual email/legal-release verification, launch supply, and
operational/release readiness remain outstanding. Later deltas retain their
stated evidence, founder, legal, and Database Authority gates.

## §4 Asset reconciliation

### §4.1 Disposition classes

| Class | Meaning |
| --- | --- |
| **Advance** | Move into an authorized §3 delta as part of it |
| **Retire** | Delete from the working tree; evidence + founder approval required |
| **Archive** | Remove from the working tree with a provenance record; branch/archive execution in a task-owned worktree |
| **Hold** | Remains; entry exists with reason and exit condition so it is never mistaken for debris |

### §4.2 Built-but-unmounted client assets

Last verified 2026-10-28 @ `026586690` by reference sweep over `client/src`
(excluding `__tests__` and the components' own files). Built against the
superseded S-3 spec; never wired into routed code.

**Approved and executed 2026-10-28.** Edward approved the Retire dispositions
("commit and continue"). Deletions landed on
`feat/services-retire-unmounted-assets-20261028` (worktree
`property-listify-services-retire-debris-20261028`): 13 unmounted components, the
four orphan property tests (`StarRating`, `TrustBar`, `CategoryCard`,
`MatchQualityBadge`), and the `POPULAR_PROJECTS`/`COST_GUIDES` catalog constants.
Verification: `pnpm check` clean; targeted services vitest — 15 files / 114 tests
pass. The dead `App.tsx` `ProProfilePage` lazy binding is closed in DELTA-7;
the page remains mounted inside `ProviderOnboardingWizard` via its own lazy
import.

**Reconciliation as of 2026-11-03.** The #698 reference sweep found references
for every candidate asset on current main. Main commit `cbff3e7b` (#693) changed
`ServiceHeroSearch` from free-text location to canonical Place search; live
`StarRating` imports are among the remaining references. #698 records the
reconciliation and deletes no files. The dispositions below are historical
retirement candidates from the 2026-10-28 audit, not current approvals; they
remain deferred until each reference is reconciled.

| Asset | Historical evidence (2026-10-28; recheck required) | Deferred candidate disposition |
| --- | --- | --- |
| `components/services/ServicesSkeletons.tsx` (4 exports) | No page/route references | **Retire** in the first P0 slice |
| `components/services/TrustBar.tsx`, `TrustStepsRow.tsx` | Only `advertise/PreviewCarousel.README.md` mention + intra-set references | **Retire** |
| `components/services/DemandCarousel.tsx`, `PopularProjectsGrid.tsx`, `CostGuidesSection.tsx` | No page references (referenced only by `ServicesSkeletons.tsx`) | **Retire** |
| `components/services/CategoryShowcaseCard.tsx`, `CategoryCard.tsx` | No page references | **Retire** |
| `components/services/ServiceHeroSearch.tsx` + `CategoryChips.tsx` | No page references (CategoryChips referenced only by ServiceHeroSearch) | **Retire** |
| `components/services/LeadRequestWizard.tsx` | No page references (replaced by `features/services/LeadRequestFlow`) | **Retire** |
| `components/services/MatchQualityBadge.tsx` | No page references; concept absent from V1 contract (no automated matching) | **Retire**; do not reintroduce match scores (invented trust signal) without a V3 contract clause |
| `components/services/StarRating.tsx` (standalone) + `__tests__/StarRating.property.test.ts` | Pages consume the `StarRating` export from `ProviderShowcaseCard.tsx`, not the standalone component | **Retire** (merge tests for the surviving export) |
| `catalog.ts` constants `POPULAR_PROJECTS`, `COST_GUIDES` | No rendering surface | **Retire** with the components |
| `pages/pro/ProProfilePage.tsx` lazy import in `App.tsx:88` with no route | Mounted only inside `ProviderOnboardingWizard`; default export unroutable | **Closed in DELTA-7 (#702)** — the dead lazy binding was dropped; the page remains mounted inside `ProviderOnboardingWizard` via its own lazy import |

### §4.3 Unwired-but-intentional engine surfaces (Hold)

| Surface | Reason it exists | Exit condition |
| --- | --- | --- |
| `SERVICE_SOURCE_SURFACE_VALUES.explore` (typed, server-rejected) | V1 Explore boundary; fail-closed | Explore integration slice (S-6) |
| `service_explore_videos` table + hidden `/service/explore` | Same | S-6 |
| Subscription tier/status columns, unwired (`billingEligible` always 0) | Preserved entitlement surface per V2 §3.1 | DELTA-11 (only after founder approval) |
| Footer newsletter blueprint comment (`ServicesSiteFooter.tsx`) | Recorded proposed capability, intentionally not rendered | A V3-approved capture slice |

### §4.4 Services branch and worktree lineage

Ahead/behind vs `main` @ `026586690`, verified 2026-10-28. **Branch deletion is
never assumed safe from ahead/behind alone; each line lists the evidence condition
required for its disposition.**

**Retired 2026-10-28**, after fresh post-fetch re-verification
(`git fetch origin --prune`, `git rev-list --left-right --count main…<ref>` = 0
unique commits) and owner delegation recorded the same day: local
`feat/services-publication-review-queue-20261021`, `fix/services-v1-reconcile`;
remote `feat/services-marketplace-mvp-parity-20261022`,
`feat/services-marketplace-overhaul`, `feat/services-review-moderation-20261022`,
`feat/services-property-journey-actions`, `fix/services-marketplace-followup`,
`feature/services-frontend-release`, `feature/services-pro-release`. The
wip-preserved V1 trio and `origin/feature/services-engine-release` deliberately
remain per their rows below.

| Branch | Evidence | Proposed disposition |
| --- | --- | --- |
| `feat/services-publication-review-queue-20261021` | 0 ahead / 83 behind; last commit 2026-10-22 "publication review queue + marketplace v2 surfaces" | **Retire** (delete) after reviewer confirms — no unique commits |
| `fix/services-v1-reconcile` | 0 ahead / 446 behind | **Retire** after confirmation |
| `origin/feat/services-marketplace-overhaul` | 0 ahead / 2237 behind (2026-04-22) | **Retire** on remote after confirmation |
| `origin/feat/services-marketplace-mvp-parity-20261022` | 0 ahead / 36 behind ("shared star rating on provider profile") | **Retire** on remote after confirmation |
| `origin/feat/services-review-moderation-20261022` | 0 ahead / 32 behind | **Retire** on remote after confirmation |
| `origin/feat/services-property-journey-actions` and `origin/fix/services-marketplace-followup`, `origin/feature/services-frontend-release`, `origin/feature/services-pro-release` | 0 ahead | **Retire** on remote after confirmation (#339 recorded in packet 12) |
| `feat/services-v1-integration`, `feat/services-v1-launch-journey`, `feat/services-v1-remediation-port-20260924` | 1/1/3 ahead — single `wip: preserve … before retiring the worktree` commits against the V1 lineage (the remediation-port branch is the named workstream of the **current V1 contract header**); content arrived on `main` through integrated merge identities, so rev-list reads divergence | **Archive, then delete**: one-pass review confirms every file in the wip snapshots has an integrated successor in `main`; record confirmation in this table before deletion |
| `origin/feature/services-engine-release` | 4 ahead — demand-engine foundation migrations `0031/0032` and subscription plan tests, **not current services content** | **Archive-only, do not merge** (converges with S-5): demand/billing migrations are a retired lineage; deletion requires the migration-tree audit to confirm no live authority import |
| `origin/recovery/services-engine-clean-baseline-2026-07-02`, `origin/recovery/safety-2026-07-03/feature_services-engine-phase0` | Recovery namespace | **Hold** under repo-wide recovery-retention policy; separate founder decision, never auto-picked |
| Worktree `/home/edwardspc/Desktop/Dev/listify-services-engine-clean` | Detached, dirty (1 file), DIRTY_OR_UNSAFE per packet 12 WT-37 | Owner review of the dirty file, then destroy/retain decision by Edward |
| Worktree `…/listify-services-engine-phase0` | Path no longer exists; only remote recovery copy (above) | Record physical retirement as done in packet 12's next revision |

### §4.5 Named, not ours (visibility without action)

- `main` uncommitted pile: deleted geography test/service files (`git status` deletion set) —
  **canonical-place-geography workstreams' property** (worktrees recorded in `git worktree list`);
  this register only records that the pile is owned there and unresolved.
- Untracked `docs/briefs/2026-10-08-*` (`b12-priority-directive/response`, `deployment-audit`)
  and `docs/architecture/launch-readiness-and-product-convergence/evidence/b12-priority-audit-2026-10-08/`
  — B12/hosted-runtime launch lineage, not services. Owners should either commit or
  explicitly archive them.

### §4.6 Client hygiene defects (bundle: hygiene slice inside P0)

**Resolved 2026-10-28** on `feat/services-client-hygiene-20261028` (worktree
`property-listify-services-hygiene-20261028`):
1. ~~Auth-redirect param divergence~~ — the Services reviews page now uses the
   shared `next` convention (`ServiceProviderReviewsPage.tsx:372`). Out-of-scope
   `redirect=` uses belong to other engines and stay untouched.
2. ~~`service_provider` canonical account destination divergence~~ —
   `getCanonicalAccountDestination` now returns `/service/dashboard`
   (`publicNavigation.ts:1190`), matching `SmartDashboardRedirect` and
   `DeveloperRoutes`; the dashboard's own gate continues to route unpublished
   providers to `/service/profile`. Tests updated (`publicNavigation.test.ts`,
   `EnhancedNavbar.account-routing.test.ts`); targeted run 2 files / 85 tests
   pass; `pnpm check` clean.

Resolved hygiene history:
1. ~~Uncanonicalized category slug aliases~~ — **Resolved 2026-10-28 inside DELTA-4**:
   `ServicesCategoryPage` now redirects legacy underscore/hyphen aliases (and any
   non-canonical rendering of a known category) to its canonical `/services/<hyphen-slug>`
   path by replace-navigation, preserving campaign query context; topic pages
   (`/services/home-loans` etc.) are explicitly excluded from canonicalization. Tests:
   `ServicesCategoryPage.test.tsx` (alias redirect preserved query, canonical route kept
   in place, topics untouched, BreadcrumbList emitted). §4.6 has no open items;
   the former `App.tsx:88` `ProProfilePage` lazy import closed with DELTA-7
   (#702).

## §5 Maintenance

- **Evidence age:** refreshed source baseline `origin/main` @ `93723fdb` (#761), 2026-11-12.
  Any register line
  older than one merge involving its area must be re-verified before acting on it.
- Queue and asset lines are updated **in the PR** that changes them — never in a
  follow-up chat, never in another sprint.
- Disposition executions (Retire/Archive) each run in their own task-owned worktree
  with the evidence recorded on the disposed line.
- This register is reset-audited whenever a new Services contract (V3) is adopted:
  §3 statuses are re-based from its definition-of-done, and §4.2 becomes empty by
  execution, not by memory.

*Historical asset and branch-lineage checks: reference sweeps (`rg -l`),
`git rev-list --left-right --count`, `git log`, and registered-path status at
`main` @ `026586690`. Current product-state reconciliation: `origin/main` @
`93723fdb` (#761), 2026-11-12, with the evidence in §1 and DELTA rows above.*
