# Property Listify Launch Readiness and Product Convergence

| Field | Current authority |
| --- | --- |
| Programme status | **GME-B2 is complete. The Worktree Lifecycle Reconciliation Audit is complete as a read-only evidence stage. Controlled Worktree Retirement and Stage 2B remain separately blocked and unauthorized.** |
| Purpose | Establish one durable place for launch decisions, manual findings, and the evidence needed before implementation or release progression. |
| Current authorised stage | **Post-GME-B2 worktree reconciliation.** Control `main` equals `origin/main` at `1a27213310e635c39dc9924f5b0d0fd269d7cb22`. Retirement has not begun; Stage 2B has not begun. |

## Authority roles

- **Edward** is the founder, product owner, manual acceptance tester, and final product-approval authority.
- **ChatGPT** holds architecture, scope, review, and implementation-authorization authority.
- **Codex** is responsible for bounded implementation, repository inspection, validation, and technical evidence.

## Current boundary

No existing worktree or branch may be deleted, pruned, moved, repaired, reset, rebased, cleaned, switched, detached, unlocked, or modified without separately authorized retirement operations. No canonical integrated local preview or launch candidate exists. Stage 2B remains blocked.

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
10. [GME-B1 — Disabled GitHub Merge Gate staging and readback](09-github-merge-gate-enforcement-execution.md)
11. [GME-B2 — Active GitHub Merge Gate enforcement](10-github-merge-gate-active-enforcement.md)
12. [GME-B2 — Controlled merge gate probe verification](11-github-merge-gate-probe-verification.md)
13. [Worktree Lifecycle Reconciliation Audit](12-worktree-lifecycle-reconciliation-audit.md)

## Governed sequence beyond GME-B2

1. **Evidence Contract Review Closure:** complete through PR #423.
2. **GitHub Merge Gate Enforcement:** GME-A, GME-B1 and GME-B2 are complete; ruleset `19965838` is Active and effective for `main`.
3. **Worktree Lifecycle Reconciliation Audit:** complete as document 12; strictly read-only against existing worktrees and branches.
4. **Controlled Worktree Retirement:** separately authorized founder-approved operation; not begun.
5. **Stage 2B:** separately authorized broader implementation/integration stage; remains blocked.

No stage above may broaden into feature work or alter deployment authority without its own approval.
