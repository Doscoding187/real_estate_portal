# GME-B2 — Active GitHub Merge Gate Enforcement

## Purpose and scope

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| Activation and the rollback drill for ruleset `19965838` succeeded. | GitHub repository-ruleset API using complete PUT payloads. | Disabled baseline; Active PUT; Active readback; Disabled PUT; empty effective rules; Active PUT; Active readback. | Active digest `e46b0d22d7b8617ce2d652930a60e67198cfc040638c99e66a6023ab0d736706`; Disabled digest `7ddc2ceecf5b09afcc510b330cb913bae12638cfef9044530eb6410348ea3209`; both PUT responses HTTP 200. | Probes remain pending; this record does not prove GME-B2 complete. |

GME-B1 and its rollback-contract correction were prerequisites. The exact ruleset is now Active; effective controls are present. The controlled rollback returned the same ruleset to Disabled with empty effective rules, then reactivated the exact payload. `main` remained `1ab5f635…` throughout.

## Activation and rollback sequence

1. Capture fresh repository, ruleset, effective-rule, branch and merge-setting readbacks.
2. Submit the complete accepted payload with only `enforcement: "active"` through `PUT /repos/Doscoding187/real_estate_portal/rulesets/19965838`.
3. Require HTTP 200 and read back exact ruleset and effective active rules.
4. Submit the complete equivalent payload with `enforcement: "disabled"`; require HTTP 200 and empty effective rules.
5. Submit the exact Active payload again and verify active effective rules are restored.

## Observed readbacks

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| Active enforcement is present without changing repository merge settings. | Ruleset GET, effective-rules GET, branch and repository metadata APIs. | Active PUT; immediate readback. | Active enforcement; pull request, required checks, deletion and non-fast-forward effective rules; `main` SHA unchanged; repository merge settings unchanged. | No probe has yet demonstrated merge blocking behavior. |
| Routine rollback and reactivation work with complete payloads. | PUT Disabled then PUT Active. | Disable at 14:28:39+02:00; effective rules `[]`; reactivate at 14:28:40+02:00; effective rules restored. | Both responses HTTP 200, ID `19965838`. | No deletion, force-push or direct-push probe occurred. |

## Boundaries

No direct push, force push, deletion, workflow change, repository-wide merge-setting change or product/runtime change is authorized by this record. Controlled probes remain pending; GME-B2 is incomplete until they and post-merge verification pass.
