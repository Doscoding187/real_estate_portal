# Worktree Lifecycle Reconciliation Audit

## 1. Executive conclusion

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| The registered worktree estate is fully inventoried, but retirement is not yet safe to plan as an execution batch. | Read-only registry, per-path status, branch topology, bounded filesystem scan, and GitHub PR metadata. | Verified control baseline; created this isolated worktree; inspected registry, branches, filesystem and PR state; classified every observed item. | 48 registered; 48 existing; 0 missing; 35 clean; 13 dirty; 3 detached; 0 open-PR worktrees; 28 merged-PR worktrees; 0 potential retirement candidates; 17 relevant unregistered directories classified. | Merged, clean, detached, or stale-looking does not establish owner approval or deletion safety. |
| Controlled Worktree Retirement cannot yet be planned safely. | Conservative required-condition test. | Preserve dirty, ambiguous, merged, detached, and unregistered items pending founder review. | Ownership, evidence-retention, and stash dependency are not fully established for any candidate. | This report does not authorize retirement. |

## 2. Audit authority and boundaries

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| The audit starts from the approved GME-B2 control baseline. | Git identity and status assertions. | Fetch `origin/main`; require control `main`; require clean status and exact SHA; create audit worktree from `origin/main`. | Control `/home/edwardspc/Desktop/Dev/property-listify-main`; control/origin SHA `1a27213310e635c39dc9924f5b0d0fd269d7cb22`; audit `/home/edwardspc/Desktop/Dev/listify-worktree-lifecycle-reconciliation-audit`; branch `audit/worktree-lifecycle-reconciliation`; timestamp 2026-07-29 Africa/Johannesburg. | Audit worktree is included in final registry counts but not in pre-creation baseline counts. |
| Existing worktrees and branches were not operationally changed. | Safe Git and GitHub reads only. | Registry → status → topology → bounded Dev scan → report authoring in isolated worktree. | Used `git worktree list --porcelain`, status/rev-parse/rev-list/for-each-ref/merge-base/show-ref/stash queries, `gh pr list`, and ruleset readback. | No prune, delete, branch delete, move, repair, reset, rebase, clean, checkout, detach, unlock, or settings/ruleset change. |

## 3. Registered worktree inventory

| ID | Path | Branch/state | HEAD | Upstream | Ahead/behind | Tree | Untracked | PR state | Primary classification | Risk flags | Evidence-bounded interpretation | Retirement |
| --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| WT-01 | `/home/edwardspc/Desktop/Dev/real_estate_portal_clone` | `codex/navigation-cleanup-phase-2-pr` | `c32751da9102` | `origin/codex/navigation-cleanup-phase-2-pr` | `0/0` | dirty | 2 | #312 merged | DIRTY_OR_UNSAFE | untracked=2; stash namespace=3, not attributable | owner/content review required |
| WT-02 | `/home/edwardspc/Desktop/Dev/listify-aae-s1b-proposition-architecture` | `audit/aae-s1b-master-audience-propositions` | `e182bf557254` | `origin/audit/aae-s1b-master-audience-propositions` | `0/0` | clean | 0 | #413 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-03 | `/home/edwardspc/Desktop/Dev/listify-agent-worktree-governance-audit` | `audit/agent-worktree-governance-current-state` | `f7a3e368ba4c` | `origin/main` | `0/50` | clean | 0 | none | UNKNOWN_OWNERSHIP | ahead/behind=0/50; stash namespace=3, not attributable | owner not established |
| WT-04 | `/home/edwardspc/Desktop/Dev/listify-agent-worktree-governance-foundation` | `feat/agent-worktree-governance-foundation` | `b02e3343d536` | `origin/main` | `0/47` | clean | 0 | none | UNKNOWN_OWNERSHIP | ahead/behind=0/47; stash namespace=3, not attributable | owner not established |
| WT-05 | `/home/edwardspc/Desktop/Dev/listify-commercial-proposition-architecture` | `audit/aae-s1-commercial-proposition-architecture` | `468b0d8f7351` | `origin/audit/aae-s1-commercial-proposition-architecture` | `0/0` | clean | 0 | #389 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-06 | `/home/edwardspc/Desktop/Dev/listify-commercial-value-proposition-authority` | `audit/aae-s0-commercial-value-proposition-authority` | `ddd9ad0adbce` | `origin/audit/aae-s0-commercial-value-proposition-authority` | `0/0` | clean | 0 | #386 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-07 | `/home/edwardspc/Desktop/Dev/listify-dba-test-infra-repair` | `fix/dba-test-database-rebuild-authority` | `38f7d17cb799` | `origin/fix/dba-test-database-rebuild-authority` | `0/0` | clean | 0 | #405 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-08 | `/home/edwardspc/Desktop/Dev/listify-dba-ti-s1a-review-closure` | `fix/dba-test-rebuild-review-closure` | `982db9669805` | `origin/fix/dba-test-rebuild-review-closure` | `0/0` | clean | 0 | #406 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-09 | `/home/edwardspc/Desktop/Dev/listify-developer-listing-engine` | `feature/dle-publication-lead-contract-hardening` | `6a4300da1f3c` | `origin/main` | `0/254` | dirty | 0 | none | DIRTY_OR_UNSAFE | tracked=13; ahead/behind=0/254; stash namespace=3, not attributable | owner/content review required |
| WT-10 | `/home/edwardspc/Desktop/Dev/listify-development-delivery-updates-recovery` | `recovery/development-delivery-updates-control-rescue-20260721` | `9622bcc5be1d` | `origin/main` | `0/141` | dirty | 3 | none | DIRTY_OR_UNSAFE | tracked=5; untracked=3; ahead/behind=0/141; stash namespace=3, not attributable | owner/content review required |
| WT-11 | `/home/edwardspc/Desktop/Dev/listify-development-home-v1` | `feat/developer-development-home-v1` | `b139ec33c905` | `origin/feat/developer-development-home-v1` | `0/0` | dirty | 1 | #374 merged | DIRTY_OR_UNSAFE | untracked=1; stash namespace=3, not attributable | owner/content review required |
| WT-12 | `/home/edwardspc/Desktop/Dev/listify-dle-reconstruction` | `recovery/property-listing-engine-continuation-2026-07-02` | `1138aef71446` | `origin/main` | `0/271` | dirty | 19 | none | DIRTY_OR_UNSAFE | tracked=10; untracked=19; ahead/behind=0/271; stash namespace=3, not attributable | owner/content review required |
| WT-13 | `/home/edwardspc/Desktop/Dev/listify-doe-s2-audit` | `audit/doe-s2-structured-updates-milestones` | `249633b00d59` | `origin/main` | `0/149` | dirty | 1 | none | DIRTY_OR_UNSAFE | untracked=1; ahead/behind=0/149; stash namespace=3, not attributable | owner/content review required |
| WT-14 | `/home/edwardspc/Desktop/Dev/listify-evidence-sequence-provenance` | `fix/evidence-provenance-contract-review-closure` | `c7181073e356` | `origin/fix/evidence-provenance-contract-review-closure` | `0/0` | clean | 0 | #423 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-15 | `/home/edwardspc/Desktop/Dev/listify-explore-authority` | `feat/explore-option-a-authority` | `454f127ad47a` | `origin/main` | `0/159` | dirty | 5 | none | DIRTY_OR_UNSAFE | tracked=2; untracked=5; ahead/behind=0/159; stash namespace=3, not attributable | owner/content review required |
| WT-16 | `/home/edwardspc/Desktop/Dev/listify-explore-discovery` | `docs/explore-discovery-canonical-foundation` | `e4b36b1f4a85` | `origin/docs/explore-discovery-canonical-foundation` | `0/0` | clean | 0 | #368 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-17 | `/home/edwardspc/Desktop/Dev/listify-explore-phase-0` | `feat/explore-option-a-phase-0` | `9c83433c8206` | `origin/feat/explore-option-a-phase-0` | `0/0` | clean | 0 | #370 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-18 | `/home/edwardspc/Desktop/Dev/listify-explore-phase-1` | `feat/explore-option-a-phase-1` | `099b7a9bd041` | `origin/feat/explore-option-a-phase-1` | `0/0` | clean | 0 | #372 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-19 | `/home/edwardspc/Desktop/Dev/listify-fpe-s1-feedback-id-fix` | `fix/fpe-s1-feedback-state-ids` | `a9ad92a968d3` | `origin/fix/fpe-s1-feedback-state-ids` | `0/0` | clean | 0 | #408 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-20 | `/home/edwardspc/Desktop/Dev/listify-fpe-s1-shared-foundation` | `feat/fpe-s1-shared-frontend-foundation` | `5ac32e3d6145` | `origin/feat/fpe-s1-shared-frontend-foundation` | `0/0` | clean | 0 | #407 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-21 | `/home/edwardspc/Desktop/Dev/listify-frontend-product-experience-audit` | `audit/frontend-product-experience-v1` | `a9029123e902` | `origin/main` | `0/147` | clean | 0 | none | UNKNOWN_OWNERSHIP | ahead/behind=0/147; stash namespace=3, not attributable | owner not established |
| WT-22 | `/home/edwardspc/Desktop/Dev/listify-github-merge-gate-audit` | `audit/github-merge-gate-enforcement` | `9b675d396a09` | `origin/audit/github-merge-gate-enforcement` | `0/0` | clean | 0 | #424 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-23 | `/home/edwardspc/Desktop/Dev/listify-github-merge-gate-enforcement` | `ops/github-merge-gate-probe-verification` | `7b047530d04c` | `origin/ops/github-merge-gate-probe-verification` | `0/0` | clean | 0 | #428 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-24 | `/home/edwardspc/Desktop/Dev/listify-homepage-improvements` | `codex/homepage-clarity-trust` | `b7189b524efa` | `origin/main` | `1/336` | clean | 0 | none | UNKNOWN_OWNERSHIP | ahead/behind=1/336; stash namespace=3, not attributable | owner not established |
| WT-25 | `/home/edwardspc/Desktop/Dev/listify-intelligent-listing-engine-v2` | `feature/ile-phase3d-draft-ui` | `9a2401f2bf0b` | `NONE` | `NA` | clean | 0 | none | UNKNOWN_OWNERSHIP | no upstream; stash namespace=3, not attributable | owner not established |
| WT-26 | `/home/edwardspc/Desktop/Dev/listify-launch-agency-founding-access` | `feat/launch-agency-founding-access` | `b02e3343d536` | `origin/main` | `0/47` | dirty | 4 | none | DIRTY_OR_UNSAFE | tracked=9; untracked=4; ahead/behind=0/47; stash namespace=3, not attributable | owner/content review required |
| WT-27 | `/home/edwardspc/Desktop/Dev/listify-launch-readiness-audit` | `audit/launch-readiness-product-convergence` | `9b82bac36187` | `origin/audit/launch-readiness-product-convergence` | `0/0` | clean | 0 | #418 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-28 | `/home/edwardspc/Desktop/Dev/listify-listing-wizard-overhaul` | `feature/listing-wizard-overhaul` | `a374853568bc` | `origin/main` | `6/336` | dirty | 6 | none | DIRTY_OR_UNSAFE | tracked=2; untracked=6; ahead/behind=6/336; stash namespace=3, not attributable | owner/content review required |
| WT-29 | `/home/edwardspc/Desktop/Dev/listify-local-preview-authority` | `fix/local-preview-environment-authority-final-review-closure` | `13b8adfef465` | `origin/fix/local-preview-environment-authority-final-review-closure` | `0/0` | clean | 0 | #421 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-30 | `/home/edwardspc/Desktop/Dev/listify-main-navigation-restoration` | `feat/main-platform-navigation-restoration` | `585bbbc5bba8` | `origin/feat/main-platform-navigation-restoration` | `0/0` | clean | 0 | #409 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-31 | `/home/edwardspc/Desktop/Dev/listify-nav-s1-review-closure` | `fix/nav-s1-review-closure` | `fe2024f38753` | `origin/fix/nav-s1-review-closure` | `0/0` | clean | 0 | #410 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-32 | `/home/edwardspc/Desktop/Dev/listify-plds-f1-canonical-frontend-foundation` | `feat/plds-f1-canonical-frontend-foundation` | `f5faa83e0ef5` | `origin/feat/plds-f1-canonical-frontend-foundation` | `0/0` | dirty | 7 | #412 merged | DIRTY_OR_UNSAFE | tracked=10; untracked=7; stash namespace=3, not attributable | owner/content review required |
| WT-33 | `/home/edwardspc/Desktop/Dev/listify-plds-r1-units-audit` | `audit/plds-r1-units-responsive-scaling` | `53f44f8f46c9` | `origin/audit/plds-r1-units-responsive-scaling` | `0/0` | clean | 0 | #411 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-34 | `/home/edwardspc/Desktop/Dev/listify-pxf-s0-audit` | `audit/pxf-s0-whole-product-readiness` | `b4d1c79d024b` | `origin/main` | `0/74` | clean | 0 | none | UNKNOWN_OWNERSHIP | ahead/behind=0/74; stash namespace=3, not attributable | owner not established |
| WT-35 | `/home/edwardspc/Desktop/Dev/listify-pxf-s1` | `feat/pxf-s1-public-prospect-convergence` | `11f7f498aacf` | `origin/feat/pxf-s1-public-prospect-convergence` | `0/0` | clean | 0 | #404 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-36 | `/home/edwardspc/Desktop/Dev/listify-secret-exposure-containment` | `security/secret-exposure-containment-20260726` | `70169bf54947` | `origin/security/secret-exposure-containment-20260726` | `0/0` | clean | 0 | #402 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-37 | `/home/edwardspc/Desktop/Dev/listify-services-engine-clean` | `DETACHED` | `0be8202680d9` | `NONE` | `NA` | dirty | 1 | none | DIRTY_OR_UNSAFE | untracked=1; no upstream; detached; stash namespace=3, not attributable | owner/content review required |
| WT-38 | `/home/edwardspc/Desktop/Dev/listify-services-engine-phase0` | `feature/services-engine-phase0` | `541309f23da7` | `NONE` | `NA` | dirty | 3 | none | DIRTY_OR_UNSAFE | tracked=4; untracked=3; no upstream; stash namespace=3, not attributable | owner/content review required |
| WT-39 | `/home/edwardspc/Desktop/Dev/listify-single-property-engine` | `DETACHED` | `0be8202680d9` | `NONE` | `NA` | clean | 0 | none | DETACHED_VERIFICATION | no upstream; detached; stash namespace=3, not attributable | detached purpose/evidence review |
| WT-40 | `/home/edwardspc/Desktop/Dev/listify-ui-launch-incubation` | `wip/ui-launch-incubation` | `efb7d2a2b28c` | `NONE` | `NA` | clean | 0 | none | UNKNOWN_OWNERSHIP | no upstream; stash namespace=3, not attributable | owner not established |
| WT-41 | `/home/edwardspc/Desktop/Dev/listify-worktree-lifecycle-reconciliation-audit` | `audit/worktree-lifecycle-reconciliation` | `1a27213310e6` | `origin/main` | `0/0` | clean | 0 | none | ACTIVE_AUTHORIZED_WORKSTREAM | stash namespace=3, not attributable | owner not established |
| WT-42 | `/home/edwardspc/Desktop/Dev/property-listify-aalc-s1` | `aalc-s1-canonical-listing-publication-entitlement` | `b214ccd47445` | `origin/aalc-s1-canonical-listing-publication-entitlement` | `0/0` | clean | 0 | #365 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-43 | `/home/edwardspc/Desktop/Dev/property-listify-aalc-s2` | `aalc-s2-retire-legacy-property-create` | `67424ac64e09` | `origin/aalc-s2-retire-legacy-property-create` | `0/0` | clean | 0 | #364 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-44 | `/home/edwardspc/Desktop/Dev/property-listify-aalc-s3` | `aalc-s3-principal-bootstrap-authority` | `3aa23c1a8c44` | `origin/aalc-s3-principal-bootstrap-authority` | `0/0` | clean | 0 | #371 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-45 | `/home/edwardspc/Desktop/Dev/property-listify-gme-b2-final-verification` | `DETACHED` | `1a27213310e6` | `NONE` | `NA` | clean | 0 | none | DETACHED_VERIFICATION | no upstream; detached; stash namespace=3, not attributable | detached purpose/evidence review |
| WT-46 | `/home/edwardspc/Desktop/Dev/property-listify-main` | `main` | `1a27213310e6` | `origin/main` | `0/0` | clean | 0 | none | CONTROL_AUTHORITY | stash namespace=3, not attributable | protected control |
| WT-47 | `/home/edwardspc/Desktop/Dev/property-listify-prospect-process-fix` | `fix/prospect-journey-process-group-lifecycle` | `36cdb201c47d` | `origin/fix/prospect-journey-process-group-lifecycle` | `0/0` | clean | 0 | #366 merged | MERGED_BUT_PRESERVATION_PENDING | stash namespace=3, not attributable | merged; preserve pending |
| WT-48 | `/home/edwardspc/Desktop/Dev/property-listify-saved-search-ci-repair` | `fix/saved-search-ci-baseline` | `37dd44c5cfa1` | `origin/fix/saved-search-ci-baseline` | `0/0` | dirty | 3 | #373 merged | DIRTY_OR_UNSAFE | untracked=3; stash namespace=3, not attributable | owner/content review required |

### Classification counts

| Classification | Count |
| --- | ---: |
| CONTROL_AUTHORITY | 1 |
| ACTIVE_AUTHORIZED_WORKSTREAM | 1 |
| MERGED_BUT_PRESERVATION_PENDING | 24 |
| DETACHED_VERIFICATION | 2 |
| DIRTY_OR_UNSAFE | 13 |
| STALE_REGISTRY_OR_MISSING_PATH | 0 registered entries |
| UNREGISTERED_REPOSITORY_OR_WORKTREE | 0 registered entries; see §8 |
| UNKNOWN_OWNERSHIP | 7 |
| POTENTIAL_RETIREMENT_CANDIDATE | 0 |

## 4. Branch inventory

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| Local branch topology is complete for this clone. | Enumerate local refs, upstreams, worktree mapping, merge-base and remote-ref existence. | Inspect every `refs/heads` entry and compare to `origin/main`. | 126 local branches; 105 merged into `origin/main`; 21 unmerged; 106 with upstream; 20 without upstream; 45 checked out. | Git ancestry is not owner intent. |
| Remote branch existence is separate evidence. | Enumerate `refs/remotes/origin` and compare names. | Exclude symbolic `origin/HEAD`; compare named remote refs to local names. | 397 named remote-tracking branches; 306 remote-only; 1 symbolic ref excluded. | Remote-tracking refs may be stale; no prune was run. |

### Complete local branch inventory

| Branch | SHA | Checked-out worktree | Upstream | Ahead/behind | Merged | Remote exists | PR association | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `aalc-s1-canonical-listing-publication-entitlement` | `b214ccd47445` | `/home/edwardspc/Desktop/Dev/property-listify-aalc-s1` | `origin/aalc-s1-canonical-listing-publication-entitlement` | `0/0` | yes | yes | #365 merged | checked out |
| `aalc-s2-retire-legacy-property-create` | `67424ac64e09` | `/home/edwardspc/Desktop/Dev/property-listify-aalc-s2` | `origin/aalc-s2-retire-legacy-property-create` | `0/0` | yes | yes | #364 merged | checked out |
| `aalc-s3-principal-bootstrap-authority` | `3aa23c1a8c44` | `/home/edwardspc/Desktop/Dev/property-listify-aalc-s3` | `origin/aalc-s3-principal-bootstrap-authority` | `0/0` | yes | yes | #371 merged | checked out |
| `audit/aae-s0-commercial-value-proposition-authority` | `ddd9ad0adbce` | `/home/edwardspc/Desktop/Dev/listify-commercial-value-proposition-authority` | `origin/audit/aae-s0-commercial-value-proposition-authority` | `0/0` | yes | yes | #386 merged | checked out |
| `audit/aae-s1-commercial-proposition-architecture` | `468b0d8f7351` | `/home/edwardspc/Desktop/Dev/listify-commercial-proposition-architecture` | `origin/audit/aae-s1-commercial-proposition-architecture` | `0/0` | yes | yes | #389 merged | checked out |
| `audit/aae-s1b-master-audience-propositions` | `e182bf557254` | `/home/edwardspc/Desktop/Dev/listify-aae-s1b-proposition-architecture` | `origin/audit/aae-s1b-master-audience-propositions` | `0/0` | yes | yes | #413 merged | checked out |
| `audit/agent-worktree-governance-current-state` | `f7a3e368ba4c` | `/home/edwardspc/Desktop/Dev/listify-agent-worktree-governance-audit` | `origin/main` | `0/50` | yes | no | none | checked out |
| `audit/doe-s2-structured-updates-milestones` | `249633b00d59` | `/home/edwardspc/Desktop/Dev/listify-doe-s2-audit` | `origin/main` | `0/149` | yes | no | none | checked out |
| `audit/evidence-sequence-provenance-contract` | `b6b4af01796f` | — | `origin/audit/evidence-sequence-provenance-contract` | `0/0` | yes | yes | #422 merged | not checked out |
| `audit/frontend-product-experience-v1` | `a9029123e902` | `/home/edwardspc/Desktop/Dev/listify-frontend-product-experience-audit` | `origin/main` | `0/147` | yes | no | none | checked out |
| `audit/github-merge-gate-enforcement` | `9b675d396a09` | `/home/edwardspc/Desktop/Dev/listify-github-merge-gate-audit` | `origin/audit/github-merge-gate-enforcement` | `0/0` | yes | yes | #424 merged | checked out |
| `audit/launch-readiness-product-convergence` | `9b82bac36187` | `/home/edwardspc/Desktop/Dev/listify-launch-readiness-audit` | `origin/audit/launch-readiness-product-convergence` | `0/0` | yes | yes | #418 merged | checked out |
| `audit/plds-r1-units-responsive-scaling` | `53f44f8f46c9` | `/home/edwardspc/Desktop/Dev/listify-plds-r1-units-audit` | `origin/audit/plds-r1-units-responsive-scaling` | `0/0` | yes | yes | #411 merged | checked out |
| `audit/pxf-s0-whole-product-readiness` | `b4d1c79d024b` | `/home/edwardspc/Desktop/Dev/listify-pxf-s0-audit` | `origin/main` | `0/74` | yes | no | none | checked out |
| `audit/worktree-lifecycle-reconciliation` | `1a27213310e6` | `/home/edwardspc/Desktop/Dev/listify-worktree-lifecycle-reconciliation-audit` | `origin/main` | `0/0` | yes | no | none | checked out |
| `backup/doe-s0-before-rebase-3dc432a5` | `3dc432a5bb95` | — | `NONE` | `1/191` | no | no | none | not checked out |
| `backup/saved-search-ci-local-e3977f73` | `e3977f7397f5` | — | `NONE` | `1/159` | no | no | none | not checked out |
| `chore/security-remove-tracked-vercel-env` | `2fae5ee873fb` | — | `origin/chore/security-remove-tracked-vercel-env` | `0/0` | no | yes | none | not checked out |
| `codex/development-card-data-guard` | `a72706e99156` | — | `origin/codex/development-card-data-guard` | `0/0` | yes | yes | #322 merged | not checked out |
| `codex/discovery-listing-optimization-plan` | `6b047c01b139` | — | `NONE` | `0/308` | yes | no | none | not checked out |
| `codex/discovery-listing-render-audit` | `65fc2a1e0417` | — | `origin/codex/discovery-listing-render-audit` | `0/0` | yes | yes | #320 merged | not checked out |
| `codex/distribution-buyer-brochures-migrations` | `91b463f3a53d` | — | `origin/codex/distribution-buyer-brochures-migrations` | `0/0` | yes | yes | #306 merged | not checked out |
| `codex/distribution-docs-v2` | `3b2235948e02` | — | `origin/codex/distribution-docs-v2` | `0/0` | no | yes | #298 open | not checked out |
| `codex/dynamic-city-dropdown-fallback` | `57a17774eb20` | — | `origin/codex/dynamic-city-dropdown-fallback` | `0/0` | yes | yes | #328 merged | not checked out |
| `codex/dynamic-nav-first-slice` | `670ec4358ca7` | — | `origin/codex/dynamic-nav-first-slice` | `0/0` | yes | yes | #327 merged | not checked out |
| `codex/enhanced-nav-link-seo-validation` | `cee6fb8c705b` | — | `origin/codex/enhanced-nav-link-seo-validation` | `0/0` | yes | yes | #318 merged | not checked out |
| `codex/enhanced-navigation-optimization` | `4f9f4df077bc` | — | `origin/codex/enhanced-navigation-optimization` | `0/0` | yes | yes | #315 merged | not checked out |
| `codex/enhanced-navigation-ui-redesign` | `5ae31c61bb7b` | — | `origin/codex/enhanced-navigation-ui-redesign` | `0/0` | yes | yes | #317 merged | not checked out |
| `codex/enhanced-navigation-ui-refinement` | `d591d17cb2b1` | — | `origin/codex/enhanced-navigation-ui-refinement` | `0/0` | yes | yes | #316 merged | not checked out |
| `codex/homepage-autosuggest-foundation` | `bf35f1e5793a` | — | `origin/codex/homepage-autosuggest-foundation` | `0/0` | yes | yes | #330 merged | not checked out |
| `codex/homepage-clarity-trust` | `b7189b524efa` | `/home/edwardspc/Desktop/Dev/listify-homepage-improvements` | `origin/main` | `1/336` | no | no | none | checked out |
| `codex/lead-routing-engine` | `91c10ec61e77` | — | `NONE` | `1/363` | no | no | none | not checked out |
| `codex/location-nav-data-adapter` | `d98d0cec6ecd` | — | `origin/codex/location-nav-data-adapter` | `0/0` | yes | yes | #326 merged | not checked out |
| `codex/location-page-hook-order-guard` | `dde86303217b` | — | `origin/codex/location-page-hook-order-guard` | `0/0` | yes | yes | #323 merged | not checked out |
| `codex/location-pages-data-guards` | `c01bc9818691` | — | `origin/codex/location-pages-data-guards` | `0/0` | yes | yes | #321 merged | not checked out |
| `codex/location-pages-runtime-fix` | `716bf330f3c7` | — | `origin/codex/location-pages-runtime-fix` | `0/0` | yes | yes | #319 merged | not checked out |
| `codex/nav-engine-boundary-audit` | `ed4e70e59c2d` | — | `origin/codex/nav-engine-boundary-audit` | `0/0` | yes | yes | #329 merged | not checked out |
| `codex/navigation-cleanup-phase-1` | `917bbc6c06e4` | — | `NONE` | `0/368` | yes | no | none | not checked out |
| `codex/navigation-cleanup-phase-2` | `1f34ef7a2de9` | — | `origin/main` | `0/331` | yes | no | none | not checked out |
| `codex/navigation-cleanup-phase-2-pr` | `c32751da9102` | `/home/edwardspc/Desktop/Dev/real_estate_portal_clone` | `origin/codex/navigation-cleanup-phase-2-pr` | `0/0` | yes | yes | #312 merged | checked out |
| `codex/navigation-post-merge-verification` | `0821617111ae` | — | `NONE` | `0/327` | yes | no | none | not checked out |
| `codex/referrer-dashboard-engagement` | `64c3b79d23ac` | — | `origin/codex/referrer-dashboard-engagement` | `0/0` | no | yes | #302 open, #300 merged | not checked out |
| `codex/referrer-opportunity-preview-clean` | `cb3bd88abd94` | — | `origin/codex/referrer-opportunity-preview-clean` | `0/0` | yes | yes | #303 merged | not checked out |
| `codex/referrer-overview-color-balance` | `5da5247671d3` | — | `origin/codex/referrer-overview-color-balance` | `0/0` | yes | yes | #304 merged | not checked out |
| `codex/referrer-overview-opportunity-preview` | `cb3bd88abd94` | — | `origin/codex/referrer-overview-opportunity-preview` | `0/0` | yes | yes | none | not checked out |
| `codex/search-discovery-engine-audit` | `a6ba0b48a0c3` | — | `origin/codex/search-discovery-engine-audit` | `0/0` | yes | yes | #325 merged | not checked out |
| `codex/search-discovery-suggest-api-foundation` | `f221613a5be4` | — | `NONE` | `0/288` | yes | no | none | not checked out |
| `codex/search-results-identity-guard` | `d7b72e08b8bf` | — | `origin/codex/search-results-identity-guard` | `0/0` | yes | yes | #324 merged | not checked out |
| `docs/explore-discovery-canonical-foundation` | `e4b36b1f4a85` | `/home/edwardspc/Desktop/Dev/listify-explore-discovery` | `origin/docs/explore-discovery-canonical-foundation` | `0/0` | yes | yes | #368 merged | checked out |
| `docs/listing-engine-recovery-boundary` | `3fc59ae7e485` | — | `origin/docs/listing-engine-recovery-boundary` | `0/0` | yes | yes | #340 merged | not checked out |
| `docs/navigation-architecture-decision` | `0332f61893d1` | — | `origin/docs/navigation-architecture-decision` | `0/0` | yes | yes | #313 merged | not checked out |
| `docs/property-listify-architecture-baseline-v1` | `8f7441c454a9` | — | `origin/docs/property-listify-architecture-baseline-v1` | `0/0` | yes | yes | #341 merged | not checked out |
| `docs/prospect-engine-architecture` | `b8ddb879c923` | — | `origin/docs/prospect-engine-architecture` | `0/0` | yes | yes | #362 merged | not checked out |
| `feat/agency-canvassing-mvp` | `0a8c08235f5e` | — | `origin/feat/agency-canvassing-mvp` | `0/0` | yes | yes | #354 merged | not checked out |
| `feat/agency-commission-reconciliation-mvp` | `267dd2294ffb` | — | `origin/feat/agency-commission-reconciliation-mvp` | `0/0` | yes | yes | #357 merged | not checked out |
| `feat/agency-listing-performance-mvp` | `a650d7e37724` | — | `origin/feat/agency-listing-performance-mvp` | `0/0` | yes | yes | #360 merged | not checked out |
| `feat/agency-mandate-conversion-mvp` | `061fed5f4c0d` | — | `origin/feat/agency-mandate-conversion-mvp` | `0/0` | yes | yes | #356 merged | not checked out |
| `feat/agency-offers-transactions` | `0380cd2a52be` | — | `origin/feat/agency-offers-transactions` | `0/0` | yes | yes | #353 merged, #352 merged, #351 merged | not checked out |
| `feat/agency-operating-core` | `02f2913c27a9` | — | `origin/feat/agency-operating-core` | `0/0` | yes | yes | #350 merged, #349 merged, #348 merged | not checked out |
| `feat/agency-pain-point-loop-closure` | `f3f2ec92d5c1` | — | `origin/feat/agency-pain-point-loop-closure` | `0/0` | yes | yes | #355 merged | not checked out |
| `feat/agency-recruitment-mvp` | `e460edaf540c` | — | `NONE` | `0/218` | yes | no | none | not checked out |
| `feat/agent-worktree-governance-foundation` | `b02e3343d536` | `/home/edwardspc/Desktop/Dev/listify-agent-worktree-governance-foundation` | `origin/main` | `0/47` | yes | no | none | checked out |
| `feat/developer-development-home-v1` | `b139ec33c905` | `/home/edwardspc/Desktop/Dev/listify-development-home-v1` | `origin/feat/developer-development-home-v1` | `0/0` | yes | yes | #374 merged | checked out |
| `feat/explore-option-a-authority` | `454f127ad47a` | `/home/edwardspc/Desktop/Dev/listify-explore-authority` | `origin/main` | `0/159` | yes | no | none | checked out |
| `feat/explore-option-a-phase-0` | `9c83433c8206` | `/home/edwardspc/Desktop/Dev/listify-explore-phase-0` | `origin/feat/explore-option-a-phase-0` | `0/0` | yes | yes | #370 merged | checked out |
| `feat/explore-option-a-phase-1` | `099b7a9bd041` | `/home/edwardspc/Desktop/Dev/listify-explore-phase-1` | `origin/feat/explore-option-a-phase-1` | `0/0` | yes | yes | #372 merged | checked out |
| `feat/fpe-s1-shared-frontend-foundation` | `5ac32e3d6145` | `/home/edwardspc/Desktop/Dev/listify-fpe-s1-shared-foundation` | `origin/feat/fpe-s1-shared-frontend-foundation` | `0/0` | yes | yes | #407 merged | checked out |
| `feat/launch-agency-founding-access` | `b02e3343d536` | `/home/edwardspc/Desktop/Dev/listify-launch-agency-founding-access` | `origin/main` | `0/47` | yes | no | none | checked out |
| `feat/listing-wizard-structured-property-features` | `dbc2cd947569` | — | `NONE` | `0/274` | yes | no | none | not checked out |
| `feat/listings-v2-workflow-foundation` | `feae2a6f94c4` | — | `origin/feat/listings-v2-workflow-foundation` | `0/0` | yes | yes | #338 merged | not checked out |
| `feat/main-platform-navigation-restoration` | `585bbbc5bba8` | `/home/edwardspc/Desktop/Dev/listify-main-navigation-restoration` | `origin/feat/main-platform-navigation-restoration` | `0/0` | yes | yes | #409 merged | checked out |
| `feat/plds-f1-canonical-frontend-foundation` | `f5faa83e0ef5` | `/home/edwardspc/Desktop/Dev/listify-plds-f1-canonical-frontend-foundation` | `origin/feat/plds-f1-canonical-frontend-foundation` | `0/0` | yes | yes | #412 merged | checked out |
| `feat/prospect-journey-tracker-mvp` | `7273f8b9c881` | — | `origin/feat/prospect-journey-tracker-mvp` | `0/0` | yes | yes | #363 merged | not checked out |
| `feat/pxf-s1-public-prospect-convergence` | `11f7f498aacf` | `/home/edwardspc/Desktop/Dev/listify-pxf-s1` | `origin/feat/pxf-s1-public-prospect-convergence` | `0/0` | yes | yes | #404 merged | checked out |
| `feat/services-property-journey-actions` | `bd90ec42c4f8` | — | `origin/feat/services-property-journey-actions` | `0/0` | yes | yes | #339 merged | not checked out |
| `feature/agent-lead-visibility-followup` | `a82fb681e1e2` | — | `origin/feature/agent-lead-visibility-followup` | `0/0` | yes | yes | #346 merged | not checked out |
| `feature/dle-publication-lead-contract-hardening` | `6a4300da1f3c` | `/home/edwardspc/Desktop/Dev/listify-developer-listing-engine` | `origin/main` | `0/254` | yes | no | none | checked out |
| `feature/dle-publication-lead-contract-hardening-mainline` | `1a9ef539c205` | — | `origin/feature/dle-publication-lead-contract-hardening-mainline` | `0/0` | yes | yes | #343 merged, #342 merged | not checked out |
| `feature/ile-phase3-canonical-contracts` | `14af368d2636` | — | `NONE` | `4/336` | no | no | none | not checked out |
| `feature/ile-phase3c-draft-backend` | `aff52e4e25a7` | — | `NONE` | `6/336` | no | no | none | not checked out |
| `feature/ile-phase3c-draft-contract` | `49c48426d5ff` | — | `NONE` | `5/336` | no | no | none | not checked out |
| `feature/ile-phase3d-draft-ui` | `9a2401f2bf0b` | `/home/edwardspc/Desktop/Dev/listify-intelligent-listing-engine-v2` | `NONE` | `8/336` | no | no | none | checked out |
| `feature/intelligent-listing-engine-v2-baseline` | `5422ba4b2959` | — | `origin/main` | `1/336` | no | no | none | not checked out |
| `feature/listing-wizard-overhaul` | `a374853568bc` | `/home/edwardspc/Desktop/Dev/listify-listing-wizard-overhaul` | `origin/main` | `6/336` | no | no | none | checked out |
| `feature/mvp-canonical-property-lead-ownership` | `bffaace5f037` | — | `origin/feature/mvp-canonical-property-lead-ownership` | `0/0` | yes | yes | #344 merged | not checked out |
| `feature/services-engine-phase0` | `541309f23da7` | `/home/edwardspc/Desktop/Dev/listify-services-engine-phase0` | `NONE` | `0/323` | yes | no | none | checked out |
| `fix/agency-explore-metrics-defaults` | `012e756d6b80` | — | `origin/fix/agency-explore-metrics-defaults` | `0/0` | yes | yes | #347 merged | not checked out |
| `fix/database-security-containment` | `e27369a6464b` | — | `origin/fix/database-security-containment` | `0/0` | yes | yes | #376 merged | not checked out |
| `fix/database-security-review-followup` | `66df2c5eb029` | — | `origin/fix/database-security-review-followup` | `0/0` | yes | yes | #377 merged | not checked out |
| `fix/dba-test-database-rebuild-authority` | `38f7d17cb799` | `/home/edwardspc/Desktop/Dev/listify-dba-test-infra-repair` | `origin/fix/dba-test-database-rebuild-authority` | `0/0` | yes | yes | #405 merged | checked out |
| `fix/dba-test-rebuild-review-closure` | `982db9669805` | `/home/edwardspc/Desktop/Dev/listify-dba-ti-s1a-review-closure` | `origin/fix/dba-test-rebuild-review-closure` | `0/0` | yes | yes | #406 merged | checked out |
| `fix/dle-auction-datetime-normalization` | `21f7c5ecd3ed` | — | `origin/fix/dle-auction-datetime-normalization` | `0/0` | yes | yes | #335 merged | not checked out |
| `fix/evidence-provenance-contract-review-closure` | `c7181073e356` | `/home/edwardspc/Desktop/Dev/listify-evidence-sequence-provenance` | `origin/fix/evidence-provenance-contract-review-closure` | `0/0` | yes | yes | #423 merged | checked out |
| `fix/fpe-s1-feedback-state-ids` | `a9ad92a968d3` | `/home/edwardspc/Desktop/Dev/listify-fpe-s1-feedback-id-fix` | `origin/fix/fpe-s1-feedback-state-ids` | `0/0` | yes | yes | #408 merged | checked out |
| `fix/github-merge-gate-active-state-header` | `20b52d2c513c` | — | `origin/fix/github-merge-gate-active-state-header` | `0/0` | yes | yes | #429 merged | not checked out |
| `fix/github-merge-gate-rollback-contract` | `b50bd7d4e31d` | — | `origin/fix/github-merge-gate-rollback-contract` | `0/0` | yes | yes | #426 merged | not checked out |
| `fix/homepage-property-card-density` | `25a38c2b8683` | — | `origin/fix/homepage-property-card-density` | `0/0` | no | yes | none | not checked out |
| `fix/listings-source-listing-projection-bridge` | `397b80440759` | — | `origin/fix/listings-source-listing-projection-bridge` | `0/0` | yes | yes | #337 merged | not checked out |
| `fix/local-database-reprovisioning-workflow` | `a77ce321ecae` | — | `origin/fix/local-database-reprovisioning-workflow` | `0/0` | yes | yes | #361 merged | not checked out |
| `fix/local-preview-environment-authority` | `5c2de2306067` | — | `origin/fix/local-preview-environment-authority` | `0/0` | yes | yes | #419 merged | not checked out |
| `fix/local-preview-environment-authority-final-review-closure` | `13b8adfef465` | `/home/edwardspc/Desktop/Dev/listify-local-preview-authority` | `origin/fix/local-preview-environment-authority-final-review-closure` | `0/0` | yes | yes | #421 merged | checked out |
| `fix/local-preview-environment-authority-review-closure` | `cf728f387cee` | — | `origin/fix/local-preview-environment-authority-review-closure` | `0/0` | yes | yes | #420 merged | not checked out |
| `fix/mobile-pdp-gallery-checks-polish` | `5856585da40d` | — | `origin/fix/mobile-pdp-gallery-checks-polish` | `0/0` | yes | yes | #333 merged | not checked out |
| `fix/nav-s1-review-closure` | `fe2024f38753` | `/home/edwardspc/Desktop/Dev/listify-nav-s1-review-closure` | `origin/fix/nav-s1-review-closure` | `0/0` | yes | yes | #410 merged | checked out |
| `fix/property-detail-conversion-polish` | `3ff5a93e3e05` | — | `origin/fix/property-detail-conversion-polish` | `0/0` | yes | yes | #332 merged | not checked out |
| `fix/property-detail-rich-mirror` | `6949e7dd66a3` | — | `origin/fix/property-detail-rich-mirror` | `0/0` | yes | yes | #331 merged | not checked out |
| `fix/prospect-journey-process-group-lifecycle` | `36cdb201c47d` | `/home/edwardspc/Desktop/Dev/property-listify-prospect-process-fix` | `origin/fix/prospect-journey-process-group-lifecycle` | `0/0` | yes | yes | #366 merged | checked out |
| `fix/revert-railway-startup-rollback` | `bc81ef112fa0` | — | `origin/fix/revert-railway-startup-rollback` | `0/0` | yes | yes | #299 merged, #297 merged, #296 merged, #295 merged | not checked out |
| `fix/saved-search-ci-baseline` | `37dd44c5cfa1` | `/home/edwardspc/Desktop/Dev/property-listify-saved-search-ci-repair` | `origin/fix/saved-search-ci-baseline` | `0/0` | yes | yes | #373 merged | checked out |
| `main` | `1a27213310e6` | `/home/edwardspc/Desktop/Dev/property-listify-main` | `origin/main` | `0/0` | yes | yes | none | checked out |
| `ops/github-merge-gate-activation-record` | `1ea394988d6f` | — | `origin/ops/github-merge-gate-activation-record` | `0/0` | yes | yes | #427 merged | not checked out |
| `ops/github-merge-gate-enforcement` | `8d4fc7a7a9cc` | — | `origin/ops/github-merge-gate-enforcement` | `0/0` | yes | yes | #425 merged | not checked out |
| `ops/github-merge-gate-probe-verification` | `7b047530d04c` | `/home/edwardspc/Desktop/Dev/listify-github-merge-gate-enforcement` | `origin/ops/github-merge-gate-probe-verification` | `0/0` | yes | yes | #428 merged | checked out |
| `recovery/development-delivery-updates-control-rescue-20260721` | `9622bcc5be1d` | `/home/edwardspc/Desktop/Dev/listify-development-delivery-updates-recovery` | `origin/main` | `0/141` | yes | no | none | checked out |
| `recovery/dle-dirty-preserved-2026-07-02` | `d9d106c870a9` | — | `origin/recovery/dle-dirty-preserved-2026-07-02` | `0/0` | no | yes | none | not checked out |
| `recovery/dle-reconstruction-2026-07-02` | `1f3b5cb0965f` | — | `origin/recovery/dle-reconstruction-2026-07-02` | `0/0` | yes | yes | #334 merged | not checked out |
| `recovery/dle-wizard-verification-2026-06-02` | `e5f28f699e5d` | — | `NONE` | `4/363` | no | no | none | not checked out |
| `recovery/lead-routing-verification-2026-06-02` | `b63fd8c0e21f` | — | `NONE` | `21/363` | no | no | none | not checked out |
| `recovery/mixed-dle-home-legacy-20260619` | `abb79b941c15` | — | `NONE` | `181/363` | no | no | none | not checked out |
| `recovery/property-listing-engine-continuation-2026-07-02` | `1138aef71446` | `/home/edwardspc/Desktop/Dev/listify-dle-reconstruction` | `origin/main` | `0/271` | yes | no | none | checked out |
| `recovery/services-engine-clean-baseline-2026-07-02` | `a94eb04ebedf` | — | `origin/recovery/services-engine-clean-baseline-2026-07-02` | `0/0` | no | yes | none | not checked out |
| `recovery/uncommitted-engine-work-2026-06-02` | `d40e0c2c6a24` | — | `NONE` | `1/363` | no | no | none | not checked out |
| `refactor/dle-submit-payload-mapper` | `4f17a531f98e` | — | `origin/refactor/dle-submit-payload-mapper` | `0/0` | yes | yes | #336 merged | not checked out |
| `release/mvp-staging-readiness` | `26e526b0221c` | — | `NONE` | `0/223` | yes | no | none | not checked out |
| `security/secret-exposure-containment-20260726` | `70169bf54947` | `/home/edwardspc/Desktop/Dev/listify-secret-exposure-containment` | `origin/security/secret-exposure-containment-20260726` | `0/0` | yes | yes | #402 merged | checked out |
| `wip/ui-launch-incubation` | `efb7d2a2b28c` | `/home/edwardspc/Desktop/Dev/listify-ui-launch-incubation` | `NONE` | `1/22` | no | no | none | checked out |

### Remote-only named branches

306 named remote-tracking branch names have no local counterpart at audit time. They are inventory facts, not retirement recommendations.

<details>
<summary>Remote-only names</summary>

`agent-os/phase1-batch-a`, `audit/explore-engine-2026-03-19`, `chore/admin-route-registry`, `chore/google-tag-analytics`, `codex/brochure-layout-polish`, `codex/distribution-startup-resilience`, `codex/migration-reconciliation-audit`, `codex/nav-seo-architecture`, `codex/next-task`, `codex/referrer-demo-seeding`, `codex/referrer-overview-cta-flow`, `codex/repo-stabilization`, `codex/restore-optimized-homepage-live`, `codex/seo-server-head-injection`, `copilot/add-new-feature-to-app`, `copilot/fix-dashboard-login-404`, `docs/agent-guardrails`, `docs/guardrails-enforcement`, `feat/advertise-landing-redesign`, `feat/agent-dashboard-guidance-soften`, `feat/agent-pricing-page-refresh`, `feat/auth-onboarding-audit`, `feat/blend-development-results-into-search`, `feat/canonical-property-routing-cleanup-pr`, `feat/card-ui-tweaks`, `feat/consumer-dashboard-mvp`, `feat/consumer-dashboard-valuation-intelligence`, `feat/database-consolidated-sql-baseline-s2b`, `feat/development-detail-conversion-funnel`, `feat/development-detail-unit-card-followup`, `feat/development-floorplan-conversion`, `feat/development-inventory-read-model`, `feat/development-search-filters-and-badges`, `feat/development-unit-type-pages`, `feat/developments-progress-page`, `feat/distribution-access-layer`, `feat/distribution-access-layer-clean`, `feat/distribution-brand-onboarding-presets`, `feat/distribution-document-flows`, `feat/distribution-engine-ui`, `feat/distribution-referrer-onboarding-pristine`, `feat/dn-apply-modal`, `feat/dn-apply-modal-inline`, `feat/dn-apply-modal-inline-new`, `feat/dn-apply-modal-inline-pr`, `feat/dn-smart-matcher-v2`, `feat/home-hero-title-center-pr`, `feat/home-mobile-hero-cleanup-pr278`, `feat/integrate-superadmin-dashboard`, `feat/lead-routing-audit-reporting`, `feat/lead-routing-conversion-reporting`, `feat/lead-routing-correction-workbench`, `feat/listing-wizard-security-location`, `feat/mobile-home-followup-pr`, `feat/mobile-home-nav-hero-pr`, `feat/mobile-property-detail-integration-pr`, `feat/optimize-distribution-funnel`, `feat/partner-brochure-client-format`, `feat/partner-brochure-client-format-v2`, `feat/partner-developments-brochure-modal`, `feat/partner-submit-referral-workflow`, `feat/pr209-thread-scope`, `feat/pr211-desktop-mobile-separation`, `feat/pr212-desktop-pr209-restore`, `feat/pr213-remove-agent-redundant-badges`, `feat/pr214-property-detail-brand-system`, `feat/price-insights-investigation`, `feat/property-detail-agent-cta-followup`, `feat/property-detail-agent-data-pass`, `feat/property-detail-agent-fallback`, `feat/property-detail-agent-overview-layout`, `feat/property-detail-qualification-cta-main`, `feat/property-detail-redesign-pass2`, `feat/referral-dashboard-color-polish-v3`, `feat/referral-dashboard-deal-engine-v4`, `feat/referral-dashboard-mirror-v2`, `feat/referral-dashboard-momentum`, `feat/referral-distribution-onboarding-ux`, `feat/referral-journey-continuity-v2`, `feat/referral-open-stock-for-all`, `feat/referral-stock-pricing-and-developments-workspace`, `feat/referrer-world-class-flow`, `feat/saved-search-admin-retry-actions`, `feat/saved-search-batch-digest-formatting`, `feat/saved-search-delivery-diagnostics`, `feat/saved-search-delivery-export`, `feat/saved-search-delivery-history`, `feat/saved-search-delivery-preferences`, `feat/saved-search-delivery-retry`, `feat/saved-search-email-delivery`, `feat/saved-search-notification-engine`, `feat/saved-search-notification-history`, `feat/saved-search-scheduled-delivery`, `feat/saved-search-scheduler-admin-monitoring`, `feat/saved-search-scheduler-manual-trigger`, `feat/saved-search-unsubscribe-and-pause`, `feat/saved-search-user-alert-history`, `feat/search-card-content-followup`, `feat/search-card-contract-main`, `feat/search-card-followups-main`, `feat/search-intent-aware-ranking`, `feat/search-ranking-and-blend-policy`, `feat/search-results-card-ratio-tune`, `feat/search-results-card-width-followup`, `feat/search-results-cards-incremental`, `feat/search-results-feed-refinement`, `feat/search-results-live-tweaks`, `feat/search-results-mobile-desktop-tweaks`, `feat/search-results-mobile-desktop-tweaks-main`, `feat/search-results-padding-followup-220`, `feat/search-source-merchandising`, `feat/search-unit-results`, `feat/seo-location-home-campaigns`, `feat/service-listify-public-and-pro-ui-pr`, `feat/service-provider-partner-auth`, `feat/services-marketplace-overhaul`, `feat/source-aware-saved-searches`, `feat/source-aware-search-counts`, `feat/source-aware-search-empty-states`, `feat/source-aware-search-pagination`, `feat/unit-projection-discovery`, `feat/unit-projection-discovery-refresh`, `feat/unit-ui-followup`, `feat_distribution_doc_workflow_v1`, `feature/advertise-funnel-system`, `feature/agent-dashboard-modernize`, `feature/agent-dashboard-shell`, `feature/agent-dashboard-v2`, `feature/demand-foundation-release`, `feature/developer-listing-engine-isolated`, `feature/distribution-network-v1`, `feature/referral-network-distribution-ux`, `feature/referral-network-distribution-ux-v2`, `feature/registration-role-first`, `feature/rental-developments`, `feature/services-engine-release`, `feature/services-frontend-release`, `feature/services-pro-release`, `feature/spl-publication-eligibility-contract`, `feature/super-admin-dashboard`, `feature/ui-refresh-phase1`, `fix/account-menu-ux-main`, `fix/admin-developerspage-map`, `fix/agent-analytics-and-profile`, `fix/agent-analytics-truth`, `fix/agent-calendar-listings-alignment`, `fix/agent-dashboard-iterable`, `fix/agent-dashboard-refinement-pass`, `fix/agent-flow-next`, `fix/agent-flow-seamless-followup`, `fix/agent-leads-truth-pass`, `fix/agent-marketing-hub-cleanup`, `fix/agent-onboarding-profile-and-upload`, `fix/agent-plan-entitlements`, `fix/agent-registration-cors`, `fix/agent-setup-flow`, `fix/agent-showings-prod-safe`, `fix/agent-ux-gap-audit`, `fix/agent-workspace-integrity`, `fix/auth-email-recovery`, `fix/authme-405-2`, `fix/dashboard-login-404`, `fix/development-conversion-ui-polish`, `fix/development-lead-migration-hotfix`, `fix/development-unit-card-polish`, `fix/development-unit-lead-context`, `fix/development-wizard-persistence`, `fix/distribution-admin-audit-integrity`, `fix/distribution-admin-override-justification`, `fix/distribution-brand-onboarding-template`, `fix/distribution-dev-doc-upload-flow`, `fix/distribution-document-labels`, `fix/distribution-label-input-visibility`, `fix/distribution-legacy-access-compat`, `fix/distribution-live-diagnostics`, `fix/distribution-live-onboarding`, `fix/distribution-manager-invite-fetch-v2`, `fix/distribution-manager-invite-no-expiry`, `fix/distribution-onboarding-readiness-refresh`, `fix/distribution-partner-access-reconcile`, `fix/distribution-partner-onboarding`, `fix/distribution-partner-onboarding-v2`, `fix/distribution-partner-overview-restore`, `fix/distribution-program-docs`, `fix/distribution-readiness-followup`, `fix/distribution-schema-guardrails`, `fix/distribution-terminal-immutability`, `fix/distribution-visibility-boundaries`, `fix/distribution-workflow-boundaries`, `fix/explore-phase1-unify`, `fix/explore-vercel-build-guard`, `fix/hero-alignment-9497434455475105536`, `fix/hero-mobile-linebreak`, `fix/hero-spacing-alignment`, `fix/home-hero-alignment`, `fix/home-listing-card-followup`, `fix/home-listing-cards-and-rent-feed`, `fix/homepage-main-spacing-pr-clean`, `fix/homepage-section-spacing`, `fix/homepage-spacing-tighten-half`, `fix/listing-media-mirror-sync-after-221`, `fix/manager-invite-onboarding-flow`, `fix/manual-vs-development-property-detail`, `fix/manual-vs-development-search-cards`, `fix/partner-developments-show-disabled`, `fix/pr233-hooks`, `fix/railway-mysql-ssl-compat-main`, `fix/referral-dashboard-stock-fallback-main`, `fix/referral-nav-style-explore`, `fix/referrer-activation-complete-2`, `fix/referrer-apply-login-button`, `fix/referrer-email-activation-login-v2`, `fix/referrer-email-activation-login-v3`, `fix/referrer-login-button`, `fix/referrer-onboarding-email`, `fix/referrer-onboarding-redirect`, `fix/referrer-required-contact-type`, `fix/schema-agency-membership-baseline`, `fix/search-agent-identity-fallback`, `fix/search-navbar-empty-results`, `fix/services-marketplace-followup`, `fix/sitemap-live-routing`, `fix/sitemap-public-domain`, `fix/staging-kpi-scheduler-guard`, `fix/superadmin-routing`, `fix/superadmin-routing-regression`, `fix/superadmin-vercel-routing`, `fix/testinfra-distribution-bootstrap`, `fix/unitTypeRefactor-dbmode`, `fix/verification-link`, `fix/verify-email-production`, `hardening/phase-4-5-repo-stabilization`, `hardening/phase-4-transactions`, `hardening/phase-5-dashboards-truth`, `hardening/prod-tidb-reset-script`, `hardening/staging-seed-auth-unblock`, `hardening/tests-unblock-distribution`, `hotfix/auth-branding-domain-guard`, `hotfix/auth-login-db-schema-compat`, `hotfix/auth-me-stable-columns`, `hotfix/auth-session-logs`, `hotfix/auth-users-trial-columns`, `hotfix/distribution-network-enabled-default`, `hotfix/distribution-prod-migration-enforcement`, `hotfix/explore-api-fallback-prod`, `hotfix/live-listing-image-fix`, `hotfix/login-ux-role-redirect`, `hotfix/prod-hardening-deploy`, `hotfix/prod-startup-without-auto-migrations`, `hotfix/referral-migration-guard`, `hotfix/revert-pr48-api-restore`, `hotfix/settingspage-referenceerror-main`, `hotfix/stale-admin-overview-recovery`, `hotfix/tidb-alter-compat`, `hotfix/wizard-validation-test-contract`, `integrate/all-changes`, `investigate/distribution-baseline-proof`, `investigate/distribution-payout-audit`, `investigate/distribution-payout-semantics-audit`, `investigate/search-live-alberton`, `investigate/super-admin-dashboard`, `phase2/discovery-shorts-unify`, `phase3/discovery-client-cleanup`, `phase4/discovery-readiness`, `phase5/discovery-ops-readiness`, `post-baseline-work`, `pr/referral-distribution-onboarding-ux`, `recovery/safety-2026-07-03/codex_discovery-listing-optimization-plan`, `recovery/safety-2026-07-03/codex_homepage-clarity-trust`, `recovery/safety-2026-07-03/codex_lead-routing-engine`, `recovery/safety-2026-07-03/codex_navigation-cleanup-phase-1`, `recovery/safety-2026-07-03/codex_navigation-cleanup-phase-2`, `recovery/safety-2026-07-03/codex_navigation-post-merge-verification`, `recovery/safety-2026-07-03/codex_search-discovery-suggest-api-foundation`, `recovery/safety-2026-07-03/feat_listing-wizard-structured-property-features`, `recovery/safety-2026-07-03/feature_ile-phase3-canonical-contracts`, `recovery/safety-2026-07-03/feature_ile-phase3c-draft-backend`, `recovery/safety-2026-07-03/feature_ile-phase3c-draft-contract`, `recovery/safety-2026-07-03/feature_ile-phase3d-draft-ui`, `recovery/safety-2026-07-03/feature_intelligent-listing-engine-v2-baseline`, `recovery/safety-2026-07-03/feature_listing-wizard-overhaul`, `recovery/safety-2026-07-03/feature_services-engine-phase0`, `recovery/safety-2026-07-03/recovery_dle-wizard-verification-2026-06-02`, `recovery/safety-2026-07-03/recovery_lead-routing-verification-2026-06-02`, `recovery/safety-2026-07-03/recovery_mixed-dle-home-legacy-20260619`, `recovery/safety-2026-07-03/recovery_property-listing-engine-continuation-2026-07-02`, `recovery/safety-2026-07-03/recovery_uncommitted-engine-work-2026-06-02`, `refactor/listing-source-model`, `refactor/saved-search-contract-alignment`, `refactor/schema-modular-phase1`, `release/ship-20260225`, `revert/pr-208-mobile-regression`, `revert/search-results-feed-refinement`, `review/home-mobile-followup`, `review/home-mobile-polish`, `stabilize/ci-db-clean-pr`, `stabilize/test-flakes-clean`, `stabilize/test-flakes-video-faq`, `stabilize/tests-integrate`, `staging-runtime-bootstrap-fix`, `sync/phase4-transactions-clean`, `sync/referral-route-nav-parity`, `sync/ui-parity-local-reference`, `sync/ui-parity-trending-referral`, `test/saved-search-origin-isolation-followup`, `wt-referrer-set-password-onboarding`

</details>

## 5. Detached verification inventory

| Path | HEAD | Interpretation | Boundary |
| --- | --- | --- | --- |
| `/home/edwardspc/Desktop/Dev/listify-services-engine-clean` | `0be8202680d96ff5f1ea748ac27f9b4a7e9de669` | Detached baseline/verification purpose suggested by path only; not independently proven. | Detached state does not authorize retirement; preserve until evidence and owner are confirmed. |
| `/home/edwardspc/Desktop/Dev/listify-single-property-engine` | `0be8202680d96ff5f1ea748ac27f9b4a7e9de669` | Detached baseline/verification purpose suggested by path only; not independently proven. | Detached state does not authorize retirement; preserve until evidence and owner are confirmed. |
| `/home/edwardspc/Desktop/Dev/property-listify-gme-b2-final-verification` | `1a27213310e635c39dc9924f5b0d0fd269d7cb22` | Named GME-B2 post-merge verification path. | Detached state does not authorize retirement; preserve until evidence and owner are confirmed. |

The detached `listify-services-engine-clean` path is dirty and is therefore classified DIRTY_OR_UNSAFE.

## 6. Dirty and unsafe worktrees

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| 13 worktrees are unsafe for retirement consideration. | Per-path porcelain status counts without opening file contents. | Query each registered path independently. | `/home/edwardspc/Desktop/Dev/real_estate_portal_clone` (tracked 0, untracked 2, ahead/behind 0/0); `/home/edwardspc/Desktop/Dev/listify-developer-listing-engine` (tracked 13, untracked 0, ahead/behind 0/254); `/home/edwardspc/Desktop/Dev/listify-development-delivery-updates-recovery` (tracked 5, untracked 3, ahead/behind 0/141); `/home/edwardspc/Desktop/Dev/listify-development-home-v1` (tracked 0, untracked 1, ahead/behind 0/0); `/home/edwardspc/Desktop/Dev/listify-dle-reconstruction` (tracked 10, untracked 19, ahead/behind 0/271); `/home/edwardspc/Desktop/Dev/listify-doe-s2-audit` (tracked 0, untracked 1, ahead/behind 0/149); `/home/edwardspc/Desktop/Dev/listify-explore-authority` (tracked 2, untracked 5, ahead/behind 0/159); `/home/edwardspc/Desktop/Dev/listify-launch-agency-founding-access` (tracked 9, untracked 4, ahead/behind 0/47); `/home/edwardspc/Desktop/Dev/listify-listing-wizard-overhaul` (tracked 2, untracked 6, ahead/behind 6/336); `/home/edwardspc/Desktop/Dev/listify-plds-f1-canonical-frontend-foundation` (tracked 10, untracked 7, ahead/behind 0/0); `/home/edwardspc/Desktop/Dev/listify-services-engine-clean` (tracked 0, untracked 1, ahead/behind NA); `/home/edwardspc/Desktop/Dev/listify-services-engine-phase0` (tracked 4, untracked 3, ahead/behind NA); `/home/edwardspc/Desktop/Dev/property-listify-saved-search-ci-repair` (tracked 0, untracked 3, ahead/behind 0/0). | No ownership or file-content inference was made. |
| No active Git operation marker was found. | Check per-worktree rebase/merge/cherry-pick/revert/bisect state. | Read administrative markers after status inspection. | 0 active operations across 48 worktrees. | Absence at this timestamp does not establish owner availability. |
| Stash dependency is unresolved at worktree level. | Read-only `git stash list` query. | Compare linked-worktree results and treat the shared namespace conservatively. | 3 repository-level stash entries observed; no individual worktree dependency was safely attributable. | Stash entries are preserved and block candidacy. |

## 7. Missing, locked, prunable and duplicate entries

| Finding | Result | Boundary |
| --- | --- | --- |
| Missing registered paths | 0; all 48 directories exist. | No repair/prune. |
| Locked entries | 0 `locked` markers. | No unlock. |
| Prunable entries | 0 `prunable` markers. | `git worktree prune` not run. |
| Duplicate registered paths | 0. | Registry only inspected. |
| Duplicate branch ownership | 0 branch refs checked out more than once. | Detached duplicate HEADs are not branch duplication. |
| Duplicate detached HEAD | `0be8202680d96ff5f1ea748ac27f9b4a7e9de669` appears in two detached paths. | Same SHA does not prove same purpose. |
| Common administrative area | Linked registry is associated with `real_estate_portal_clone/.git`. | No metadata repair. |

## 8. Unregistered directories

Bounded scan scope: similarly named directories directly under `/home/edwardspc/Desktop/Dev`; no unrelated recursive scan.

| Count | Directories | Classification | Evidence |
| ---: | --- | --- | --- |
| 11 | `listify-brochure-layout-polish`, `listify-development-engine-pr1`, `listify-distribution-docs-v2`, `listify-distribution-startup-resilience`, `listify-explore-engine-hardening`, `listify-lead-routing-engine`, `listify-nav-seo`, `listify-next-task`, `listify-referrer-dashboard-engagement`, `listify-referrer-demo-seeding`, `listify-repo-hygiene` | STALE_REGISTRY_OR_MISSING_PATH / likely stale worktree directory | Each has a `.git` file pointing to a missing Windows path under `C:/Dev/real_estate_portal_clone/.git/worktrees/`; Git cannot resolve a root. |
| 6 | `listify-doe-s0-post-merge-verify`, `listify-migration-audit`, `listify-stabilization`, `property-listify-audits`, `property-listify-recovery-2026-07-02`, `property-listify-recovery-backups` | UNKNOWN / uncertain | No `.git` metadata; repository status cannot be established. |

No unregistered directory was registered, repaired, moved, deleted, or modified.

## 9. Potential retirement candidates

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| No item qualifies as a potential retirement candidate. | Apply all observable safety conditions: clean, no untracked data, no active operation, no unresolved owner/PR/evidence/stash dependency, and understood branch relationships. | Evaluate clean merged, detached, unknown, dirty and stale groups separately. | 0 items pass all conditions. Clean merged items remain MERGED_BUT_PRESERVATION_PENDING; ambiguous items remain UNKNOWN_OWNERSHIP. | **Candidate only — not authorized for retirement by this audit.** |
| Worktree, local branch and remote branch decisions remain separate. | Branch/worktree/remote mapping. | Preserve each object until a future authorization names exact targets. | 91 local branches have matching remote refs; 306 remote-only refs have no local branch. | No branch deletion or remote operation is authorized. |

## 10. Preserve list

Preserve all registered worktrees and all local/remote branches by default, including:

- control authority `/home/edwardspc/Desktop/Dev/property-listify-main`, `main`, `1a27213310e635c39dc9924f5b0d0fd269d7cb22`;
- audit worktree `/home/edwardspc/Desktop/Dev/listify-worktree-lifecycle-reconciliation-audit`;
- all 13 DIRTY_OR_UNSAFE worktrees;
- all 7 UNKNOWN_OWNERSHIP worktrees;
- all 24 MERGED_BUT_PRESERVATION_PENDING worktrees;
- all detached verification paths;
- all unregistered directories in §8 until separately classified and authorized.

## 11. Proposed controlled-retirement batches

Planning groups only; none executed.

| Batch | Proposed scope | Stop conditions |
| --- | --- | --- |
| A | Detached verification worktrees after evidence-retention confirmation. | Stop on unique evidence, owner, dirty, or untracked uncertainty. |
| B | Clean merged documentation/audit worktrees after owner review. | Stop on PR, branch, remote, stash, or evidence ambiguity. |
| C | Clean merged implementation worktrees after explicit founder approval. | Stop on active owner or retained branch requirement. |
| D | Exact stale registry entries only after administrative target proof. | Stop on path/registry disagreement; never substitute prune. |
| E | Remote branches as separate named decisions. | Stop on open PR, unknown owner, audit/evidence role, or history dependency. |
| F | Dirty/ambiguous/unregistered items. | Stop unconditionally pending owner review and separate authorization. |

## 12. Final recommendation

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| The audit is complete; retirement planning may proceed only after founder review and separate authorization. | Full read-only registry, filesystem, status, topology and PR reconciliation. | Preserve all uncertain items; obtain founder decisions; authorize exact batches separately. | 48 worktrees classified; 126 local branches; 397 named remote refs; 0 candidates; 17 unregistered directories classified. | Controlled Worktree Retirement is not authorized. Stage 2B remains blocked. |

**Final verdict:** Worktree Lifecycle Reconciliation Audit completed; retirement planning may proceed only after founder review and separate authorization.
