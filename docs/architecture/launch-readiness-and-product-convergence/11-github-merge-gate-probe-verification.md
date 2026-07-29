# GME-B2 — Controlled Merge Gate Probe Verification

## Objectives and status

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| Activation and rollback, pending-check blocking, conversation blocking and clearance, intentional failed-check blocking, exact revert, fresh-source recovery, and tree restoration passed. | Active ruleset `19965838`, bounded PR observations, one isolated client test, normal revert, and exact tree comparison. | Activate and drill rollback; observe pending checks; create/resolve one COMMENT thread; commit and revert one failing test; await fresh checks; compare trees. | Records below. | Strict-base isolation is partial/bounded; final PR merge and post-merge verification remain pending. |

GME-B2 enforcement is active and the functional probes completed, but GME-B2 is not governance-complete until PR #428 merges and post-merge verification passes.

## Activation and rollback prerequisite

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| The exact Active payload and its recovery path were verified. | `PUT /repos/Doscoding187/real_estate_portal/rulesets/19965838`, API `2022-11-28`, followed by exact ruleset and effective-rule reads. | Active PUT 200 → Active readback → Disabled PUT 200 → effective rules `[]` → Active PUT 200 → restored Active readback. | Active digest `e46b0d22d7b8617ce2d652930a60e67198cfc040638c99e66a6023ab0d736706`; Disabled digest `7ddc2ceecf5b09afcc510b330cb913bae12638cfef9044530eb6410348ea3209`; `main` remained `1ab5f635…`; repository settings unchanged; detailed record: [document 10](10-github-merge-gate-active-enforcement.md). | Proves activation and rollback only; no malfunction occurred and rollback was not required during probes. |

## Probe evidence

### Pending-check blocking

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| The original pending-check observation is partially recovered; an independently captured merge-state response is still required. | Active strict required-status-check evaluation and GitHub Actions checkout evidence. | PR head `833bd18910693009ae42a96aa8a446c4446d9d6b` opened against base `1ab5f6358a8ece846a9412a68fe019bd030b936f`; run `30452044461` (run 1054), jobs `90576181918`, `90576536534`, `90576536613`, `90577240662`, synthetic ref `refs/remotes/pull/428/merge`, synthetic SHA `694613d29e05ecd5e066361e96866610c3de01ef`, checkout `2026-07-29T12:33:37.6176140Z`, detached HEAD confirmed `2026-07-29T12:33:37.9297136Z`. | Workflow/job and checkout identities are recovered exactly. | The contemporaneous merge-state payload and timestamp were not durably preserved; this historical observation is contextual evidence, not a complete standalone enforcement record. Clean re-observation is pending. |

### Source/base advancement

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| A fresh main source was incorporated through a normal merge and fresh checks ran. | Normal merge of `origin/main` into the probe branch. | PR #427 merge `311e7de05…`, PR #429 merge `13a645b…`; branch merge `de476ec2013ebb5fec0ffdd65b999a46f03cf681`; fresh checks followed. | No rebase, force-push, or direct main push. | Original stale-base blocking was confounded by genuine unresolved threads; independently isolated strict-base blocking is partial/bounded evidence. |

### Controlled unresolved conversation

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| An unresolved conversation blocked merge eligibility and resolution cleared the blocker. | Active pull-request rule requiring resolved conversations. | Baseline head `6dc26934…`, synthetic merge `9b752f531…`; one inline COMMENT was created, observed unresolved, then resolved. | Review `4810709816`; thread `PRRT_kwDOQQWnOM6U1cl1`; comment `3676285542`; line 9; merge state `BLOCKED` then `CLEAN`; all six checks passed. | No merge attempt, no `REQUEST_CHANGES`, no approval requirement, and genuine review threads were not used. |

### Intentional failed required check

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| A failed required check blocked merge eligibility. | Active strict required-check rule on `19965838`. | Failure commit `69c6839b2e61843d70c4dc6a8864b0d3d23035f6` added one isolated client test; CI ran; Unit & Integration Tests failed. | Run `30476107598`, job `90658458432`, step `Run tests`; synthetic merge `6ccf1817e0a60cc50dcf53ba0ecc15c175080410`; assertion expected `GME-B2-EXPECTED-PASS` but received `GME-B2-FAILURE-PROBE`; merge state `BLOCKED`; unresolved count zero. | No merge attempt, no production source change, and only one temporary file caused the failure. |

### Exact revert and fresh-source recovery

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| Reverting the exact failure commit removed the test and required fresh source-pair checks. | `git revert --no-edit 69c6839b2e61843d70c4dc6a8864b0d3d23035f6`. | Revert `886fc948a5d0bbdbad9b06e55258dbdd5106c676` pushed; recovery synthetic merge `e52e6cc89b60e5359bdcf82c683b479b201603fb`; workflow `30477349193` ran. | All six recovery checks passed; temporary file absent; PR returned to `CLEAN`/`MERGEABLE`. | History retains failure and revert; no document or PR-body update occurred in the probe run. |

### Tree restoration

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| The final tracked tree equals the pre-probe tree. | Git tree identity comparison. | Compare pre-probe head `6dc26934…` with recovery head `886fc948…`. | Both trees equal `071b71710c0a2b2b166b68211c7a3d0bbe178841`; temporary test path is absent. | Commit history differs by the intentional failure and exact revert. |

### Merge-only and destructive-protection boundaries

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| Merge-only, deletion, and non-fast-forward controls are active. | Ruleset and effective-rule readback. | Read ruleset `19965838` before and after probes. | Empty bypass actors; zero approvals; resolved conversations; `allowed_merge_methods: ["merge"]`; four checks with App ID `15368`; deletion and non-fast-forward rules. | No destructive deletion, force-push, or direct-push attempt was made. |

## Probe matrix

| Probe | Status |
| --- | --- |
| Activation | Passed |
| Rollback | Passed |
| Pending checks | Historical observation partially recovered; clean, independently isolated re-observation pending |
| Head-change invalidation | Passed |
| Intentional failed check | Passed |
| Exact revert | Passed |
| Fresh-source recovery | Passed |
| Unresolved conversation | Passed |
| Tree restoration | Passed |
| Strict base advance | Partial/bounded; independent stale-base blocking was not isolated |
| Merge-only/readback boundaries | Verified by readback; no destructive attempt |
| Final PR merge | Pending |
| Post-merge verification | Pending |

## Rollback boundary

If active behavior differs from the accepted contract, submit the complete Disabled payload, verify empty effective rules, close probe PRs without merge, and stop. No enforcement malfunction was observed during these probes.
