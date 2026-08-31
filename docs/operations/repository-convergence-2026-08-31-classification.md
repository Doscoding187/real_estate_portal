# Repository Convergence Programme — Classification Decisions

**Status:** Dirty-worktree review complete; local branch-tip semantic review continues
**Forward baseline:** `origin/main` at `79aa137a49ed61355bfca9678533e6098ec33424`
**Recovery namespace:** `refs/archive/repository-convergence-20260831/`

This document records decisions about preserved work. A decision to preserve
or classify an item never authorizes an old diff to be merged.

## Authority and validation context

The database batch was reviewed against the canonical Database Authority v3
contract, the active manifest (head
`0061_sl_messages_authorship.sql`), and the current Drizzle model inventory.
The local worktree database was read-only during this review: its migration
lineage is invalid and schema is not congruent, so no migration, seed, or
runtime database test was attempted.

`pnpm db:authority:check` passed on 2026-08-31:

- 29 static authority test files and 242 tests passed.
- The utility inventory classified 118 surfaces.
- The canonical model inventory was deterministic and current (216 tables).
- The active migration manifest passed with 62 SQL files.

For public Land and geography review, the Land Consumer Journey Contract was
used: a request has exactly one authority, and no historical work may mix,
widen, or infer geography from display text.

## High-risk classification decisions

| Preserved item | Original value / intent | Classification | Current-baseline evidence | Forward action |
| --- | --- | --- | --- | --- |
| `worktrees/listify-branch-database-coherence-authority-4b067e8ba3d9/working-tree` | Strengthen migration coherence, mutation target checks, readiness reporting, and local demo geography. | **Superseded** | Its pre-v3 modules (`databaseMutationAuthority.ts`, `databaseReadiness.ts`, `migrationCoherence.ts`) are absent from current `main`; their authority intent is replaced by the current `server/_core/databaseAuthority/` control plane and current contract suite. Current authority changes include `fix(database-authority): harden isolated local runtime` and `feat(db-authority): split operation-specific data roles`. | Keep the snapshot as recovery evidence only. Do not merge or revive its fixed-`listify_local` assumptions. |
| `worktrees/listify-development-delivery-updates-recovery-328334a69ff1/working-tree` | Developer-owned delivery facts, a deliberate buyer-safe approval step, milestone labels, and a public development-update read surface. | **Forward integration** | Current `main` has no delivery-update domain, model, or route equivalent. The recovered implementation uses retired `drizzle/migrations/` and a non-canonical numbered migration, so it cannot be rebased or applied. | Reimplement the intent in a dedicated current-main database-authority PR after a small domain/design audit. Use one active `server/migrations/` expansion after the current manifest head, canonical ownership models, and focused authoring/public-visibility contracts. |
| `worktrees/listify-explore-authority-841e5b13bd06/working-tree` | A reviewed, auditable Option A listing-authority grant/revoke lifecycle for the existing Explore pilot. | **Forward integration** | Current `main` retains the pilot access and eligibility surfaces but has no `explore_option_a_listing_authorities` model or grant/revoke/event lifecycle. The recovered `0076` migration is outside the current canonical manifest and cannot be adopted. | Reimplement the authority lifecycle only in a dedicated current-main database-authority PR, after confirming the pilot remains a product priority and defining the canonical identity relationship. Preserve the recovered idempotency and audit requirements as design input. |
| `worktrees/listify-launch-agency-founding-access-e5dcae676ff9/working-tree` | Fixed-term paid Agency Founding Access and assisted activation. | **Superseded** | Current `main` owns the commercial model through `0007_paid_launch_access_invoice_term.sql` and the later canonical paid Launch Access / agency lifecycle commits. The historical slice uses an obsolete `0001` migration and now-conflicting commercial copy and price. | Keep as historical product evidence only; do not reintroduce its migration, billing service, or marketing claims. |
| `worktrees/property-listify-commercial-comm-s1-b28a3ce497c8/working-tree` | Formatting-only adjustment to the listing lifecycle database contract. | **Generated/archive-only** | The diff contains no behavioral assertion change. The current lifecycle contract has subsequently advanced with canonical commercial and listing-lifecycle work. | No source integration. Keep the snapshot through the recovery namespace. |
| `worktrees/property-listify-svc-fs-32a951081481/working-tree` | Gauteng coverage pipeline, governed runtime geography, deterministic output artifacts, and discovery-consumer integration. | **Superseded by forward geography work** | Current `main` contains the governed coverage contract, generator, reference projection, runtime resolver, and later parent-edge/collision research artifacts. The clean territory-pipeline and search-discoverability commits are present in its history; the current artifacts intentionally differ because they include subsequent correction waves. | Do not merge the stale snapshot or overwrite current artifacts. Continue geography only from the current governed pipeline and its explicit contracts. |
| `worktrees/listify-developer-leads-operations-4f21c7385f6a/working-tree` | Replace fake Developer notifications/messages with actionable new-lead awareness and show development context on operational leads. | **Forward integrated — PR #549** | Current `main` still exposed zero-value notification/message controls despite having a real developer lead lifecycle. The valid requirement was reimplemented on current `main` as commit `251b975f`: an organisation-scoped new-lead count, an actionable Leads badge, development context, and removal of the sample-data Messages surface. | Review and merge [PR #549](https://github.com/Doscoding187/real_estate_portal/pull/549). The historical deletion of unrelated notification/quality-scoring internals was deliberately not copied without a separate authority audit. |
| `worktrees/property-listify-pbuy-01-convergence-15f5eaac82c4/working-tree` | Public Buy result/detail and lead-capture convergence. | **Superseded by current P-BUY and discovery work** | The 33 changed paths all evolved after the snapshot source head. Current `main` contains the later P-BUY convergence (`54a3129`), property-discovery journey work, and the subsequent result-card evidence refinement. The archived patch no longer reverse-applies because its source contracts have evolved. | Keep the snapshot as evidence only; do not merge or partially cherry-pick it. Any new Buy work starts from the current journey contracts. |
| `worktrees/property-listify-prospect-conversion-1a43c69edda1/working-tree` | Link a signed-in public lead to its prospect identity during capture rather than through an optional later side effect. | **Forward integrated — PR #547** | The recovered intent exposed a real gap in the current capture flow: a lead could commit before its identity link, while attribution ran later as an optional side effect. It was reimplemented on a clean current-main branch as commit `c378485d`, retaining the current Shared Living boundary and adding focused contracts. | Review and merge [PR #547](https://github.com/Doscoding187/real_estate_portal/pull/547); do not merge the archived three-file snapshot. It changes no schema or migration. |
| `worktrees/listify-pxf-s2a0-1-listing-safety-lifecycle-41bec5bff8d7/working-tree` | Listing lifecycle containment: authorization, safe destructive transitions, and private-to-public integrity. | **Partially superseded / archive-only** | Current `main` supersedes its transaction and public-safety work through the current listing lifecycle, published-edit revisions (`0043e9f`), atomic revision approval (`aca6ba4`), and canonical source-to-public archive path. Its broad generic authoring role gate and legacy agency-claim inference are not forward-safe: private-seller authoring remains supported, and current agency authority is membership-led. | Do not merge the raw nine-file patch. Any future generic-listing authorization change needs a current-model policy and tests against `agencyAgentMemberships`, private sellers, and the revision workflow. |
| `worktrees/slc-plot-land-hero-66d636e8c3e2/working-tree` | Send Plots & Land hero filters to the Land search page. | **Superseded by canonical Land handoff** | Current `EnhancedHero` delegates `plot_land` to `buildConsumerJourneyUrl` with the canonical Land journey, governed search scope, and the central classification allow-list. The snapshot manually assembled `/plots-and-land` query text and therefore predates the Land request-authority contract. | Keep as recovery evidence only. Do not restore a manual query builder that could bypass the governed Land contract. |
| `stashes/stash-0` and `stashes/stash-1` | Agency listing-performance queue, seller reviews, and price-revision handoff. | **Superseded** | Current `main` contains `drizzle/schema/listingPerformance.ts`, the Agency router operations, client workspace, integration tests, and the historical `0071`/`0072` migrations under `_archived/pre-canonical-baseline/`. The live model is represented by the canonical baseline rather than the old migration lane. | Never pop either stash. Retain both snapshots; no source merge is needed. |
| `stashes/stash-2` | Temporary main-sync migration-runner and inventory-test work, including untracked old SQL files. | **Superseded / archive-only** | Its SQL belongs to the retired pre-canonical migration lane, now preserved under `server/migrations/_archived/pre-canonical-baseline/`. Current migration authority is manifest-led and was validated by the static gate above. | Keep the stash ref as forensic evidence only. Do not apply its runner or SQL changes. |

## Remaining dirty-worktree decisions

| Preserved item | Classification | Current-baseline evidence and forward action |
| --- | --- | --- |
| `worktrees/real_estate_portal_clone-5c6283fec17d/working-tree` | **Generated/archive-only** | The 18 files are local uploads and machine-specific configuration, not reproducible product source. The recovery artifact archive retains them; do not add them to source control. |
| `worktrees/listify-advertise-commercial-truth-a3aa19cea399/working-tree` | **Archive-only** | The two runtime edits only widen local CORS/dev-port allowances (`3010`/`5010`). No current in-repository consumer requires those ports, so widening the public server surface is not justified. |
| `worktrees/listify-commercial-monetization-audit-8d4adbbdfe6d/working-tree` | **Research archive** | This is a point-in-time audit. The commercial and Land journeys have since changed materially; retain it as product research, not current documentation or runtime work. |
| `worktrees/listify-developer-listing-engine-a507858def4a/working-tree` | **Superseded** | All 13 changed paths have later current-main evolution, including developer identity/catalogue custody, development discovery validation, buyer corrections, and current lead flow. Do not revive its older writable-brand/derived-listing contracts. |
| `worktrees/listify-development-home-v1-653ae226dc45/working-tree` | **Generated/archive-only** | The sole file is a generated frontend inventory report. It remains in the artifact recovery bundle and has no source-integration value. |
| `worktrees/listify-dle-reconstruction-1d759b0338ff/working-tree` | **Superseded / archive-only** | The 41-file reconstruction predates canonical listing, location, pricing, media, revision, and developer lifecycle contracts and contains an obsolete mocked presentation model. Do not resurrect a parallel listing engine. |
| `worktrees/listify-doe-s2-audit-4e2b04970faf/working-tree` | **Research archive** | The developer pain-point/milestone document is retained as research input; current developer product work has advanced beyond its point-in-time conclusions. |
| `worktrees/listify-gauteng-canonical-promotion-5e1b0bff434e/working-tree` | **Superseded** | The captured v0.1 Gauteng review CSV is replaced by current governed v0.2 outputs and policy, which reduce the former review set and keep promotion decisions explicit. Preserve the older evidence; do not overwrite current artifacts. |
| `worktrees/listify-hero-worktree-reconciliation-audit-c1dda6810e76/working-tree` | **Superseded documentation** | Its hero-gap analysis predates the current homepage/discovery journey work. Keep the audit as historical reasoning only. |
| `worktrees/listify-homepage-hero-audit-357ba5c9e166/working-tree` | **Superseded documentation** | Current homepage journey and search-to-lead work addresses the audited surface. The old document must not become a competing implementation brief. |
| `worktrees/listify-land-consumer-journey-convergence-4c221cb6f0d9/working-tree` | **Generated/archive-only** | The sole temporary Vitest configuration is execution state, not a product contract. |
| `worktrees/listify-listing-wizard-overhaul-2dae3de0efc6/working-tree` | **Superseded / archive-only** | It contains simulated image compression, virtual-tour, engagement, notification, and indexing claims outside the current media/revision lifecycle. Current secure-media, public-presentation, and atomic-revision work is the authority. |
| `worktrees/listify-location-discovery-v1-foundation-731691a5491e/working-tree` | **Superseded** | Its older discovery catalog and fallback model predates the governed coverage, canonical-intent, search-area, and consumer-discoverability pipeline. Continue only from current geography authority. |
| `worktrees/listify-next-mvp-journey-audit-2dfeea5874d7/working-tree` | **Superseded documentation** | Later public search-to-lead reliability, P-BUY, and discovery work makes the old launch brief historical context rather than a current plan. |
| `worktrees/listify-plds-f1-canonical-frontend-foundation-e3cb77523761/working-tree` | **Superseded / evidence archive** | Its visual-test wiring and browser evidence predates the current property-result-card evidence and visual-test practice. Retain the artifacts, but do not reintroduce the old frontend authority. |
| `worktrees/listify-ple-acceptance-66557e2b-53f0d90af288/working-tree` and `worktrees/listify-ple-acceptance-889a465f-0cdd5b9b4223/working-tree` | **Generated/archive-only** | These are local-media/browser captures only. They remain in the verified artifact archive. |
| `worktrees/listify-provincial-discovery-gauteng-s0-45baf4e3e0b5/working-tree` | **Superseded by current provincial maturity** | The staged twelve-file snapshot is retained together with its staged index, but the source has since been followed by provincial maturity and correction commits. Reconcile any future province change against the current governed provincial route, not this pre-maturity staging area. |
| `worktrees/listify-provincial-fallback-hero-refinement-6f3ddb7aa857/working-tree` | **Design evidence retained; raw implementation/archive-only** | The untracked audit usefully maps provincial visual ownership, and eight province hero PNGs are safely preserved. Its associated `GeographyComposer` constructs generic Land/commercial routes and sends developments by display-text location, violating the current single-authority handoff contract. The images also lack approved source/provenance and payload review. Do not merge the old branch or assets. A future current-main province-experience slice may use the audit's component-boundary insight only after preserving governed handoffs and approving image provenance/size. |
| `worktrees/listify-public-navigation-gateway-v1-4af12a5dedcd/working-tree` | **Superseded** | The snapshot exposes specialist journeys through generic property URLs. Current public navigation and commercial/Land handoffs own these routes and preserve governed scopes. |
| `worktrees/listify-services-engine-clean-5f803662c373/working-tree` | **Research archive** | The stakeholder-map documents are retained for product context. Their corresponding current documents have evolved, so the snapshot is not copied into active documentation. |
| `worktrees/listify-services-engine-phase0-a04bf22c2a1d/working-tree` | **Archive-only implementation; retained product hypothesis** | The old service-provider notification/orphan-scheduler implementation relies on retired migration and delivery assumptions. Do not merge it. If delivery/reassignment becomes an approved priority, first define the current domain, ownership, and visibility contract in a dedicated workstream. |
| `worktrees/property-listify-saved-search-ci-repair-2374fc505a41/working-tree` | **Generated/archive-only** | The three files are captured CI output, retained as evidence rather than source. |

## Explicitly retained requirements

The following recovered requirements remain live work rather than abandoned
implementation:

1. A developer can record a delivery fact separately from buyer-facing copy,
   with an explicit, auditable buyer-approval transition.
2. The Explore pilot may require a reviewer-governed authority lifecycle,
   including expiry, revocation, idempotent operations, and immutable events.
3. Geography coverage must evolve through the current deterministic pipeline,
   with one canonical request authority and no silent geographic widening.
4. Signed-in public enquiries must persist their prospect identity link in the
   same capture transaction; this requirement is implemented in PR #547.
5. Any future provincial experience refinement must retain the current governed
   geography handoff and use only approved, payload-reviewed visual assets.

The first two require separate current-main PRs. The third is already a
forward-integrated governed workstream; its historical snapshots remain
preserved but are not merge candidates. The fourth has a focused current-main
PR open for review. The fifth is a constraint on any separately authorized
visual slice, not approval to merge the archived implementation.

## Forward-integration PRs

| PR | Recovered requirement | Status | Validation |
| --- | --- | --- | --- |
| [#547](https://github.com/Doscoding187/real_estate_portal/pull/547) | Atomic signed-in prospect identity-to-lead custody during public capture. | Open against `main` from `fix/prospect-identity-atomic-capture` (`c378485d`). | `pnpm check`; focused public-lead and prospect-status tests (53 passed); focused ESLint has zero errors. |
| [#549](https://github.com/Doscoding187/real_estate_portal/pull/549) | Honest Developer lead awareness in place of fake messages/notifications. | Open against `main` from `fix/developer-live-lead-awareness` (`251b975f`). | `pnpm check`; focused developer lead-count and workspace-chrome tests (6 passed); focused ESLint has zero errors. |

## Local branch-tip triage

The recovery index contains 117 local branch tips that were not present in
remote refs at capture time. Of those, 63 are already ancestors of the forward
baseline. A patch-equivalence pass over the other 54 found 12 whose complete
non-main patch series is already represented in current `main`; those need no
source merge. The remaining 42 have one or more non-equivalent patches and are
scheduled for semantic review by product-risk lane.

See
[`repository-convergence-2026-08-31-local-branch-semantic-review.tsv`](repository-convergence-2026-08-31-local-branch-semantic-review.tsv)
for the per-tip evidence. Patch equivalence avoids duplicate implementation; it
does not by itself classify product requirements as obsolete.
