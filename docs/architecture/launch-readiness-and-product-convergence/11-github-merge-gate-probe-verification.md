# GME-B2 — Controlled Merge Gate Probe Verification

## Objectives

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| Controlled probes will test active rules without risky direct pushes, deletion or force-push attempts. | Bounded documentation PR and one authorized deterministic failing-test subprobe. | Open probe; observe pending checks; add/resolve one comment; add/revert one failing test; update branch after base advance; read back merge-only and destructive protections. | Pending execution. | No probe result is claimed before observation. |

Activation and rollback-drill prerequisite: ruleset `19965838` is Active with effective controls present; the complete Disabled rollback returned effective rules to `[]`, and the exact Active payload restored them. Controlled probes below remain pending.

## Activation and rollback prerequisite evidence

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| The Active ruleset and rollback path are verified prerequisites for these probes. | `PUT /repos/Doscoding187/real_estate_portal/rulesets/19965838` using API version `2022-11-28`, followed by exact ruleset and effective-rule readbacks. | Active PUT → Active readback → Disabled PUT → empty effective rules → Active PUT → restored effective rules. | Active digest `e46b0d22d7b8617ce2d652930a60e67198cfc040638c99e66a6023ab0d736706`; Disabled digest `7ddc2ceecf5b09afcc510b330cb913bae12638cfef9044530eb6410348ea3209`; all three PUTs returned HTTP 200; normalized readbacks matched; `main` remained `1ab5f635…`; repository merge settings were unchanged. Detailed record: [document 10](10-github-merge-gate-active-enforcement.md). | This proves activation and rollback only. Conversation, intentional-failure and strict-base probes remain incomplete. |

The initial pending-check observation recorded PR #428 at head `833bd189…` against base `1ab5f635…`: required contexts were pending, GitHub reported the PR blocked, no merge was attempted, and all six ordinary checks later passed. This is pending-check evidence only; it does not prove the remaining probes.

## Pending probe matrix

| Probe | Mechanism | Expected sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| Pending checks | PR merge-state API while required jobs run. | Open PR; observe pending contexts; confirm ineligible; wait for completion. | Pending. | No merge attempt. |
| Head-change invalidation | Push authorized documentation or failure/revert commit. | Prior synthetic result becomes stale; fresh source pair runs. | Pending. | No force push or rewrite. |
| Intentional failed check | One isolated deterministic failing unit test, authorized once. | Commit; Unit & Integration Tests fails; revert exact commit; fresh checks pass. | Pending. | Failure file must not remain. |
| Unresolved conversation | One inline COMMENT thread. | Add thread; observe blocker; resolve exact thread; observe blocker clears. | Pending. | No REQUEST_CHANGES review. |
| Strict base advance | Separate harmless main advancement, then merge fresh main into probe branch. | Old pair stale; branch merge creates new pair; fresh checks required. | Pending. | No rebase or direct main push. |
| Merge-only/readback boundaries | Effective rules API. | Confirm merge-only and deletion/non-fast-forward rules without destructive attempts. | Pending. | Direct push, deletion and force-push are not tested. |

## Rollback boundary

If active behavior differs from the accepted contract, submit the complete Disabled payload, verify empty effective rules, close probe PRs without merge, and stop. GME-B2 remains incomplete until this bounded sequence and post-merge verification are complete.
