# GME-A — GitHub Merge Gate Current-State Audit and Target Contract

| Field | Authority |
| --- | --- |
| Status | **GME-A read-only audit and target-contract proposal. Not implemented. GME-B is separately authorised work only after review of this document.** |
| Purpose | Determine the effective protection of `main`, define a safe enforcement target, and design a reversible probe before any GitHub setting changes. |
| Does not authorise | Ruleset, branch-protection, merge-method, collaborator, workflow, deployment, worktree-lifecycle, environment, database, or runtime changes. |

## 1. Scope and evidence method

This audit applies the [Evidence Sequence and Provenance Contract](06-evidence-sequence-and-provenance-contract.md) to GitHub merge authority. It distinguishes GitHub configuration, repository metadata, workflow source, execution logs, review-thread state, and platform deployment evidence.

The initiating problem is not that review comments existed; it is that PRs #419, #420, and #422 could merge while actionable evidence remained unresolved. Review severity, a GitHub review state, an unresolved conversation, and an enforced branch rule are separate mechanisms.

### Governing programme order

1. Evidence Contract Review Closure — complete.
2. GitHub Merge Gate Enforcement — GME-A is current; GME-B remains unauthorised.
3. Worktree Lifecycle Reconciliation Audit — blocked pending completed and verified GME-B plus separate Edward approval.
4. Controlled Worktree Retirement — blocked pending the reconciliation audit and separate mutating authority.
5. Stage 2B — unauthorised.

### Claim record: current `main` protection

| Field | Record |
| --- | --- |
| Claim | At inspection, `main` has no active classic branch protection or repository ruleset enforcement. |
| Mechanism | GitHub REST branch-protection, repository-ruleset, and effective-branch-rules APIs. |
| Sequence | The authenticated repository owner read classic protection for `main`, all repository rulesets, then rules effective on `main`. |
| Evidence | Classic protection returned `404 Branch not protected`; `GET /rulesets` returned `[]`; effective rules for `main` returned `[]`; branch metadata reported `protected: false`. |
| Boundary | This is a point-in-time configuration result. It does not prove a direct push, force push, deletion, or bypass was attempted. |

## 2. Access and evidence capability

| Concern | Result | Evidence | Boundary |
| --- | --- | --- |
| Authenticated account | **Verified:** `Doscoding187`. | `gh auth status`, 2026-07-29. | Token scopes do not prove every GitHub App or webhook capability. |
| Repository and permission | **Verified:** public `Doscoding187/real_estate_portal`; viewer permission is `admin`. | Repository and collaborator-permission APIs. | It does not prove a particular mutation is currently permitted by a future ruleset. |
| Readable authority surfaces | **Verified:** repository metadata, classic protection response, rulesets, effective rules, PRs, threads, workflow source, Actions jobs/logs, deploy keys, and check-run apps. | Read-only GitHub APIs and repository inspection. | Readability is not authority to modify settings. |
| Webhooks | **Blocked:** hook-list API requires `admin:repo_hook`; no token scope was changed. | API returned the required missing scope. | This does not prove hooks are absent. |
| GitHub App installation enumeration | **Unknown:** repository-installation endpoint requires GitHub App JWT and returned `401`. | API response. | It does not prove no App integration exists; Actions and Vercel evidence demonstrate integrations. |
| Deploy keys | **Verified:** no repository deploy keys returned. | Deploy-key API returned `[]`. | It does not prove account-level credentials cannot access the repository. |

## 3. Current repository merge configuration

| Setting | Current state | Evidence | Boundary |
| --- | --- | --- |
| Default branch | **Verified:** `main`. | Repository API. | No branch rule is implied. |
| Visibility / state | **Verified:** public; not archived or disabled. | Repository API. | Public visibility does not prove rule availability beyond the current plan. |
| Merge commits | **Verified:** allowed. | `allow_merge_commit: true`. | No branch rule currently requires this method. |
| Squash / rebase merges | **Verified:** both allowed. | `allow_squash_merge: true`, `allow_rebase_merge: true`. | This conflicts with the programme preference for merge-commit-only promotion. |
| Auto-merge | **Verified:** disabled. | `allow_auto_merge: false`. | It could be changed later by an administrator. |
| Automatic head deletion | **Verified:** disabled. | `delete_branch_on_merge: false`. | This is distinct from protecting `main` from deletion. |
| Update branch | **Verified:** disabled. | `allow_update_branch: false`. | It does not establish strict required-check freshness. |
| Merge queue | **Unknown:** no configured queue evidence surfaced in repository metadata or current PR checks. | Repository API and recent PR observations. | A dedicated GME-B readback is still required before assuming availability. |
| Web commit signoff | **Verified:** disabled. | Repository API. | This is not commit-signature protection. |
| Relevant security controls | **Verified:** secret scanning and push protection are enabled; no code-scanning analysis was found. | Repository API; code-scanning API returned `404 no analysis found`; no code-scanning workflow exists. | Secret scanning is not a PR merge gate. |

**Linear-history boundary:** a linear-history rule would prohibit merge commits and require squash or rebase promotion. It is incompatible with the programme's preservation-based merge-commit rule and must remain disabled unless that higher authority changes.

## 4. Effective `main` protection and layering

### Classic branch protection

**Verified absent.** `GET /branches/main/protection` returned GitHub's explicit `404 Branch not protected`; branch metadata reports `protected: false`. Consequently there are no classic requirements for reviews, conversations, status checks, administrator inclusion, push restrictions, force-push blocking, deletion blocking, signatures, linear history, merge queue, required deployments, or branch locking.

### Repository rulesets

**Verified absent.** `GET /rulesets?includes_parents=true` returned `[]`; the effective-rules endpoint for `main` also returned `[]`. There are no active, disabled, evaluate-only, inherited, or bypass-actor entries to aggregate at inspection time.

### Effective conclusion

No classic protection and no ruleset are layered on `main`. GitHub displays reviews and checks, but does not technically require resolution, current checks, a pull request, or a particular merge method. This explains the initiating failures; it does not prove the precise merge-button presentation observed by every actor.

## 5. Bypass and administrator model

| Actor | Mechanism | Can bypass current `main` protections | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| Edward / `Doscoding187` | Repository owner and admin | **Inferred: direct update, force push, deletion, and merge are not blocked by branch rules because none exist.** | Admin permission; unprotected branch; empty rulesets. | No destructive operation was tested. |
| Classic-protection administrator bypass | Classic setting | **Not applicable:** no classic rule exists. | Explicit `Branch not protected`. | It does not predict a future classic-rule setting. |
| Ruleset bypass actors | Ruleset bypass list | **Not applicable:** no ruleset exists. | Empty ruleset and effective-rule responses. | Future bypass policy must be explicitly configured. |
| Deploy keys | Git SSH key | **Verified absent at repository scope.** | Deploy-key API returned `[]`. | Account credentials and GitHub Apps are separate access paths. |
| GitHub Actions | Workflow/check App | **Unknown for branch bypass.** | Checks identify GitHub Actions as app `15368`; no ruleset exists. | Check authorship does not prove branch-write authority. |
| Vercel Git integration | External deployment/status integration | **Unknown for branch bypass.** | Git-sourced preview and production deployments/status contexts. | Deployment evidence does not prove write or bypass authority. |

Target principle: no routine bypass actor. Emergency recovery must be performed by Edward as repository owner through the documented rollback procedure, with before/after evidence. GME-B must verify whether a personal-repository ruleset can express a PR-only owner bypass; it must not silently grant an always-bypass path.

## 6. Pull-request enforcement evidence

### Claim record: why PR #422 could merge

| Field | Record |
| --- | --- |
| Claim | PR #422 merged while two actionable P2 conversations were unresolved because GitHub had no active technical rule requiring conversation resolution or blocking review state. |
| Mechanism | PR #422 review threads; GitHub review state; absent classic protection and rulesets. |
| Sequence | Automated `COMMENTED` review and two P2 threads were created at 07:26 UTC; CI completed; PR #422 merged at 07:33 UTC with one source commit; the corrective replies and thread resolutions occurred later through PR #423 closure. |
| Evidence | PR #422 metadata (`b6b4af…`, one commit, merge `c77766e…`, merge time), thread timestamps, and current accepted contract history; current protection/ruleset API results. |
| Boundary | P2 is reviewer severity, not a native blocking review state. This record does not prove whether GitHub showed a warning or whether any administrator bypass UI was used. |

| PR | Observed result | Governance implication |
| --- | --- | --- |
| #419 | Merged with one source commit while three actionable threads remained unresolved. | A green CI rollup and mergeability cannot replace resolved current-head review evidence. |
| #420 | Merged with unchanged one-commit head before authorised corrections existed. | A discussed correction must be a commit in the current GitHub patch. |
| #421 | A second commit corrected evidence precision; accepted-head and merged trees were verified equal. | A changed head requires fresh review and source-pair checks. |
| #422 | Merged with two unresolved P2 threads and no second corrective commit. | Technical enforcement, not documentation alone, is required. |
| #423 | Corrective two-commit PR passed against a synthetic merge source pair; post-merge tree equality and thread closure were verified. | This is the operating example for current source-pair and final-content verification. |

`COMMENTED` reviews and P2 labels do not count as a `REQUEST_CHANGES` review. No required approving-review rule exists. Draft, pending/failed checks, review requests, auto-merge, and merge-button availability were displayed by GitHub but not enforced by any current `main` rule.

## 7. CI and required-check inventory

| Check/job | Workflow/app | Trigger and filters | Tested identity | Stable name / recent reliability | Safe to require |
| --- | --- | --- | --- | --- | --- |
| DB Contract Verification | `CI Pipeline`; GitHub Actions app `15368` | PR to `main`/`develop`; no path filter. | Synthetic PR merge ref in observed PR #423 run. | Stable job name; passed #419–#423. | **Recommend now**, subject to GME-B source-pinning readback. |
| Lint & TypeCheck | `CI Pipeline`; GitHub Actions `15368` | Same, no path filter. | Synthetic PR merge ref. | Stable job name; passed #419–#423. | **Recommend now**, subject to GME-B source-pinning readback. |
| Unit & Integration Tests | `CI Pipeline`; GitHub Actions `15368` | Same, no path filter. | Synthetic PR merge ref. | Stable; longest recent run was about 8.5 minutes; passed #419–#423. | **Recommend now**; probe pending/failed behaviour first. |
| Build Application | `CI Pipeline`; GitHub Actions `15368` | Same, no path filter. | Synthetic PR merge ref. | Stable job name; passed #419–#423. | **Recommend now**, subject to GME-B source-pinning readback. |
| CI Pipeline aggregation | Workflow display name | Same workflow. | Not a separate check in observed rollups. | No aggregate status context observed. | **Do not require.** |
| Build Frontend | `Frontend Build Guard`; GitHub Actions | PR path-filtered to frontend/build files. | Default checkout when invoked. | Does not run on documentation-only PRs. | **Do not require:** a valid PR could wait forever. |
| Vercel | Vercel status context | Observed on #419–#423. | Hosted preview record, not CI job identity. | Usually present in these examples, but source pinning and outage policy are unverified. | **Defer.** |
| Vercel Preview Comments | Vercel App check | Observed on #419–#423. | Hosted integration output. | Present in examples; no availability or applicability contract. | **Defer.** |
| Code scanning / dependency review | No current merge check | No code-scanning analysis or workflow found. | Not applicable. | Not emitted. | **Do not require.** |

GitHub documents that a required workflow check uses the job name, not the workflow name. The GME-B implementation must select the four job names above and pin expected source to GitHub Actions only if the ruleset UI/API exposes and confirms app `15368` for each context. It must not require a path-filtered, skipped, cancelled, external, or aggregate-only context.

## 8. Synthetic-merge freshness

### Claim record: PR #423 CI source identity

| Field | Record |
| --- | --- |
| Claim | The four observed PR #423 CI jobs tested GitHub's synthetic merge result, not raw head `c7181073…`. |
| Mechanism | `pull_request` event with default `actions/checkout@v4` in `CI Pipeline`. |
| Sequence | GitHub generated `refs/pull/423/merge` from head `c7181073…` and base `c77766e…`; each job checked out that ref at `ff534657…`; jobs completed successfully. |
| Evidence | Run `30434404278`, attempt 1; checkout logs for all four jobs; workflow source; job/check metadata. |
| Boundary | This proves PR #423's source pair only. A head or base change creates a new synthetic identity and invalidates the result; it does not prove all future workflows use this checkout strategy. |

Strict required status checks are recommended because they force a fresh merge result after a base change. This creates predictable re-runs after concurrent `main` merges, including documentation-only PRs. The trade-off is additional CI time, especially Unit & Integration Tests; it is preferable to merging an untested head/base combination.

## 9. Solo-founder review constraint

| Control | Feasibility | Decision | Reason |
| --- | --- | --- | --- |
| Require pull request | Feasible | **Recommend now** | Requires traceable promotion without requiring another human approver. |
| Require resolved conversations | Feasible | **Recommend now** | Prevents the exact #419/#420/#422 failure class. |
| One required approval | Not currently feasible | **Do not recommend** | Edward is the only direct collaborator/admin observed; automated `COMMENTED` reviews are not qualifying human approvals. |
| Approval by someone other than last pusher | Not feasible | **Do not recommend** | No independent authorised reviewer is evidenced. |
| Code-owner review / team approval | Not evidenced | **Defer** | No viable ownership/team approval actor was demonstrated. |
| Dismiss stale approvals | Not applicable now | **Defer** | There is no required-approval rule to dismiss. |
| Request-changes blocking | Conditional | **Recommend after a human-review policy exists** | GitHub may block it only when a qualifying review is configured; P2 comment severity alone is not enough. |
| Administrator bypass disabled | Feasible but high-risk | **Recommend after GME-B rollback probe** | Prevents routine bypass but must not lock Edward out of a safe recovery path. |

Review quality remains required by programme authority, but technical enforcement must not depend on a reviewer who does not exist.

## 10. Proposed target contract for `main`

The proposed mechanism is **one repository branch ruleset**, not a new classic protection rule, to avoid accidental rule layering. Proposed name: `property-listify-main-merge-gate`. Target: the default branch / exact `main` ref, with no exclusion. Enforcement becomes active only in GME-B after recorded before-state and probe readiness.

| Rule | Current state | Proposed state | Evidence / benefit | Risk and prerequisite | Decision |
| --- | --- | --- | --- | --- | --- |
| Pull request required | Absent | Require PR before updating `main`; approval count `0`; require all conversations resolved. | Blocks routine direct updates and unresolved-thread merges. | Must confirm ruleset supports zero approvals plus conversation resolution. | **Recommend now** |
| Required checks | Absent | Strict/up-to-date checks: DB Contract Verification, Lint & TypeCheck, Unit & Integration Tests, Build Application. | Unfiltered workflow and observed stable names. | Pin GitHub Actions `15368`; verify a docs-only probe emits all four. | **Recommend now** |
| Current source pair | Absent | Strict status policy; each head/base change requires fresh synthetic merge checks. | Matches the evidence contract. | Adds CI reruns after concurrent `main` changes. | **Recommend now** |
| Merge method | All three allowed | Require merge commits; retain only merge commits at repository level; disable squash and rebase. | Preserves parent/tree verification model. | Repository-wide setting; validate no other approved workflow depends on squash/rebase. | **Recommend after GME-B readback** |
| Linear history | Absent | Disabled. | Merge commits are required. | None; must not be accidentally enabled. | **Recommend now** |
| Force push | Not blocked | Block non-fast-forward updates. | Prevents history replacement. | Confirm effective rule output after activation. | **Recommend now** |
| Branch deletion | Not blocked | Block deletion of `main`. | Prevents accidental branch loss. | Confirm effective rule output after activation. | **Recommend now** |
| Routine bypass | No rule | No routine bypass actor. | Preserves equal enforcement for owner/admin. | Emergency rollback must be workable. | **Recommend after GME-B rollback preflight** |
| PR-only emergency bypass | No rule | Assess owner PR-only bypass only if supported and auditable. | Can preserve PR trail for exceptional recovery. | May weaken resolved-conversation/check controls; do not enable without decision. | **Unknown pending evidence** |
| Auto-merge | Disabled | Keep disabled. | Avoids merge after a changing source pair without deliberate review. | Reassess only after enforcement is proven. | **Recommend now** |
| Vercel checks | Not required | Not required in initial gate. | Preview is supplemental platform evidence. | External outage / expected source not yet proven. | **Defer** |
| Required deployment | Absent | Do not require production deployment before merge. | Production starts only after `main` merge. | Would be circular. | **Do not recommend** |
| Signed commits | Absent | Do not add in initial gate. | Merge commits are already GitHub-created/verified in observed records. | Could reject valid developer commits; no current requirement. | **Defer** |
| Merge queue | Unknown | Do not enable. | Solo-founder manual acceptance does not require a queue. | Potentially changes source identity and workflow behaviour. | **Do not recommend** |
| Code scanning/dependency review | Not emitted | Do not require. | No configured analysis evidence. | A missing context would deadlock PRs. | **Do not recommend** |

## 11. GME-B controlled implementation and probe plan

### Implementation sequence — do not execute in GME-A

1. Re-read repository settings, classic protection, rulesets, effective `main` rules, merge methods, and check contexts; save sanitized before-state JSON and screenshots/URLs where available.
2. Confirm the four GitHub Actions contexts and app `15368` are selectable as required checks and that a documentation-only probe would emit all four.
3. Confirm exact ruleset API/UI fields against current GitHub documentation; create only `property-listify-main-merge-gate` targeting `main`, initially with the approved controls above and no implicit bypass actor.
4. Change repository merge settings only if separately included in the approved GME-B change set: merge commits enabled; squash/rebase disabled; auto-merge remains disabled.
5. Read back the ruleset, effective branch rules, repository merge settings, and bypass list. Stop if classic protection unexpectedly layers with the target.
6. Run the approved probe plan. Promote the ruleset from proposed to verified only after probe evidence and a clean rollback path are recorded.

### Controlled probe strategy — design only

Use a disposable documentation-only probe branch and PR. Never push directly to `main`.

| Probe | Safe method | Expected evidence |
| --- | --- | --- |
| Unresolved conversation | Add a normal inline discussion to the probe; inspect merge state before and after resolution. | Unresolved conversation blocks; resolved conversation removes that blocker. |
| Pending check | Inspect while the unfiltered CI pipeline is running. | Merge is unavailable until all four required jobs complete. |
| Failed check | In a disposable unmerged probe commit, introduce a narrowly reversible test/build failure; never merge it. | Failed named job blocks merge; reverting/removing the probe failure restores eligibility. |
| Head change | Add a harmless follow-up documentation commit after checks pass. | New PR head and synthetic merge SHA require fresh checks. |
| Base change | Keep probe open while a separately authorised harmless PR advances `main`, or use an authorised update-branch action. | New base produces a new source pair and fresh checks under strict mode. |
| Merge method | Inspect available merge controls for a passing probe. | Only merge-commit promotion is offered. |
| Force/deletion | Read effective rules and ruleset evidence only. | No destructive command is attempted. |

### Failure and rollback model

| Failure | Immediate response | Rollback authority and evidence | Restoration |
| --- | --- | --- | --- |
| Every PR unmergeable | Stop normal merges; identify missing/incorrect rule or context. | Edward may alter/disable only the named ruleset after recording failing PR, source pair, effective rules, and before-state. | Correct rule; re-run probe; reactivate only after verification. |
| Required check never appears | Do not add workaround status. | Edward may remove that exact required context after evidence of path/trigger mismatch. | Replace only with a proven unfiltered context. |
| Vercel outage | Keep Vercel supplemental; do not make it a baseline requirement. | No rollback needed unless later required. | Restore after separate availability evidence. |
| Synthetic checks stale | Update/rebase through approved PR workflow; wait for new source-pair checks. | No rule rollback: stale evidence is expected behaviour. | Record new head/base/ref/SHA. |
| Owner lockout / emergency | Use documented owner-controlled ruleset rollback, never a direct `main` push. | Edward records incident, exact settings, reason, affected SHA, and recovery PR. | Reapply the proven ruleset and post-incident verification. |
| App/API failure or layered conflict | Stop; read effective rules and classic protection before editing further. | Edward may revert the named GME-B setting only with captured API/UI evidence. | Remove conflict, rerun probe, and document the restored effective state. |

## 12. Unresolved decisions and readiness

| Question | Status | Recommended default |
| --- | --- | --- |
| Exact ruleset payload/UI fields and expected-app pinning | **Unknown pending GME-B readback** | Use current GitHub UI/API schema; pin only GitHub Actions `15368` after the selector confirms it. |
| Personal-repository PR-only owner bypass | **Unknown** | No routine bypass actor until capability and audit trail are verified. |
| Merge-queue availability | **Unknown** | Keep disabled / do not enable. |
| Webhook inventory | **Unknown due token scope** | Do not expand token scope in this slice; inspect only if GME-B needs it. |
| Required approvals | **Not feasible with current evidence** | Require zero approvals and resolved conversations; maintain Edward's external product approval record. |

### GME-A readiness decision

**Ready for controlled enforcement design review, not for settings mutation.** The current state is unprotected, the recommended baseline is defined, and GME-B must first verify exact GitHub ruleset controls, source pinning, rollback capability, and probe safety.

## 13. Validation evidence and boundaries

This audit used read-only GitHub APIs, workflow source, Actions execution logs, PR/thread metadata, repository metadata, and the mandatory sanitized database-authority orientation command. The database command proved an approved local target and readable migration ledger at its observed time; it does not prove any GitHub setting, workflow, review, or deployment condition.

No GitHub setting, workflow, repository permission, environment, database schema/data, application source, worktree lifecycle, or deployment was changed by GME-A.
