# Repository Convergence Programme — Recovery Ledger

**Status:** active; recovery complete, forward-integration review in progress
**Forward baseline:** `origin/main` at `79aa137a49ed61355bfca9678533e6098ec33424`
**Recovery namespace:** `refs/archive/repository-convergence-20260831/`

## Purpose

This programme converges historical work into the current product without
moving `main` backwards. Recovery refs preserve raw evidence first; every
source change must then be classified against the forward baseline as one of:

1. **Forward integration** — rebase or reimplement the intent on current
   `main`, validate it, and use a PR.
2. **Superseded** — retain the evidence and capture any still-useful
   requirement, test, migration rationale, or design insight without merging
   stale implementation.
3. **Generated/archive-only** — retain useful evidence outside product source
   control and do not merge it as runtime product code.

No archive ref is a merge candidate by itself. In particular, an old diff must
not be merged only because it was recovered.

## Recovery evidence

| Evidence | Result |
| --- | --- |
| Forward baseline refs | `baseline/origin-main` and `baseline/current-worktree-head` both resolve to `79aa137a49ed61355bfca9678533e6098ec33424`. |
| Dirty worktrees | 34 working-tree snapshots, all independently rebuilt and verified against their live worktrees. One staged-index snapshot was also retained for `feat/provincial-discovery-gauteng-s0`. |
| Stashes | All three stashes have immutable archive refs under `stashes/stash-0` through `stashes/stash-2`. |
| Formerly unreachable commits | 101 commit refs exist under `unreachable/<full-object-id>`; a subsequent `git fsck --no-reflogs --unreachable` reported zero unreachable commits. |
| Local branch tips absent from all current remote refs | 117 branch-tip refs exist under `local-only-branch-tips/<branch-name>`; the [per-branch index](repository-convergence-2026-08-31-local-branch-tips.tsv) identifies 63 already integrated into `origin/main` and 54 requiring review. |
| Missing worktree registrations | The three confirmed-dead `/tmp/opencode` registrations were pruned only after their registered heads were anchored under `prunable-worktrees/`. |
| Standalone Git recovery | `~/.codex/recovery/property-listify-repository-convergence-20260831.bundle`, 205 MiB, SHA-256 `d7605f50e60064c05e7c008cd3a6f345ca616b05cef8c4ead5d4f7b43516f1db`; `git bundle verify` passed. |
| Generated/artifact recovery | `~/.codex/recovery/property-listify-repository-convergence-20260831-artifacts-v2.tar.gz`, 51 MiB, 364 entries, SHA-256 `e85d93d830745fbb9372d91c362d5fca62b26609961c8a679657d34bccf59212`. Credentials and dependency caches were intentionally excluded. |

Recovery created Git objects and local archive files only. It did not run a
migration, seed, schema change, database service lifecycle, or database
mutation; it did not push, merge, delete product files, or alter a live dirty
worktree.

## How to inspect or restore evidence

```sh
git show refs/archive/repository-convergence-20260831/worktrees/<id>/working-tree
git switch --detach refs/archive/repository-convergence-20260831/worktrees/<id>/working-tree
git bundle verify ~/.codex/recovery/property-listify-repository-convergence-20260831.bundle
```

The complete object-level inventory is recorded in
[`repository-convergence-2026-08-31-unreachable-commits.tsv`](repository-convergence-2026-08-31-unreachable-commits.tsv).
Each unreachable commit also has one ref whose final path component is its
full object ID. Enumerate the live namespace with:

```sh
git for-each-ref refs/archive/repository-convergence-20260831/unreachable/
```

Do not push this namespace as a substitute for product review.

## Dirty-worktree records

Every row has a corresponding immutable ref at
`refs/archive/repository-convergence-20260831/worktrees/<snapshot-id>/working-tree`.
The lane is an initial routing decision, not approval to merge.

| Snapshot ID | Source branch | Change shape at capture | Initial review lane |
| --- | --- | --- | --- |
| `real_estate_portal_clone-5c6283fec17d` | `codex/navigation-cleanup-phase-2-pr` | 18 generated local-upload/config files | Generated/archive-only candidate |
| `listify-advertise-commercial-truth-a3aa19cea399` | `fix/advertise-commercial-truth-convergence` | 2 runtime files | Public runtime review |
| `listify-branch-database-coherence-authority-4b067e8ba3d9` | `fix/branch-database-coherence-authority` | 20 modified + 10 new authority/runtime/test files | Dedicated database-authority review |
| `listify-commercial-monetization-audit-8d4adbbdfe6d` | `audit/commercial-monetization-current-state` | 1 audit document | Documentation/insight review |
| `listify-developer-leads-operations-4f21c7385f6a` | `feat/developer-leads-operations` | 13 modified + 2 new lead-operation files | Developer leads forward review |
| `listify-developer-listing-engine-a507858def4a` | `feature/dle-publication-lead-contract-hardening` | 13 lead/listing runtime and test files | Developer listing/lead forward review |
| `listify-development-delivery-updates-recovery-328334a69ff1` | `recovery/development-delivery-updates-control-rescue-20260721` | schema, migration, runtime, test, and shared-domain files | Dedicated database-authority review |
| `listify-development-home-v1-653ae226dc45` | `feat/developer-development-home-v1` | 1 generated inventory report | Generated/archive-only candidate |
| `listify-dle-reconstruction-1d759b0338ff` | `recovery/property-listing-engine-continuation-2026-07-02` | 10 modified + 31 new listing/development files | Listing-engine forward review |
| `listify-doe-s2-audit-4e2b04970faf` | `audit/doe-s2-structured-updates-milestones` | 1 research document | Documentation/insight review |
| `listify-explore-authority-841e5b13bd06` | `feat/explore-option-a-authority` | schema, migration, domain router/service, and tests | Dedicated database-authority review |
| `listify-gauteng-canonical-promotion-5e1b0bff434e` | `feat/gauteng-canonical-promotion-policy` | governed-geography data change plus ignored simulation evidence | Geography/data authority review |
| `listify-hero-worktree-reconciliation-audit-c1dda6810e76` | `audit/hero-worktree-reconciliation` | 1 audit document | Documentation/insight review |
| `listify-homepage-hero-audit-357ba5c9e166` | `audit/homepage-hero-discovery-conversion` | 1 audit document | Documentation/insight review |
| `listify-land-consumer-journey-convergence-4c221cb6f0d9` | `test/enforce-shared-and-scripts-contracts` | 1 temporary test configuration | Generated/archive-only candidate |
| `listify-launch-agency-founding-access-e5dcae676ff9` | `feat/launch-agency-founding-access` | billing schema/migration/runtime/test files | Dedicated billing and database-authority review |
| `listify-listing-wizard-overhaul-2dae3de0efc6` | `feature/listing-wizard-overhaul` | 2 modified + 6 new frontend/server workflow files | Listing authoring forward review |
| `listify-location-discovery-v1-foundation-731691a5491e` | `feat/location-discovery-v1-foundation` | 15 modified + 5 new discovery/runtime/test files | Public discovery forward review |
| `listify-next-mvp-journey-audit-2dfeea5874d7` | `audit/next-launch-critical-journey` | 2 audit/instruction documents | Documentation/insight review |
| `listify-plds-f1-canonical-frontend-foundation-e3cb77523761` | `feat/plds-f1-canonical-frontend-foundation` | 10 modified + 9 frontend visual-test/evidence files | Frontend-system forward review |
| `listify-ple-acceptance-66557e2b-53f0d90af288` | detached | 27 local media and browser-evidence files | Generated/archive-only candidate |
| `listify-ple-acceptance-889a465f-0cdd5b9b4223` | detached | 46 local media and browser-evidence files | Generated/archive-only candidate |
| `listify-provincial-discovery-gauteng-s0-45baf4e3e0b5` | `feat/provincial-discovery-gauteng-s0` | 12 staged geography/discovery files | Geography forward review; staged index preserved |
| `listify-provincial-fallback-hero-refinement-6f3ddb7aa857` | `feat/geography-experience-page-bodies` | 8 generated hero assets + 1 audit document | Geography experience/evidence review |
| `listify-public-navigation-gateway-v1-4af12a5dedcd` | `feat/public-navigation-gateway-v1` | 12 modified + 2 new navigation/test files | Public navigation forward review |
| `listify-pxf-s2a0-1-listing-safety-lifecycle-41bec5bff8d7` | `feat/pxf-s2a0-1-listing-safety-lifecycle-containment` | listing lifecycle/access runtime and test files | Listing safety forward review |
| `listify-services-engine-clean-5f803662c373` | detached | 8 architecture documents | Documentation/insight review |
| `listify-services-engine-phase0-a04bf22c2a1d` | `feature/services-engine-phase0` | 4 modified + 3 new services workflow files | Services forward review |
| `property-listify-commercial-comm-s1-b28a3ce497c8` | `feat/commercial-engine-s1-office-leasing` | 1 database lifecycle contract test | Commercial/database test review |
| `property-listify-pbuy-01-convergence-15f5eaac82c4` | `fix/pbuy-01-convergence` | 33 public search/detail/lead source and test files | PBUY forward review |
| `property-listify-prospect-conversion-1a43c69edda1` | `feat/prospect-conversion-viewing-continuity` | 3 prospect/lead service and test files | Prospect conversion forward review |
| `property-listify-saved-search-ci-repair-2374fc505a41` | `fix/saved-search-ci-baseline` | 3 generated CI-output files | Generated/archive-only candidate |
| `property-listify-svc-fs-32a951081481` | `svc/future-state-wt` | 11 modified + 9 new geography/services files | Geography and database-consumer review |
| `slc-plot-land-hero-66d636e8c3e2` | `slc/hero-plot-land-filters` | 1 hero UI file | Land-search forward review |

## Stash records

| Archive ref | Original stash | Scope | Initial review lane |
| --- | --- | --- | --- |
| `stashes/stash-0` | `0a1cbaea6cf90b5524ab3be47095013be8996717` | Agency listing performance work before PR #359 sync | Dedicated database-authority and agency-workflow review |
| `stashes/stash-1` | `24615b3037ca0a2643f9be756fd9b3c32b1509bc` | Earlier agency listing performance work before PR #358 sync | Compare with `stash-0`, then database-authority review |
| `stashes/stash-2` | `be4501cb48b98923cac527747a6446544df387c0` | Main-sync temporary work involving a migration runner and inventory test | Dedicated database-authority review |

Never `stash pop` during this programme. Inspect archive refs or apply a
selected stash only in an isolated, current-main worktree.

## Pruned registration records

The following had no filesystem directory, no possible dirty state, and a
dry-run named exactly these three records before pruning. Their commits remain
protected by both their normal branch refs and the archive refs below.

| Former registration | Retained archive ref | Head |
| --- | --- | --- |
| `/tmp/opencode/geo-search-discoverability` | `prunable-worktrees/geo-search-discoverability` | `8ed7df416857bc252e57224f48d5a3cd43924c96` |
| `/tmp/opencode/geo-wave2` | `prunable-worktrees/geo-wave2` | `4895358ddbd2a8a69c37aa5ee3126208eea42ff7` |
| `/tmp/opencode/geo-wave2-clean` | `prunable-worktrees/geo-wave2-clean` | `2e396d3110ad4aa786a64aaa732d3b0ae85e1d92` |

## Review order

1. Database authority, billing, migrations, and schema consumers.
2. Live launch journeys: public search, listing safety, lead conversion, and
   commercial/land flows.
3. Developer, agency, agent, listing, and lead operations.
4. Location, geography, discovery, and navigation.
5. Frontend/system refinements and documentation insight.
6. Generated evidence and retired execution-state cleanup only after the
   related source work is explicitly classified.

Every forward-integration candidate gets a clean current-main worktree, a
dedicated branch, focused tests, and a PR. Database-bearing candidates also
follow the repository database-authority entry contract and must not reuse
historical schema assumptions.

The evidence-backed decisions made during the review are recorded in
[`repository-convergence-2026-08-31-classification.md`](repository-convergence-2026-08-31-classification.md).
