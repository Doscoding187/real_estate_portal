# Property Listify Launch Readiness and Product Convergence

| Field | Current authority |
| --- | --- |
| Programme status | **Stage 1 — launch-readiness governance authority complete. Stage 2A — local environment-authority audit and review closure complete. Evidence Contract Review Closure is complete through PR #423. GME-A — GitHub Merge Gate Current-State Audit and Target Contract is the active governance slice. Environment linkage has not been repaired, and the complete local-environment authority contract is not yet established.** |
| Purpose | Establish one durable place for launch decisions, manual findings, and the evidence needed before implementation or release progression. |
| Current authorised stage | GME-A — GitHub Merge Gate Current-State Audit and Target Contract only. It does not authorise GitHub-rule, branch-protection, merge-method, permission, workflow, environment, runtime, deployment, database, media, frontend, backend, feature, worktree-inventory, or retirement changes. GME-B enforcement remains unauthorised; Worktree Lifecycle Reconciliation Audit, Controlled Worktree Retirement, and Stage 2B remain blocked. |

## Authority roles

- **Edward** is the founder, product owner, manual acceptance tester, and final product-approval authority.
- **ChatGPT** holds architecture, scope, review, and implementation-authorization authority.
- **Codex** is responsible for bounded implementation, repository inspection, validation, and technical evidence.

## Current boundary

Broad feature and engine implementation is paused while launch convergence is established. Security, data-integrity, and severe operational-risk work remain subject to separately approved bounded slices.

No canonical integrated local preview or launch candidate exists yet. A future candidate will be short-lived, acceptance-specific, and tied to an exact commit and Git tree identity; it is not a permanent `release/launch-candidate` branch. Stages 2B and 3–6 remain unauthorised.

## Documents in this authority slice

1. [Launch convergence charter](00-launch-convergence-charter.md)
2. [Source-of-truth and release authority](01-source-of-truth-and-release-authority.md)
3. [Manual audit and triage method](02-manual-audit-and-triage-method.md)
4. [Central launch register](03-launch-register.md)
5. [Engine backlog authority](04-engine-backlog-authority.md)
6. [Local preview environment-authority audit](05-local-preview-environment-authority-audit.md)
7. [Evidence Sequence and Provenance Contract](06-evidence-sequence-and-provenance-contract.md)
8. [Authority evidence record templates](07-authority-evidence-record-templates.md)
9. [GME-A — GitHub Merge Gate Current-State Audit and Target Contract](08-github-merge-gate-enforcement-audit.md)

## Ordered programme stages

1. **Stage 1 — governance authority:** establish this documentation authority and its central register.
2. **Stage 2 — local environment authority:** repair and prove the approved local-environment model without creating a canonical candidate.
3. **Stage 3 — integrated local-preview authority:** establish a repeatable full-stack local-preview procedure and its exact-SHA evidence.
4. **Stage 4 — deployment and migration authority:** reconcile production startup, migration, deployment, and rollback controls.
5. **Stage 5 — media authority:** establish an explicit separation between local/development and production media storage.
6. **Stage 6 — acceptance candidate and promotion:** create a short-lived candidate, conduct integrated acceptance, and promote the exact approved SHA through the controlled production sequence.

## Governed sequence beyond Stage 2A

1. **Evidence Contract Review Closure:** complete through PR #423 and its post-merge verification.
2. **GitHub Merge Gate Enforcement:** GME-A is the current read-only audit and target-contract slice; GME-B may enforce settings only after GME-A is merged and post-merge verified, separate approval, and completed probe preparation.
3. **Worktree Lifecycle Reconciliation Audit:** may begin only after the Evidence Contract Review Closure is merged and post-merge verified, GME-B is completed and verified, and Edward separately approves its bounded read-only scope.
4. **Controlled Worktree Retirement:** a separately approved mutating procedure for named, preserved worktrees only.
5. **Stage 2B:** a separately approved complete local-environment authority contract and non-mutating diagnostics slice.

No slice above may repair worktree links, create a canonical launch candidate, alter deployment authority, or broaden into feature work unless its own approval expressly authorises that action.
