# Repository Convergence Programme — Classification Decisions

**Status:** Partial review; database, billing, and geography batch complete
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
| `stashes/stash-0` and `stashes/stash-1` | Agency listing-performance queue, seller reviews, and price-revision handoff. | **Superseded** | Current `main` contains `drizzle/schema/listingPerformance.ts`, the Agency router operations, client workspace, integration tests, and the historical `0071`/`0072` migrations under `_archived/pre-canonical-baseline/`. The live model is represented by the canonical baseline rather than the old migration lane. | Never pop either stash. Retain both snapshots; no source merge is needed. |
| `stashes/stash-2` | Temporary main-sync migration-runner and inventory-test work, including untracked old SQL files. | **Superseded / archive-only** | Its SQL belongs to the retired pre-canonical migration lane, now preserved under `server/migrations/_archived/pre-canonical-baseline/`. Current migration authority is manifest-led and was validated by the static gate above. | Keep the stash ref as forensic evidence only. Do not apply its runner or SQL changes. |

## Explicitly retained requirements

The following recovered requirements remain live work rather than abandoned
implementation:

1. A developer can record a delivery fact separately from buyer-facing copy,
   with an explicit, auditable buyer-approval transition.
2. The Explore pilot may require a reviewer-governed authority lifecycle,
   including expiry, revocation, idempotent operations, and immutable events.
3. Geography coverage must evolve through the current deterministic pipeline,
   with one canonical request authority and no silent geographic widening.

The first two require separate current-main PRs. The third is already a
forward-integrated governed workstream; its historical snapshots remain
preserved but are not merge candidates.

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
