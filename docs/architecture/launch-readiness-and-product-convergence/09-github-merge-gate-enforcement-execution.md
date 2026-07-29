# GME-B1 — Disabled GitHub Merge Gate Staging and Readback

Operational staging succeeded: the approved Disabled ruleset was created and read back successfully, and remains non-enforcing. Governance closure remains pending PR #425 review, merge, tree-equivalence proof, post-merge verification and control synchronization.

## Purpose and scope

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| GME-B1 created one Disabled `main` ruleset and did not activate enforcement. | GitHub repository-ruleset REST API. | Read baseline; validate payload; create Disabled ruleset; read back; document rollback. | Ruleset `19965838`, API response at 2026-07-29, enforcement `disabled`. | Does not authorize activation, probes, repository-setting changes, or merge. |

GME-A was completed through PR #424 (`e1d9f156124b37f4e526a00ed4b0ba30fac7d080`). This slice implements only the approved Disabled staging mutation. Worktree reconciliation, retirement and Stage 2B remain blocked.

## Starting repository authority

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| `main` was unprotected before staging. | Read-only repository, branch, protection, ruleset and effective-rule API calls. | Fetch; inspect metadata; inspect classic protection; inspect rulesets; inspect effective rules. | Classic protection returned 404 (Branch not protected); branch `protected: false`; rulesets `[]`; effective rules `[]`. | This is point-in-time evidence, not historical causation. |
| Repository merge settings were preserved. | Repository metadata API. | Read before mutation and after readback. | `allow_merge_commit=true`, `allow_squash_merge=true`, `allow_rebase_merge=true`, `allow_auto_merge=false`, `allow_update_branch=false`, `delete_branch_on_merge=false`. | No repository-wide merge setting was changed. |
| The authenticated actor could read and create repository rules. | `gh auth status` and successful metadata/ruleset API calls. | Authenticate; read; submit one authorized POST. | Account `Doscoding187`; repository permission admin; create response HTTP 201. | No token, email, or credential value is recorded. |

## Required-check identity records

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| Four CI contexts are emitted by GitHub Actions and safe for this candidate. | `.github/workflows/ci.yml` and check-run API metadata. | PR event triggers unfiltered CI jobs; each checks out the synthetic merge ref; conclusions are recorded. | PR #424 run `30440926945`, attempt 1: `DB Contract Verification`, `Lint & TypeCheck`, `Unit & Integration Tests`, `Build Application`; each App ID `15368`, success. | A future required-check decision still depends on current source-pair freshness. |
| The tested identity was synthetic, not raw head. | `actions/checkout@v4` log. | Workflow fetches `refs/pull/424/merge` and checks out SHA `fe70dbc55830d193ec4bb0cea3d2044d90612b88`. | Checkout log for run `30440926945`; PR head `9b675d…`, base `32f20c7…`. | A head or base change invalidates this source-pair evidence. |
| CI runs on documentation-only PRs. | Workflow trigger and recent PR run history. | `pull_request` trigger has no path filter in `ci.yml`; PR #424 documentation-only change emitted all four jobs. | Workflow source plus run `30440926945`. | `frontend-build.yml` is path-filtered and is not included in this candidate. |

## Candidate ruleset payload (approved, not active)

The following is the sanitized candidate submitted to GitHub. GitHub-generated metadata is intentionally omitted.

```json
{
  "name": "property-listify-main-merge-gate",
  "target": "branch",
  "enforcement": "disabled",
  "bypass_actors": [],
  "conditions": {"ref_name": {"include": ["refs/heads/main"], "exclude": []}},
  "rules": [
    {"type": "deletion"},
    {"type": "non_fast_forward"},
    {"type": "pull_request", "parameters": {
      "allowed_merge_methods": ["merge"],
      "dismiss_stale_reviews_on_push": false,
      "require_code_owner_review": false,
      "require_last_push_approval": false,
      "required_approving_review_count": 0,
      "required_review_thread_resolution": true
    }},
    {"type": "required_status_checks", "parameters": {
      "do_not_enforce_on_create": false,
      "required_status_checks": [
        {"context": "DB Contract Verification", "integration_id": 15368},
        {"context": "Lint & TypeCheck", "integration_id": 15368},
        {"context": "Unit & Integration Tests", "integration_id": 15368},
        {"context": "Build Application", "integration_id": 15368}
      ],
      "strict_required_status_checks_policy": true
    }}
  ]
}
```

The payload passed JSON shape validation and was accepted by the current GitHub REST schema. No illustrative field was silently omitted.

## Creation and readback

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| Exactly one ruleset was created Disabled. | `POST /repos/Doscoding187/real_estate_portal/rulesets`, API version `2022-11-28`. | Final empty-state read; one POST; response readback. | HTTP 201; ID `19965838`; name `property-listify-main-merge-gate`; target `branch`; enforcement `disabled`; source type `Repository`. | No activation occurred. |
| Candidate and readback are structurally equal. | GET ruleset by ID and normalized comparison. | Read ID `19965838`; compare conditions, bypass actors and every rule/parameter. | Include `refs/heads/main`; exclude `[]`; bypass `[]`; four exact contexts/App ID 15368; merge-only; zero approvals; conversation resolution true; strict true; deletion/non-fast-forward present. | GitHub-added IDs, timestamps, links and `required_reviewers: []` are metadata/defaults. |
| Disabled ruleset has no active effect. | Effective-rules and classic-protection APIs. | Read active rules and branch protection after creation. | Effective active rules `[]`; classic protection still 404; branch `protected: false`. | This does not prove activation behavior; activation is GME-B2. |

## Rollback preparation (not executed)

Edward is the sole rollback authority. The prepared operations are:

```text
Disable: PATCH /repos/Doscoding187/real_estate_portal/rulesets/19965838
         body {"enforcement":"disabled"}
Delete:  DELETE /repos/Doscoding187/real_estate_portal/rulesets/19965838
Verify:  GET .../rulesets/19965838
         GET .../rulesets?includes_parents=true
         GET .../rules/branches/main
         GET .../branches/main/protection
         GET .../repos/Doscoding187/real_estate_portal
```

Rollback evidence must record the named ruleset ID, response status, normalized ruleset state, effective active rules, classic protection response and unchanged repository merge settings. No rollback was executed because readback matched.

## GME-B2 prerequisites and boundaries

Activation requires separate authorization, a fresh before-state, exact ruleset readback, prepared rollback, and approved probes. GME-B1 does not create a probe branch, activate enforcement, change merge methods, require Vercel, modify workflows, or alter permissions. No environment, database, runtime, deployment, application or worktree state changed. Vercel/Railway authority is outside this slice.

## Current programme position

GME-A is complete. GME-B1 operational staging and readback succeeded, but GME-B1 governance closure remains pending PR #425 review, merge, tree-equivalence proof, post-merge verification and control synchronization. GME-B2 activation and probe verification remains unauthorized until that closure is complete and separately accepted by Edward. The Worktree Lifecycle Reconciliation Audit, Controlled Worktree Retirement and Stage 2B remain blocked. No canonical integrated preview or launch candidate exists.
