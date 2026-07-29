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

### Claim record: authentication and repository permission

| Field | Record |
| --- | --- |
| Claim | At inspection, the authenticated account was `Doscoding187` and its repository permission was `admin` for public `Doscoding187/real_estate_portal`. |
| Mechanism | GitHub CLI authentication state and read-only repository/collaborator metadata APIs. |
| Sequence | The authenticated session was identified first; repository metadata and the viewer's collaborator permission were then read without changing token scope or repository state. |
| Evidence | `gh auth status` and read-only repository/collaborator-permission API responses, 2026-07-29. |
| Boundary | Authentication and current permission do not prove that a particular future mutation will be permitted after a ruleset is active. |

### Claim record: readable and blocked GitHub authority surfaces

| Field | Record |
| --- | --- |
| Claim | The session could read the listed repository, PR, workflow, check, protection, ruleset, and deploy-key evidence surfaces; webhook and App-installation enumeration remained unresolved by this session. |
| Mechanism | Read-only `gh` REST/GraphQL requests and repository/workflow inspection; no authentication scope was changed. |
| Sequence | Each endpoint was requested read-only. Successful responses were recorded as observed; the webhook endpoint returned a missing `admin:repo_hook` scope requirement and the installation endpoint returned `401` requiring a GitHub App JWT. |
| Evidence | Read-only API responses recorded during GME-A, including successful metadata/ruleset/protection/PR/workflow/check/deploy-key reads and the two access errors. |
| Boundary | A `403`, `404`, or `401` identifies the observed access limitation only; it does not prove the hidden resource is absent or that no integration exists. |

### Claim record: deploy-key and integration/bypass evidence

| Field | Record |
| --- | --- |
| Claim | No repository deploy key was returned at inspection; GitHub Actions and Vercel integrations were observed, but their branch-bypass authority is unknown. |
| Mechanism | Read-only deploy-key API plus observed check and Git-sourced deployment metadata. |
| Sequence | The deploy-key endpoint was read; recent check/deployment records were then inspected; no key, App, or integration was created or tested for write access. |
| Evidence | Deploy-key API returned `[]`; GitHub Actions app `15368` check records; Vercel Git-sourced preview/production records. |
| Boundary | Repository deploy-key absence does not prove account credentials, GitHub Apps, webhooks, or platform integrations lack repository-write or bypass capability. |

The results below are governed by the three complete records above; each row is an observed result or access limitation, not an independent unstated authority claim.

| Concern | Result | Evidence | Boundary |
| --- | --- | --- | --- |
| Authenticated account | **Verified:** `Doscoding187`. | `gh auth status`, 2026-07-29. | Token scopes do not prove every GitHub App or webhook capability. |
| Repository and permission | **Verified:** public `Doscoding187/real_estate_portal`; viewer permission is `admin`. | Repository and collaborator-permission APIs. | It does not prove a particular mutation is currently permitted by a future ruleset. |
| Readable authority surfaces | **Verified:** repository metadata, classic protection response, rulesets, effective rules, PRs, threads, workflow source, Actions jobs/logs, deploy keys, and check-run apps. | Read-only GitHub APIs and repository inspection. | Readability is not authority to modify settings. |
| Webhooks | **Blocked:** hook-list API requires `admin:repo_hook`; no token scope was changed. | API returned the required missing scope. | This does not prove hooks are absent. |
| GitHub App installation enumeration | **Unknown:** repository-installation endpoint requires GitHub App JWT and returned `401`. | API response. | It does not prove no App integration exists; Actions and Vercel evidence demonstrate integrations. |
| Deploy keys | **Verified:** no repository deploy keys returned. | Deploy-key API returned `[]`. | It does not prove account-level credentials cannot access the repository. |

## 3. Current repository merge configuration

### Claim record: repository merge configuration

| Field | Record |
| --- | --- |
| Claim | At inspection, repository-level merge and related settings had the values shown below, including all three merge methods allowed and auto-merge/update-branch disabled. |
| Mechanism | Read-only repository metadata API and relevant repository configuration fields. |
| Sequence | Repository metadata was read once during GME-A; the returned configuration fields were compared with current workflows and PR observations without changing a setting. |
| Evidence | Read-only repository API response recorded on 2026-07-29; code-scanning endpoint response and workflow source for the security-analysis row. |
| Boundary | These are present-state repository settings. They do not prove historical settings, branch-level enforcement, API/UI capability on every plan, or a future ruleset result. |

The following rows are governed by that complete configuration record.

| Setting | Current state | Evidence | Boundary |
| --- | --- | --- | --- |
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

### Claim record: current classic branch-protection state

| Field | Record |
| --- | --- |
| Claim | At inspection, no classic branch protection applied to `main`. |
| Mechanism | GitHub REST branch-protection endpoints and branch metadata. |
| Sequence | The authenticated owner requested classic protection for `main`, then relevant classic-protection subresources and branch metadata, all read-only. |
| Evidence | `GET /branches/main/protection` returned `404 Branch not protected`; related required-status/review/restriction endpoints also returned that condition; branch metadata reported `protected: false`. |
| Boundary | This proves the observed current state only. It does not reconstruct protection at an earlier merge timestamp or test a direct update, force push, deletion, or administrator bypass. |

Consequently, no classic requirements were observed for reviews, conversations, status checks, administrator inclusion, push restrictions, force-push blocking, deletion blocking, signatures, linear history, merge queue, required deployments, or branch locking.

### Repository rulesets

### Claim record: current repository-ruleset and effective-rule state

| Field | Record |
| --- | --- |
| Claim | At inspection, no repository ruleset or effective rule applied to `main`. |
| Mechanism | GitHub repository-ruleset listing and effective-branch-rule APIs. |
| Sequence | The authenticated owner listed repository rulesets including parents, then requested the rules effective on `main`, without creating, enabling, disabling, or changing a ruleset. |
| Evidence | `GET /rulesets?includes_parents=true` returned `[]`; the effective-rules endpoint for `main` returned `[]`. |
| Boundary | Empty current responses do not independently prove whether a historical rule was absent, disabled, changed later, inherited differently, or bypassed at a past merge. |

There were no active, disabled, evaluate-only, inherited, or bypass-actor entries to aggregate at inspection time.

### Effective conclusion

No classic protection and no ruleset are currently layered on `main`. GitHub displays reviews and checks, but no current technical rule requires resolution, current checks, a pull request, or a particular merge method. This present-state result supports the need for technical enforcement; it does not prove the complete historical configuration or the precise merge-button presentation observed by every actor.

## 5. Bypass and administrator model

### Claim record: bypass and administrator authority

| Field | Record |
| --- | --- |
| Claim | Current evidence supports only an **Inferred** absence of branch-rule blocking for the repository owner; it does not directly prove any actor's destructive or bypass capability. |
| Mechanism | Current repository permission, classic-protection/ruleset/effective-rule inspection, deploy-key inspection, and observed integration metadata. |
| Sequence | The owner permission and protection surfaces were read first; deploy-key and integration evidence were then inspected; no direct push, force push, branch deletion, merge, or bypass test was attempted. |
| Evidence | Admin permission; current `main` protection and ruleset claim records; deploy-key API response; GitHub Actions and Vercel check/deployment records. |
| Boundary | Current empty rule evidence is not a destructive-operation test, historical-bypass proof, or proof of App/account/webhook write authority. |

The actor results below are governed by that complete record.

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
| Claim | PR #422 merged despite two unresolved actionable conversations; no effective merge gate prevented that merge for the merging actor at that time. |
| Mechanism | PR merge result, unresolved review-thread state, actor permission, and whatever branch/ruleset enforcement or bypass state applied at merge time. |
| Sequence | Automated `COMMENTED` review and two P2 threads were created at 07:26 UTC; CI completed; PR #422 merged at 07:33 UTC with one source commit; the corrective replies and thread resolutions occurred later through PR #423 closure. |
| Evidence | PR #422 head, merge timestamp and merge result; thread timestamps and unresolved state at merge; PR #423 corrective history; current branch-protection and ruleset inspection. |
| Boundary | The merge proves that no effective gate stopped that actor at that time. Current empty protection proves present state only and does not by itself prove whether historical protection was absent, disabled, changed later, or bypassed. P2 is reviewer severity, not a native blocking review state. |

| PR | Observed result | Governance implication |
| --- | --- | --- |
| #419 | Merged with one source commit while three actionable threads remained unresolved. | A green CI rollup and mergeability cannot replace resolved current-head review evidence. |
| #420 | Merged with unchanged one-commit head before authorised corrections existed. | A discussed correction must be a commit in the current GitHub patch. |
| #421 | A second commit corrected evidence precision; accepted-head and merged trees were verified equal. | A changed head requires fresh review and source-pair checks. |
| #422 | Merged with two unresolved P2 threads and no second corrective commit. | Technical enforcement, not documentation alone, is required. |
| #423 | Corrective two-commit PR passed against a synthetic merge source pair; post-merge tree equality and thread closure were verified. | This is the operating example for current source-pair and final-content verification. |

`COMMENTED` reviews and P2 labels do not count as a `REQUEST_CHANGES` review. No required approving-review rule exists. Draft, pending/failed checks, review requests, auto-merge, and merge-button availability were displayed by GitHub but not enforced by any current `main` rule.

## 7. CI and required-check inventory

### Claim record: current required-check candidate inventory

| Field | Record |
| --- | --- |
| Claim | The four named `CI Pipeline` jobs are the only current baseline candidates safe to evaluate as required checks; no workflow display-name or path-filtered/external context is recommended initially. |
| Mechanism | Workflow YAML triggers and default checkout configuration, recent PR check rollups/logs, and check-run app identity. |
| Sequence | GME-A read each candidate workflow source, then inspected recent PR rollups and the observed PR #423 synthetic checkout logs before comparing path-filter and source-identity behaviour. |
| Evidence | `.github/workflows/ci.yml`, `.github/workflows/frontend-build.yml`, PR #419–#423 rollups, PR #423 run `30434404278` checkout logs, and GitHub Actions app `15368` records. |
| Boundary | These are observed names and recent executions, not applied required contexts. Exact selectors, expected-App pinning, skipped/cancelled semantics, and universal availability remain GME-B readback/probe work. |

The inventory rows below are governed by that complete record.

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

Strict required status checks block an out-of-date pull request after `main` advances. Existing `pull_request` workflows do not necessarily rerun merely because the base branch advances. Fresh checks are expected only after the PR branch is updated with current `main`, unless a separately verified workflow trigger causes execution. That update creates a new PR head and new synthetic head/base identity, invalidating all prior synthetic-merge evidence. The trade-off is additional CI time, especially Unit & Integration Tests; it is preferable to merging an untested head/base combination.

## 9. Solo-founder review constraint

### Claim record: solo-founder review feasibility

| Field | Record |
| --- | --- |
| Claim | Current evidence supports resolved-conversation and current-check controls, but does not evidence an independent qualifying human reviewer for a required-approval rule. |
| Mechanism | Direct collaborator/permission inspection, current review records, and GitHub review-rule semantics. |
| Sequence | GME-A identified the current direct collaborator/admin, then inspected recent `COMMENTED` automated reviews and compared them with GitHub approval-rule requirements. |
| Evidence | Collaborator API returned `Doscoding187` as direct admin; PR #419–#424 review metadata; GitHub review/ruleset documentation. |
| Boundary | This does not prove no future reviewer can be added or that every GitHub plan handles approval actors identically. It supports the stated initial target only. |

The feasibility rows below are governed by that complete record.

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

### Claim record: proposed `main` merge-gate target

| Field | Record |
| --- | --- |
| Claim | The candidate GME-B target is one disabled, exact-`main` repository branch ruleset that supplies merge-gate controls without changing repository-wide merge capabilities initially. |
| Mechanism | A future GitHub repository ruleset pull-request rule, required-status-check rule, and ref-protection rules; existing repository merge settings remain unchanged in initial GME-B. |
| Sequence | GME-B must capture before-state, verify check selectors, create the candidate in Disabled state, read it back completely, prepare rollback/probes, then activate only the verified named ruleset. |
| Evidence | GME-A current-state APIs, workflow source/check evidence, GitHub ruleset documentation, and the Evidence Contract requirements. |
| Boundary | This is a proposed contract, not applied configuration or verified API syntax. Exact schema fields, plan capability, expected-App selectors, and effective behaviour remain pending GME-B readback and probe evidence. |

The proposed mechanism is **one repository branch ruleset**, not a new classic protection rule, to avoid accidental rule layering. The candidate begins Disabled; Active enforcement may not precede complete payload readback and rollback preparation.

### Candidate ruleset specification — proposed, not applied

| Area | Candidate value | Evidence status / boundary |
| --- | --- | --- |
| Name | `property-listify-main-merge-gate` | Proposed identity. |
| Target | Branch; exact `main` ref or a verified default-branch selector. | Exact condition field is **Pending GME-B readback**. |
| Exclusions | None. | Must be confirmed in disabled payload readback. |
| Initial enforcement | Disabled. | Active rules take effect immediately; Disabled staging is the baseline. |
| Baseline bypass actors | None. | Any hidden/default bypass is a failed readback condition. |
| Pull-request approvals | `required_approving_review_count: 0`; `dismiss_stale_reviews_on_push: false`; `require_code_owner_review: false`; `require_last_push_approval: false`. | Proposed fields; exact API/UI syntax **Pending GME-B readback**. |
| Conversation resolution | `required_review_thread_resolution: true`. | Proposed field; exact API/UI syntax **Pending GME-B readback**. |
| Allowed merge methods | `allowed_merge_methods: ["merge"]`. | Proposed inside the `main` pull-request rule; exact selector **Pending GME-B readback**. |
| Required contexts | `DB Contract Verification`, `Lint & TypeCheck`, `Unit & Integration Tests`, `Build Application`. | Context names are observed; all must be selected and read back exactly in GME-B. |
| Expected check source | GitHub Actions App `15368`. | Pin only after current selector/API readback proves source support for every context. |
| Strict/current policy | Enabled; old evidence invalid after either source identity changes; after base advancement, fresh execution follows an authorised branch update unless another trigger is separately proven. | Exact API field is **Pending GME-B readback**. |
| Ref protections | Block deletion and non-fast-forward updates; do not enable linear history. | Exact fields are **Pending GME-B readback**; linear history would conflict with merge commits. |

Repository-level merge settings remain initially unchanged: merge commits, squash merges, and rebase merges stay allowed. The `main` pull-request rule alone must allow only merge commits for PRs targeting `main`; other branches retain current repository-level options. Linear history remains disabled so merge-commit parent/tree verification remains possible.

| Rule | Current state | Proposed state | Evidence / benefit | Risk and prerequisite | Decision |
| --- | --- | --- | --- | --- | --- |
| Pull request required | Absent | Require PR before updating `main`; approval count `0`; require all conversations resolved. | Blocks routine direct updates and unresolved-thread merges. | Must confirm ruleset supports zero approvals plus conversation resolution. | **Recommend now** |
| Required checks | Absent | Strict/up-to-date checks: DB Contract Verification, Lint & TypeCheck, Unit & Integration Tests, Build Application. | Unfiltered workflow and observed stable names. | Pin GitHub Actions `15368`; verify a docs-only probe emits all four. | **Recommend now** |
| Current source pair | Absent | Strict status policy; each changed head/base pair requires fresh synthetic-merge evidence. | Matches the evidence contract. | After base advancement, the PR branch must be updated before fresh checks are expected; this adds CI time. | **Recommend now** |
| Merge method | All three allowed repository-wide | `main` pull-request rule allows `merge` only; repository settings remain unchanged initially. | Preserves parent/tree verification while limiting scope to `main`. | Verify `allowed_merge_methods` selector/API field and merge UI in GME-B. | **Recommend after GME-B readback** |
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
2. Verify the four exact GitHub Actions contexts and expected source identity `15368`; confirm that a documentation-only baseline probe emits all four.
3. Create only `property-listify-main-merge-gate` in **Disabled** state, targeting only `main`, using the candidate contract and no bypass actor. Do not change repository-wide merge settings.
4. Read back its ruleset ID, name, target, conditions, enforcement, bypass actors, every rule, and every parameter.
5. Stop unless readback proves: only `main` is targeted; no exclusion or hidden bypass exists; approval count is zero; conversation resolution is required; `merge` is the only method allowed for `main`; all four check contexts/sources are exact; strict policy is enabled; deletion and non-fast-forward protections exist; and linear history is absent.
6. Prepare a disposable probe branch and PR, rollback payload or exact UI/API reversal, and before-state evidence.
7. Activate the already verified named ruleset, then immediately read back Active and effective rules.
8. Execute only the separately authorised probes. If observed behaviour differs from this contract, disable only the named ruleset, capture the failed observation and restored state, and stop.

If Evaluate mode is available, GME-B may consider it only after capability proof. Disabled staging remains the baseline and Active enforcement takes effect immediately, so it may not precede payload readback and rollback preparation.

### Controlled probe strategy — design only

Use a disposable baseline documentation-only probe branch and PR. Never push directly to `main`.

| Probe | Safe method | Expected evidence |
| --- | --- | --- |
| Unresolved conversation | Add a normal inline discussion to the probe; inspect merge state before and after resolution. | Unresolved conversation blocks; resolved conversation removes that blocker. |
| Pending check | Inspect while the unfiltered CI pipeline is running. | Merge is unavailable until all four required jobs complete. |
| Failed-check subprobe | Only with explicit GME-B authority, add a narrowly scoped probe-only failing test or equivalent temporary source file; never merge that failing commit; revert it in a follow-up commit. | The named failed required job blocks eligibility; the follow-up creates fresh synthetic-merge evidence, restores all successful checks, and leaves no intentional failure in the final probe diff. |
| Head change | Add a harmless follow-up documentation commit after checks pass. | New PR head and synthetic merge SHA require fresh checks. |
| Base change | Keep probe open after initial checks; advance `main` only through a separately authorised harmless PR; record the probe as behind/blocked; merge fresh `origin/main` into the probe branch with an ordinary merge commit and push it. | Record old head/base/synthetic SHA, then new probe head/base/synthetic SHA and fresh checks. Strict policy makes old source-pair evidence stale; base advancement alone does not promise an automatic workflow rerun. |
| Merge method | Inspect available merge controls for a passing probe. | Only merge-commit promotion is offered. |
| Force/deletion | Read effective rules and ruleset evidence only. | No destructive command is attempted. |

### Failure and rollback model

| Failure | Immediate response | Rollback authority and evidence | Restoration |
| --- | --- | --- | --- |
| Every PR unmergeable | Stop normal merges; identify missing/incorrect rule or context. | Edward may alter/disable only the named ruleset after recording failing PR, source pair, effective rules, and before-state. | Correct rule; re-run probe; reactivate only after verification. |
| Required check never appears | Do not add workaround status. | Edward may remove that exact required context after evidence of path/trigger mismatch. | Replace only with a proven unfiltered context. |
| Vercel outage | Keep Vercel supplemental; do not make it a baseline requirement. | No rollback needed unless later required. | Restore after separate availability evidence. |
| Synthetic checks stale | Update the open PR branch with fresh `origin/main` using an authorised ordinary merge commit; wait for new source-pair checks. | No rule rollback: stale evidence is expected behaviour. | Record old and new head/base/ref/SHA. |
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
