# Stage 1 assignment — Local implementation and proof

**Authority:** [Master plan version 1.3, amendment A-01](master-plan.md#amendment-a-01--three-stage-execution-and-consolidated-review).
**Outcome:** A coherent, review-ready local release candidate with WP1/WP2
evidence and WP3 local acceptance, ready for one principal-architect review.

Read the complete master plan before starting. Its technical criteria,
exception rules and packet reports are part of this assignment. The prior
candidate is `feat/database-architecture-takeover` at `b05e6569`; these are
historical pointers, not proof of the present release source or clean ownership.

## Execute continuously within this boundary

1. Inspect `git worktree list`, status and current remote `main`; record exact
   SHAs and ancestry. Use a clean task-owned feature worktree. Preserve the
   existing takeover workstream's uncommitted changes. Do not make the master
   plan's documentation branch the application implementation branch.
2. Establish the reviewed candidate in the task worktree through the existing
   integration procedure. Inspect the takeover changes as a coherent unit;
   do not merge unrelated feature branches or rewrite history. Read repository
   instructions, database entry/playbook, policy and exception register. Restore
   pinned repository dependencies through the normal lockfile workflow; no
   unpinned installers or lockfile refresh solely for setup.
3. Resolve authority status, manifest and target before database work. This
   assignment includes normal authority-owned disposable local/isolated-test
   establishment, canonical migration and fixture verification needed for these
   packets, with their required exact acknowledgements. It excludes quarantined
   `listify_local`, unrelated databases, host security changes and shared/remote
   database operations. Any refusal must be resolved within authority, never
   bypassed. Document unavailable engine environments and continue independent
   work while escalating a genuinely missing prerequisite.
4. Complete WP1: per-migration admission evidence, selected-revision constraint
   inventory, local MySQL 8.0/8.4 compatibility as required, fresh-chain and
   consumer/lifecycle/concurrency proof. Record an engine recommendation for
   principal approval. Do not change migration history or domain semantics.
5. Complete WP2 using the existing control plane: reviewed runner-digest
   binding, physical enforcement verification, exact target admission logic,
   protected-data/smoke route preparation and negative authorization tests.
   Test identities and grants locally; create no real Azure identities or
   production secrets. Preserve every specified denial and failed-attempt rule.
6. Prepare WP3's integrated candidate, fix ordinary in-scope consumer/test
   defects, and prove local application/browser acceptance. Preserve the
   canonical schema and Live/Pilot/Hidden boundaries. Record unresolved product
   dispositions for Edward instead of declaring features Live. Do not deploy,
   push, merge or change external PR state under this assignment alone.
7. Where useful, prepare WP4's import design and synthetic-data tests and WP10
   runbooks. No TiDB connection, business-data extract or source inventory is
   authorized here. Synthetic proof never closes source-data reconciliation.
8. Commit bounded changes and durable sanitized evidence. Continue between
   packets when their internal evidence passes; do not return for routine test
   fixes or individual packet completion. Stop at the consolidated review
   boundary with the final candidate and next-operation packet.

## Verification

Discover exact supported commands in the candidate's `package.json` and policy.
Expected command families include authority status/manifest/context, static
authority checks, inventory checks, fresh consumer contract, congruency,
readiness, authority-wrapped physical/browser tests, typecheck, lint and build.
Use local data-role preparation only on the owned target. Never use a retired
command or invoke a source file to evade a wrapper.

Run the checks required by each change and by the release candidate. Inspect
every result; resolve meaningful failures and rerun affected checks. A migration
failure is not an ordinary test retry: preserve attempt evidence and escalate
its recovery decision. Do not create another target to hide the failed attempt.

Report all tests actually run with their source SHA, target, exit result and
durable artifacts. Hosted CI and merged-SHA proof remain pending until the
normal approved delivery workflow supplies them. Do not waive G3 to complete
this assignment.

## Return early only when a decision is necessary

Escalate migration-history changes, CHECK/FK or lifecycle changes, provider
workarounds, privilege broadening, security-control weakening, conflicting
canonical sources, failed/ambiguous DDL, or a required operation outside this
local assignment. Provide exact evidence and a recommended resolution. Continue
independent authorized tasks if they do not depend on the blocked decision.

## Final report and stopping condition

Produce `stage-1-report.md` beside this assignment (or link an equivalent durable
record) containing:

- Master-plan version, implementation branch/worktree, base/candidate/tree SHAs
  and final Git status.
- WP1/WP2/WP3 checklists marked `EVIDENCE PASS — REVIEW PENDING` or `BLOCKED`,
  with test results and evidence links for every criterion.
- Per-migration dispositions, manifest/model digests, complete constraint
  inventory, engine recommendation and unresolved historical-application facts.
- Authority/credential denial results, local target fingerprints, attempt
  states, database lifecycle events and confirmation of remote-operation scope.
- Live/Pilot/Hidden journey evidence, skipped tests, unresolved business choices,
  unrun hosted CI and missing merged-SHA validation.
- Recovery position, remaining work, and a concrete Stage 2 preparation packet
  identifying approvals, infrastructure budget and source-data access still
  needed. Do not invent future target fingerprints or approval metadata.

Return once Stage 1's in-scope work is complete, or earlier for an exceptional
decision that prevents further useful work. The principal architect reviews
the consolidated evidence before merge/promotion approval and any Azure
mutation. Stage 2 is not authorized by completion of Stage 1.
